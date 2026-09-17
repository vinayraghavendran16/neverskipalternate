-- Keep the access-directory return types stable across hosted and local auth schemas.

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
    select
      m.id,
      m.user_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1), 'User')::text,
      coalesce(u.email::text, ''::text),
      m.role,
      m.status::text,
      m.campus_id
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at, m.id;
end;
$$;

revoke all on function public.list_organization_access(uuid) from public, anon;
grant execute on function public.list_organization_access(uuid) to authenticated;
