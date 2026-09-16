-- Northstar School OS: consent-aware notification inbox and delivery ledger.

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','sms')),
  enabled boolean not null,
  consented_at timestamptz,
  consent_source text not null default 'settings' check (consent_source in ('default','settings','administrator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_id,channel),
  check (not enabled or consented_at is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  href text not null default '/dashboard/communication' check (href ~ '^/dashboard(?:/|$)'),
  in_app_enabled boolean not null default true,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (announcement_id,user_id),
  unique (id,organization_id)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','sms')),
  status text not null check (status in ('queued','awaiting_provider','processing','delivered','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  next_attempt_at timestamptz,
  provider_message_id text,
  last_error_code text,
  idempotency_key text not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,idempotency_key),
  unique (notification_id,channel),
  constraint delivery_notification_org_fk foreign key (notification_id,organization_id) references public.notifications(id,organization_id)
);

create index notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null and in_app_enabled;
create index notifications_org_created_idx on public.notifications(organization_id,created_at desc);
create index notification_deliveries_org_status_idx on public.notification_deliveries(organization_id,status,created_at desc);
create index notification_deliveries_retry_idx on public.notification_deliveries(status,next_attempt_at) where status in ('queued','failed');

create trigger notification_preferences_updated_at before update on public.notification_preferences for each row execute function private.set_updated_at();
create trigger notification_deliveries_updated_at before update on public.notification_deliveries for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

revoke all on public.notification_preferences,public.notifications,public.notification_deliveries from anon,authenticated;
grant select,insert on public.notification_preferences to authenticated;
grant update(enabled,consented_at,consent_source) on public.notification_preferences to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select on public.notification_deliveries to authenticated;

create policy notification_preferences_self_read on public.notification_preferences for select to authenticated
using (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()));
create policy notification_preferences_self_insert on public.notification_preferences for insert to authenticated
with check (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()) and consent_source in ('default','settings'));
create policy notification_preferences_self_update on public.notification_preferences for update to authenticated
using (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()))
with check (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()) and consent_source='settings');

create policy notifications_recipient_read on public.notifications for select to authenticated
using (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()));
create policy notifications_recipient_update on public.notifications for update to authenticated
using (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()))
with check (user_id=(select auth.uid()) and organization_id in (select private.user_org_ids()));

create policy notification_deliveries_read on public.notification_deliveries for select to authenticated
using (user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','administrator','principal']::public.app_role[]));

create function public.set_notification_preferences(p_org uuid,p_in_app boolean,p_email boolean,p_sms boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_org not in (select private.user_org_ids()) then raise exception 'Not permitted to manage these preferences'; end if;
  insert into public.notification_preferences(organization_id,user_id,channel,enabled,consented_at,consent_source)
  values
    (p_org,auth.uid(),'in_app',p_in_app,case when p_in_app then now() end,'settings'),
    (p_org,auth.uid(),'email',p_email,case when p_email then now() end,'settings'),
    (p_org,auth.uid(),'sms',p_sms,case when p_sms then now() end,'settings')
  on conflict(organization_id,user_id,channel) do update set
    enabled=excluded.enabled,consented_at=excluded.consented_at,consent_source='settings';
end $$;

revoke all on function public.set_notification_preferences(uuid,boolean,boolean,boolean) from public,anon;
grant execute on function public.set_notification_preferences(uuid,boolean,boolean,boolean) to authenticated;

create function public.create_announcement_with_notifications(
  p_org uuid,
  p_campus uuid,
  p_title text,
  p_body text,
  p_priority text,
  p_audience public.app_role[],
  p_requires_acknowledgement boolean,
  p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_announcement uuid;
begin
  if auth.uid() is null or not private.has_org_role(p_org,array['owner','administrator','principal','staff']::public.app_role[]) then
    raise exception 'Not permitted to publish announcements';
  end if;
  if p_campus is not null and not exists(select 1 from public.campuses where id=p_campus and organization_id=p_org) then
    raise exception 'Campus does not belong to this organization';
  end if;
  if nullif(btrim(p_title),'') is null or char_length(p_title)>180 or nullif(btrim(p_body),'') is null or char_length(p_body)>5000 then
    raise exception 'Invalid announcement content';
  end if;
  if p_priority not in ('normal','important','urgent') or coalesce(cardinality(p_audience),0)=0 then
    raise exception 'Invalid announcement delivery settings';
  end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'Expiry must be in the future'; end if;

  insert into public.announcements(organization_id,campus_id,title,body,audience,priority,status,requires_acknowledgement,published_at,expires_at,created_by)
  values(p_org,p_campus,btrim(p_title),btrim(p_body),p_audience,p_priority,'published',p_requires_acknowledgement,now(),p_expires_at,auth.uid())
  returning id into v_announcement;

  with recipients as (
    select distinct m.user_id
    from public.memberships m
    where m.organization_id=p_org and m.status='active' and m.role=any(p_audience)
      and (p_campus is null or m.campus_id=p_campus)
  ), created as (
    insert into public.notifications(organization_id,user_id,announcement_id,title,body,priority,href,in_app_enabled,expires_at)
    select p_org,r.user_id,v_announcement,btrim(p_title),btrim(p_body),p_priority,'/dashboard/communication',
      coalesce((select np.enabled from public.notification_preferences np where np.organization_id=p_org and np.user_id=r.user_id and np.channel='in_app'),true),
      p_expires_at
    from recipients r
    on conflict(announcement_id,user_id) do nothing
    returning id,user_id,in_app_enabled
  )
  insert into public.notification_deliveries(organization_id,notification_id,user_id,channel,status,attempts,idempotency_key,delivered_at)
  select p_org,c.id,c.user_id,'in_app',case when c.in_app_enabled then 'delivered' else 'cancelled' end,
    case when c.in_app_enabled then 1 else 0 end,v_announcement::text||':'||c.user_id::text||':in_app',case when c.in_app_enabled then now() end
  from created c;

  insert into public.notification_deliveries(organization_id,notification_id,user_id,channel,status,idempotency_key)
  select p_org,n.id,n.user_id,p.channel,'awaiting_provider',v_announcement::text||':'||n.user_id::text||':'||p.channel
  from public.notifications n
  join public.notification_preferences p on p.organization_id=n.organization_id and p.user_id=n.user_id and p.enabled and p.channel in ('email','sms')
  where n.announcement_id=v_announcement
  on conflict(notification_id,channel) do nothing;

  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_org,auth.uid(),'announcement.publish','announcement',v_announcement,jsonb_build_object('priority',p_priority,'audience_count',cardinality(p_audience)));
  return v_announcement;
end $$;

revoke all on function public.create_announcement_with_notifications(uuid,uuid,text,text,text,public.app_role[],boolean,timestamptz) from public,anon;
grant execute on function public.create_announcement_with_notifications(uuid,uuid,text,text,text,public.app_role[],boolean,timestamptz) to authenticated;
