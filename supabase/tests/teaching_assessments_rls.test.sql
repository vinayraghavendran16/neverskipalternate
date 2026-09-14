begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select extensions.has_table('public', 'lesson_diary_entries', 'lesson diary entries exist');
select extensions.has_table('public', 'homework_assignments', 'homework assignments exist');
select extensions.has_table('public', 'homework_classes', 'homework class mappings exist');
select extensions.has_table('public', 'assessments', 'assessments exist');
select extensions.has_table('public', 'assessment_marks', 'assessment marks exist');

select extensions.ok((select relrowsecurity from pg_class where oid = 'public.lesson_diary_entries'::regclass), 'lesson diary has RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.homework_assignments'::regclass), 'homework has RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.homework_classes'::regclass), 'homework classes have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.assessments'::regclass), 'assessments have RLS');
select extensions.ok((select relrowsecurity from pg_class where oid = 'public.assessment_marks'::regclass), 'assessment marks have RLS');

select extensions.ok(not has_table_privilege('anon', 'public.lesson_diary_entries', 'select'), 'anon cannot read lesson diary');
select extensions.ok(not has_table_privilege('anon', 'public.assessment_marks', 'select'), 'anon cannot read marks');
select extensions.ok(not has_table_privilege('authenticated', 'public.lesson_diary_entries', 'delete'), 'diary entries cannot be hard deleted');
select extensions.ok(not has_table_privilege('authenticated', 'public.assessment_marks', 'delete'), 'marks cannot be hard deleted');
select extensions.ok(has_function_privilege('authenticated', 'private.can_teach_class_subject(uuid,uuid)', 'execute'), 'teacher allocation helper is callable');
select extensions.ok(has_function_privilege('authenticated', 'private.can_manage_assessment(uuid,uuid)', 'execute'), 'assessment authorization helper is callable');
select extensions.ok(exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'assessment_marks_assessment_idx'), 'marks batch lookup is indexed');
select extensions.ok(exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'diary_org_date_idx'), 'daily diary lookup is indexed');

select * from extensions.finish();
rollback;
