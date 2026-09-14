begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select extensions.has_table('public', 'organizations', 'organizations exists');
select extensions.has_table('public', 'memberships', 'memberships exists');
select extensions.has_table('public', 'students', 'students exists');
select extensions.has_table('public', 'audit_events', 'audit events exist');

select extensions.ok((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), 'organizations has RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), 'memberships has RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.students'::regclass), 'students has RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit events have RLS');

select extensions.ok(not has_table_privilege('anon', 'public.students', 'select'), 'anon cannot read students');
select extensions.ok(not has_table_privilege('authenticated', 'public.audit_events', 'update'), 'audit events cannot be updated');
select extensions.ok(not has_table_privilege('authenticated', 'public.audit_events', 'delete'), 'audit events cannot be deleted');
select extensions.ok(has_table_privilege('authenticated', 'public.audit_events', 'insert'), 'authenticated users can append audit events');

select * from extensions.finish();
rollback;
