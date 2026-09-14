begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select extensions.has_table('public', 'staff_profiles', 'staff profiles exist');
select extensions.has_table('public', 'guardians', 'guardian directory exists');
select extensions.has_column('public', 'students', 'preferred_name', 'student preferred name exists');
select extensions.has_column('public', 'guardian_relationships', 'guardian_id', 'guardian records can be linked');

select extensions.ok((select relrowsecurity from pg_class where oid = 'public.staff_profiles'::regclass), 'staff profiles have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.guardians'::regclass), 'guardians have RLS');
select extensions.ok(not has_table_privilege('anon', 'public.staff_profiles', 'select'), 'anon cannot read staff');
select extensions.ok(not has_table_privilege('anon', 'public.guardians', 'select'), 'anon cannot read guardians');
select extensions.ok(not has_table_privilege('authenticated', 'public.staff_profiles', 'delete'), 'staff records cannot be hard deleted');
select extensions.ok(not has_table_privilege('authenticated', 'public.guardians', 'delete'), 'guardian records cannot be hard deleted');
select extensions.ok(has_table_privilege('authenticated', 'public.students', 'insert'), 'authorized policies can permit student creation');
select extensions.ok(has_table_privilege('authenticated', 'public.guardians', 'update'), 'authorized policies can permit guardian updates');

select * from extensions.finish();
rollback;
