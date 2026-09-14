-- Safe structural seed. Create users through Supabase Auth, then replace
-- <AUTH_USER_UUID> in the final insert before running it manually.

insert into public.organizations (id, name, slug)
values ('10000000-0000-0000-0000-000000000001', 'Northstar Academy', 'northstar-academy')
on conflict (id) do nothing;

insert into public.campuses (id, organization_id, name, code, timezone)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Koramangala Campus',
  'KOR',
  'Asia/Kolkata'
)
on conflict (id) do nothing;

insert into public.academic_years (id, organization_id, name, starts_on, ends_on, status)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '2026–27',
  '2026-06-01',
  '2027-04-30',
  'active'
)
on conflict (id) do nothing;

-- After inviting a user, run:
-- insert into public.memberships (organization_id, campus_id, user_id, role)
-- values (
--   '10000000-0000-0000-0000-000000000001',
--   '20000000-0000-0000-0000-000000000001',
--   '<AUTH_USER_UUID>',
--   'owner'
-- );
