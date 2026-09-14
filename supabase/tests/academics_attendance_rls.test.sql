begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select extensions.has_table('public', 'subjects', 'subjects exist');
select extensions.has_table('public', 'class_subjects', 'class subject allocations exist');
select extensions.has_table('public', 'timetable_entries', 'timetable entries exist');
select extensions.has_table('public', 'attendance_sessions', 'attendance sessions exist');
select extensions.has_table('public', 'attendance_records', 'attendance records exist');
select extensions.has_table('public', 'attendance_corrections', 'attendance corrections exist');

select extensions.ok((select relrowsecurity from pg_class where oid = 'public.subjects'::regclass), 'subjects have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.class_subjects'::regclass), 'class subjects have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.timetable_entries'::regclass), 'timetables have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.attendance_sessions'::regclass), 'attendance sessions have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.attendance_records'::regclass), 'attendance records have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.attendance_corrections'::regclass), 'attendance corrections have RLS');

select extensions.ok(not has_table_privilege('anon', 'public.attendance_records', 'select'), 'anon cannot read attendance');
select extensions.ok(not has_table_privilege('authenticated', 'public.attendance_records', 'delete'), 'attendance records cannot be hard deleted');
select extensions.ok(not has_table_privilege('authenticated', 'public.attendance_sessions', 'delete'), 'attendance sessions cannot be hard deleted');
select extensions.ok(has_function_privilege('authenticated', 'private.can_mark_class(uuid,uuid)', 'execute'), 'authenticated role can evaluate assigned-class access');

select * from extensions.finish();
rollback;
