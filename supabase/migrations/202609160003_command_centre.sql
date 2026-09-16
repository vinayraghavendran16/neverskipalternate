-- Command Centre: safe owner provisioning and tenant-scoped access directory.

create or replace function public.create_owned_school(
  p_name text,
  p_slug text,
  p_campus_name text,
  p_campus_code text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  school_id uuid;
  campus_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.memberships
    where user_id = auth.uid() and role = 'owner' and status = 'active'
  ) then
    raise exception 'Only an active school owner can create another school';
  end if;
  if char_length(trim(p_name)) not between 2 and 160
    or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_campus_name)) not between 2 and 160
    or char_length(trim(p_campus_code)) not between 2 and 24 then
    raise exception 'Invalid school or campus details';
  end if;

  insert into public.organizations(name, slug)
  values(trim(p_name), p_slug)
  returning id into school_id;
  insert into public.campuses(organization_id, name, code)
  values(school_id, trim(p_campus_name), upper(trim(p_campus_code)))
  returning id into campus_id;
  insert into public.memberships(organization_id, campus_id, user_id, role, status)
  values(school_id, null, auth.uid(), 'owner', 'active');
  insert into public.audit_events(organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values(school_id, auth.uid(), 'organizations.created', 'organizations', school_id::text, jsonb_build_object('initial_campus_id', campus_id));
  return school_id;
end;
$$;

create or replace function public.list_organization_access(p_org uuid)
returns table(membership_id uuid, user_id uuid, full_name text, email text, role public.app_role, status text, campus_id uuid)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.has_org_role(p_org, array['owner','administrator']::public.app_role[]) then
    raise exception 'Access denied';
  end if;
  return query
    select m.id, m.user_id, coalesce(p.full_name, split_part(u.email, '@', 1), 'User'), coalesce(u.email, ''), m.role, m.status, m.campus_id
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at, m.id;
end;
$$;

revoke all on function public.create_owned_school(text,text,text,text), public.list_organization_access(uuid) from public, anon;
grant execute on function public.create_owned_school(text,text,text,text), public.list_organization_access(uuid) to authenticated;

create or replace function private.protect_membership_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_owner boolean;
begin
  if auth.uid() is null then return new; end if;
  actor_is_owner := private.has_org_role(new.organization_id, array['owner']::public.app_role[]);
  if tg_op = 'INSERT' and new.role = 'owner' and not actor_is_owner then
    if new.user_id <> auth.uid() or exists (select 1 from public.memberships where organization_id = new.organization_id) then
      raise exception 'Only an existing owner can grant owner access';
    end if;
  elsif not actor_is_owner and (new.role in ('owner','administrator') or (tg_op = 'UPDATE' and old.role in ('owner','administrator'))) then
    raise exception 'Only an owner can change privileged access';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and (
    new.organization_id is distinct from old.organization_id or new.user_id is distinct from old.user_id
    or new.role is distinct from old.role or new.status is distinct from old.status
  ) then
    raise exception 'Owner access requires a dedicated ownership-transfer workflow';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_membership_roles() from public, anon, authenticated;
create trigger protect_membership_roles before insert or update on public.memberships for each row execute function private.protect_membership_roles();

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'campuses_audit_mutation') then
    create trigger campuses_audit_mutation after insert or update on public.campuses for each row execute function private.audit_mutation();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'memberships_audit_mutation') then
    create trigger memberships_audit_mutation after insert or update on public.memberships for each row execute function private.audit_mutation();
  end if;
end;
$$;
