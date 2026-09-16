create table public.operational_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fingerprint text not null check (char_length(fingerprint) between 12 and 64),
  source text not null default 'application' check (source in ('application','database','integration','job')),
  severity text not null default 'error' check (severity in ('warning','error','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null check (char_length(summary) between 1 and 500),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context)='object' and pg_column_size(context)<=4096),
  occurrence_count integer not null default 1 check (occurrence_count between 1 and 2147483647),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reported_by uuid references auth.users(id) on delete set null,
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,fingerprint),
  check ((status='resolved')=(resolved_at is not null))
);

create index incidents_org_status_seen_idx on public.operational_incidents(organization_id,status,last_seen_at desc);
create trigger incidents_updated_at before update on public.operational_incidents for each row execute function private.set_updated_at();
create trigger audit_mutation after insert or update on public.operational_incidents for each row execute function private.audit_mutation();

alter table public.operational_incidents enable row level security;
grant select,update,delete on public.operational_incidents to authenticated;
create policy incidents_read_admin on public.operational_incidents for select to authenticated using(private.has_org_role(organization_id,array['owner','administrator']::public.app_role[]));
create policy incidents_update_admin on public.operational_incidents for update to authenticated using(private.has_org_role(organization_id,array['owner','administrator']::public.app_role[])) with check(private.has_org_role(organization_id,array['owner','administrator']::public.app_role[]));
create policy incidents_delete_expired on public.operational_incidents for delete to authenticated using(status='resolved' and last_seen_at<now()-interval '90 days' and private.has_org_role(organization_id,array['owner','administrator']::public.app_role[]));
create policy active_membership_required on public.operational_incidents as restrictive for all to authenticated using(organization_id in (select private.user_org_ids())) with check(organization_id in (select private.user_org_ids()));

create function public.report_operational_incident(p_fingerprint text,p_route text) returns uuid language plpgsql security definer set search_path='' as $$
declare target_org uuid; saved_id uuid;
begin
 select m.organization_id into target_org from public.memberships m join public.organizations o on o.id=m.organization_id
 where m.user_id=auth.uid() and m.status='active' and o.status='active' order by m.created_at,m.id limit 1;
 if target_org is null then raise exception 'Active school membership required'; end if;
 if p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$' or p_route is null or char_length(p_route) not between 1 and 200 or p_route!~'^/dashboard' then raise exception 'Invalid incident report'; end if;
 insert into public.operational_incidents(organization_id,fingerprint,title,summary,context,reported_by)
 values(target_org,p_fingerprint,'Unhandled application error','A signed-in user reached the application error boundary.',jsonb_build_object('route',p_route),auth.uid())
 on conflict(organization_id,fingerprint) do update set occurrence_count=public.operational_incidents.occurrence_count+1,last_seen_at=now(),status='open',resolved_by=null,resolved_at=null
 returning id into saved_id;
 return saved_id;
end $$;
revoke all on function public.report_operational_incident(text,text) from public,anon;
grant execute on function public.report_operational_incident(text,text) to authenticated;

comment on table public.operational_incidents is 'Redacted operational failures. Never store raw errors, stack traces, form values or credentials.';
comment on function public.report_operational_incident(text,text) is 'Records a one-way fingerprint and normalized route for the signed-in user organization.';
