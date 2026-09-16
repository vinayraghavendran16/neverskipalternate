-- Identity and access: service-only first-tenant provisioning.

create or replace function public.platform_create_school(
  p_name text,
  p_slug text,
  p_campus_name text,
  p_campus_code text,
  p_owner_user uuid,
  p_actor_user uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  school_id uuid;
  campus_id uuid;
begin
  if p_owner_user is null or not exists (select 1 from auth.users where id = p_owner_user) then
    raise exception 'A valid owner account is required';
  end if;
  if p_actor_user is null or not exists (select 1 from auth.users where id = p_actor_user) then
    raise exception 'A valid platform operator is required';
  end if;
  if char_length(trim(p_name)) not between 2 and 160
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_campus_name)) not between 2 and 160
    or char_length(trim(p_campus_code)) not between 2 and 24 then
    raise exception 'Invalid school or campus details';
  end if;

  -- The service-only RPC carries the actor explicitly. Clear any inherited user
  -- claim so the membership guard treats this as trusted bootstrap provisioning.
  perform set_config('request.jwt.claim.sub', '', true);

  insert into public.organizations(name, slug) values(trim(p_name), p_slug) returning id into school_id;
  insert into public.campuses(organization_id, name, code)
    values(school_id, trim(p_campus_name), upper(trim(p_campus_code))) returning id into campus_id;
  insert into public.memberships(organization_id, campus_id, user_id, role, status)
    values(school_id, null, p_owner_user, 'owner', 'active');
  insert into public.audit_events(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
    values(school_id, p_actor_user, 'organizations.platform_created', 'organizations', school_id::text,
      jsonb_build_object('initial_campus_id', campus_id, 'owner_user_id', p_owner_user));
  return school_id;
end;
$$;

revoke all on function public.platform_create_school(text,text,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.platform_create_school(text,text,text,text,uuid,uuid) to service_role;
