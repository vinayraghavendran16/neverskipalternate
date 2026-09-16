-- Platform portfolio forecasting, one-month pilots and reversible school deletion.

alter table public.organizations
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null,
  add column archive_reason text,
  add column archived_previous_onboarding_stage text
    check (archived_previous_onboarding_stage is null or archived_previous_onboarding_stage in ('invited','profile','data_import','training','live','paused'));

create or replace function private.enforce_one_month_pilot()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.contract_status='trial' then
    new.recurring_amount:=0;
    new.contract_starts_on:=coalesce(new.contract_starts_on,current_date);
    new.contract_ends_on:=(new.contract_starts_on+interval '1 month')::date;
  end if;
  return new;
end $$;

update public.organization_commercials
set recurring_amount=0,
    contract_starts_on=coalesce(contract_starts_on,current_date),
    contract_ends_on=(coalesce(contract_starts_on,current_date)+interval '1 month')::date
where contract_status='trial';

create trigger organization_commercials_pilot_term
before insert or update on public.organization_commercials
for each row execute function private.enforce_one_month_pilot();

-- Archived schools must immediately lose tenant access without destroying their
-- memberships or records. Restoring the school makes the same assignments usable.
create or replace function private.user_org_ids()
returns setof uuid language sql stable security definer set search_path='' as $$
  select m.organization_id
  from public.memberships m
  join public.organizations o on o.id=m.organization_id and o.status='active'
  where m.user_id=(select auth.uid()) and m.status='active'
$$;

create or replace function private.has_org_role(target_org_id uuid,allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.memberships m
    join public.organizations o on o.id=m.organization_id and o.status='active'
    where m.user_id=(select auth.uid()) and m.organization_id=target_org_id
      and m.status='active' and m.role=any(allowed_roles)
  )
$$;

create or replace function public.platform_set_school_archived(
  p_org uuid,p_archived boolean,p_reason text,p_actor_user uuid
) returns boolean language plpgsql security definer set search_path='' as $$
declare current_school public.organizations%rowtype;
begin
  if not exists(select 1 from auth.users where id=p_actor_user) then
    raise exception 'Invalid platform operator';
  end if;
  select * into current_school from public.organizations where id=p_org for update;
  if not found then raise exception 'School not found'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  if p_archived then
    if current_school.status='archived' then return true; end if;
    update public.organizations set
      archived_previous_onboarding_stage=onboarding_stage,
      status='archived',onboarding_stage='paused',archived_at=now(),archived_by=p_actor_user,
      archive_reason=nullif(trim(p_reason),'')
    where id=p_org;
    insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
    values(p_org,p_actor_user,'organizations.platform_archived','organizations',p_org::text,jsonb_build_object('reason',nullif(trim(p_reason),'')));
  else
    if current_school.status<>'archived' then return true; end if;
    update public.organizations set
      status='active',onboarding_stage=coalesce(archived_previous_onboarding_stage,'profile'),
      archived_at=null,archived_by=null,archive_reason=null,archived_previous_onboarding_stage=null
    where id=p_org;
    insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id)
    values(p_org,p_actor_user,'organizations.platform_restored','organizations',p_org::text);
  end if;
  return true;
end $$;

revoke all on function public.platform_set_school_archived(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.platform_set_school_archived(uuid,boolean,text,uuid) to service_role;

comment on function public.platform_set_school_archived(uuid,boolean,text,uuid) is
  'Service-only reversible school deletion. Archived tenants lose application access while audit and financial records remain intact.';
