-- Authorization must hold for direct API calls as well as server actions.
create or replace function private.user_org_ids() returns setof uuid language sql stable security definer set search_path = '' as $$
 select m.organization_id from public.memberships m join public.organizations o on o.id=m.organization_id
 where m.user_id=(select auth.uid()) and m.status='active' and o.status='active'
$$;
create or replace function private.has_org_role(target_org_id uuid, allowed_roles public.app_role[]) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.memberships m join public.organizations o on o.id=m.organization_id
 where m.user_id=(select auth.uid()) and m.organization_id=target_org_id and m.status='active' and m.role=any(allowed_roles) and o.status='active')
$$;
create or replace function private.can_teach_class_subject(target_class_subject_id uuid, target_org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.has_org_role(target_org_id, array['owner','administrator','principal','staff']::public.app_role[])
 or (private.has_org_role(target_org_id,array['teacher']::public.app_role[]) and exists (
 select 1 from public.class_subjects cs join public.staff_profiles sp on sp.id=cs.teacher_staff_id and sp.organization_id=cs.organization_id
 where cs.id=target_class_subject_id and cs.organization_id=target_org_id and sp.user_id=(select auth.uid()) and sp.status='active'))
$$;
create or replace function private.can_read_student(target_student_id uuid, target_org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select target_org_id in (select private.user_org_ids()) and (
 private.has_org_role(target_org_id,array['owner','administrator','principal','teacher','staff']::public.app_role[])
 or exists(select 1 from public.students s where s.id=target_student_id and s.organization_id=target_org_id and s.user_id=(select auth.uid()))
 or exists(select 1 from public.guardian_relationships gr join public.guardians g on g.id=gr.guardian_id
 where gr.student_id=target_student_id and gr.organization_id=target_org_id and g.user_id=(select auth.uid()) and g.status='active'))
$$;
create or replace function private.can_read_assessment_mark(target_assessment_id uuid,target_student_id uuid,target_org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.can_manage_assessment(target_assessment_id,target_org_id)
 or (target_org_id in (select private.user_org_ids()) and exists(select 1 from public.assessments a where a.id=target_assessment_id and a.organization_id=target_org_id and a.status='published')
 and (exists(select 1 from public.students s where s.id=target_student_id and s.organization_id=target_org_id and s.user_id=(select auth.uid()))
 or exists(select 1 from public.guardian_relationships gr join public.guardians g on g.id=gr.guardian_id where gr.student_id=target_student_id and gr.organization_id=target_org_id and g.user_id=(select auth.uid()) and g.status='active')))
$$;
-- A restrictive membership policy also revokes legacy creator/self access after suspension.
do $$ declare t text; begin
 foreach t in array array['students','staff_profiles','guardians','guardian_relationships','classes','class_enrollments','subjects','class_subjects','timetable_entries','attendance_sessions','attendance_records','attendance_corrections','lesson_diary_entries','homework_assignments','homework_classes','assessments','assessment_marks','file_objects','audit_events'] loop
 execute format('create policy active_membership_required on public.%I as restrictive for all to authenticated using (organization_id in (select private.user_org_ids())) with check (organization_id in (select private.user_org_ids()))',t);
 end loop;
end $$;
-- Assigned teachers may continue a register created by another authorized colleague.
drop policy assessments_update_teacher on public.assessments;
create policy assessments_update_teacher on public.assessments for update to authenticated using(private.can_teach_class_subject(class_subject_id,organization_id)) with check(private.can_teach_class_subject(class_subject_id,organization_id));
drop policy diary_update_teacher on public.lesson_diary_entries;
create policy diary_update_teacher on public.lesson_diary_entries for update to authenticated using(private.can_teach_class_subject(class_subject_id,organization_id)) with check(private.can_teach_class_subject(class_subject_id,organization_id));
drop policy guardian_relationships_insert_admin on public.guardian_relationships;
drop policy guardian_relationships_update_admin on public.guardian_relationships;
create policy guardian_relationships_insert_admin on public.guardian_relationships for insert to authenticated with check(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));
create policy guardian_relationships_update_admin on public.guardian_relationships for update to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[])) with check(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));
-- Families cannot enumerate other students' enrollments or class attendance sessions.
create policy enrollment_privacy on public.class_enrollments as restrictive for select to authenticated using(private.can_read_student(student_id,organization_id));
create policy session_privacy on public.attendance_sessions as restrictive for select to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','teacher','staff']::public.app_role[]));
create policy corrections_privacy on public.attendance_corrections as restrictive for insert to authenticated with check(status='pending' and reviewed_by is null and reviewed_at is null and exists(select 1 from public.attendance_records r where r.id=attendance_record_id and private.can_read_student(r.student_id,r.organization_id)));
-- Private bucket content was readable by every family in the organization.
drop policy school_files_read_member on storage.objects;
create policy school_files_read_member on storage.objects for select to authenticated using(bucket_id='school-files' and split_part(name,'/',1) in (select private.user_org_ids()::text) and (owner_id=(select auth.uid()::text) or exists(select 1 from public.memberships m where m.organization_id::text=split_part(name,'/',1) and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','administrator','principal','staff'))));
create policy file_metadata_privacy on public.file_objects as restrictive for select to authenticated using(owner_user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));

alter table public.attendance_records add constraint attendance_reason_length check (reason is null or char_length(reason) <= 500);
alter table public.assessment_marks add constraint assessment_note_length check (note is null or char_length(note) <= 500);

-- Locks apply at the database boundary and serialize competing writers.
create function private.protect_register() returns trigger language plpgsql set search_path='' as $$
declare state text; begin
 if tg_table_name='assessment_marks' then
  select status into state from public.assessments where id=new.assessment_id for update;
  if state in ('published','archived') then raise exception 'Published or archived marks are locked'; end if;
 elsif tg_table_name='attendance_records' then
  select status into state from public.attendance_sessions where id=new.session_id for update;
  if state='locked' then raise exception 'Attendance is locked'; end if;
  if not exists(select 1 from public.class_enrollments e join public.attendance_sessions s on s.class_id=e.class_id where s.id=new.session_id and e.student_id=new.student_id and e.organization_id=new.organization_id and e.status='active') then raise exception 'Student is not enrolled in this class'; end if;
 elsif tg_table_name='attendance_sessions' then
  if tg_op='UPDATE' and old.status='locked' then raise exception 'Attendance is locked'; end if;
  if not exists(select 1 from public.classes c where c.id=new.class_id and c.campus_id=new.campus_id) then raise exception 'Attendance campus does not match class'; end if;
 elsif tg_table_name='assessments' then
  if tg_op='UPDATE' and old.status in ('published','archived') then raise exception 'Published or archived assessment is locked'; end if;
 end if;
 return new;
end $$;
create trigger marks_lock before insert or update on public.assessment_marks for each row execute function private.protect_register();
create trigger attendance_record_lock before insert or update on public.attendance_records for each row execute function private.protect_register();
create trigger attendance_session_lock before insert or update on public.attendance_sessions for each row execute function private.protect_register();
create trigger assessment_lock before update on public.assessments for each row execute function private.protect_register();

-- Prevent mismatched timetable allocations and overlapping periods for a class.
alter table public.class_subjects add constraint allocation_class_identity unique(id,class_id,organization_id);
alter table public.timetable_entries add constraint timetable_allocation_class_fk foreign key(class_subject_id,class_id,organization_id) references public.class_subjects(id,class_id,organization_id);
create extension if not exists btree_gist;
alter table public.timetable_entries add constraint timetable_class_no_overlap exclude using gist (class_id with =, weekday with =, (tsrange(date '2000-01-01'+starts_at,date '2000-01-01'+ends_at,'[)')) with &&);
alter table public.timetable_entries add constraint timetable_diary_identity unique(id,class_subject_id,organization_id);
alter table public.lesson_diary_entries add constraint diary_period_allocation_fk foreign key(timetable_entry_id,class_subject_id,organization_id) references public.timetable_entries(id,class_subject_id,organization_id);
-- Fail migration visibly if legacy duplicate daily drafts need reconciliation.
create unique index diary_daily_unique on public.lesson_diary_entries(class_subject_id,entry_date) where timetable_entry_id is null;

-- Atomic RPCs run with the caller's privileges; all existing RLS still applies.
create function public.save_attendance_register(p_org uuid,p_class uuid,p_date date,p_submit boolean,p_rows jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_session_id uuid; campus uuid; begin
 if not private.can_mark_class(p_class,p_org) then raise exception 'Class is not assigned to you'; end if;
 perform 1 from public.classes where id=p_class and organization_id=p_org for update;
 select campus_id into strict campus from public.classes where id=p_class and organization_id=p_org;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid attendance register'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as r(student_id uuid,status text,reason text) where status is null or status not in ('present','absent','late','excused') or char_length(reason)>500) then raise exception 'Invalid attendance status or note'; end if;
 if (select count(*) from jsonb_to_recordset(p_rows) as r(student_id uuid)) <> (select count(distinct student_id) from jsonb_to_recordset(p_rows) as r(student_id uuid))
 or exists((select student_id from public.class_enrollments where class_id=p_class and status='active') except (select student_id from jsonb_to_recordset(p_rows) as r(student_id uuid)))
 or exists((select student_id from jsonb_to_recordset(p_rows) as r(student_id uuid)) except (select student_id from public.class_enrollments where class_id=p_class and status='active')) then raise exception 'Roster changed. Refresh before saving'; end if;
 insert into public.attendance_sessions(organization_id,campus_id,class_id,attendance_date,status,marked_by,submitted_at) values(p_org,campus,p_class,p_date,'draft',auth.uid(),null)
 on conflict(class_id,attendance_date) do update set marked_by=auth.uid() returning id into saved_session_id;
 insert into public.attendance_records(organization_id,session_id,student_id,status,reason,marked_at)
 select p_org,saved_session_id,r.student_id,r.status,nullif(r.reason,''),now() from jsonb_to_recordset(p_rows) as r(student_id uuid,status text,reason text)
 on conflict(session_id,student_id) do update set status=excluded.status,reason=excluded.reason,marked_at=excluded.marked_at;
 update public.attendance_sessions set status=case when p_submit then 'submitted' else 'draft' end,submitted_at=case when p_submit then now() else null end where id=saved_session_id;
 return saved_session_id;
end $$;

create function public.save_marks_register(p_assessment uuid,p_publish boolean,p_rows jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare a public.assessments; target_class uuid; begin
 select * into strict a from public.assessments where id=p_assessment for update;
 if not private.can_manage_assessment(a.id,a.organization_id) then raise exception 'Assessment is not assigned to you'; end if;
 if a.status in ('published','archived') then raise exception 'Published or archived marks are locked'; end if;
 select class_id into target_class from public.class_subjects where id=a.class_subject_id;
 perform 1 from public.classes where id=target_class for update;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid marks register'; end if;
 if exists(select 1 from jsonb_to_recordset(p_rows) as r(status text,note text) where status is null or status not in ('scored','absent','not_applicable') or char_length(note)>500) then raise exception 'Invalid result status or note'; end if;
 if (select count(*) from jsonb_to_recordset(p_rows) as r(student_id uuid))<>(select count(distinct student_id) from jsonb_to_recordset(p_rows) as r(student_id uuid)) then raise exception 'Duplicate student rows'; end if;
 if p_publish and exists((select student_id from public.class_enrollments where class_id=target_class and status='active') except (select student_id from jsonb_to_recordset(p_rows) as r(student_id uuid))) then raise exception 'Enter every student result before publishing'; end if;
 insert into public.assessment_marks(organization_id,assessment_id,student_id,marks,result_status,note,marked_by,marked_at)
 select a.organization_id,a.id,r.student_id,r.marks,r.status,nullif(r.note,''),auth.uid(),now() from jsonb_to_recordset(p_rows) as r(student_id uuid,marks numeric,status text,note text)
 on conflict(assessment_id,student_id) do update set marks=excluded.marks,result_status=excluded.result_status,note=excluded.note,marked_by=excluded.marked_by,marked_at=excluded.marked_at;
 update public.assessments set status=case when p_publish then 'published' else 'marks_open' end,published_at=case when p_publish then now() else null end where id=a.id;
 return jsonb_array_length(p_rows);
end $$;

create function public.create_homework_with_classes(p_org uuid,p_subject uuid,p_title text,p_instructions text,p_due timestamptz,p_minutes integer,p_publish boolean,p_classes uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare homework_id uuid; begin
 if coalesce(cardinality(p_classes),0)=0 or cardinality(p_classes)>100 then raise exception 'Choose between 1 and 100 classes'; end if;
 if exists(select 1 from unnest(p_classes) c where not exists(select 1 from public.class_subjects cs where cs.class_id=c and cs.subject_id=p_subject and cs.organization_id=p_org and private.can_teach_class_subject(cs.id,p_org))) then raise exception 'Subject is not assigned to every selected class'; end if;
 insert into public.homework_assignments(organization_id,subject_id,title,instructions,due_at,estimated_minutes,status,created_by,published_at)
 values(p_org,p_subject,p_title,p_instructions,p_due,p_minutes,case when p_publish then 'published' else 'draft' end,auth.uid(),case when p_publish then now() else null end) returning id into homework_id;
 insert into public.homework_classes(organization_id,homework_id,class_id) select p_org,homework_id,c from (select distinct unnest(p_classes) c) chosen;
 return homework_id;
end $$;
revoke all on function public.save_attendance_register(uuid,uuid,date,boolean,jsonb),public.save_marks_register(uuid,boolean,jsonb),public.create_homework_with_classes(uuid,uuid,text,text,timestamptz,integer,boolean,uuid[]) from public,anon;
grant execute on function public.save_attendance_register(uuid,uuid,date,boolean,jsonb),public.save_marks_register(uuid,boolean,jsonb),public.create_homework_with_classes(uuid,uuid,text,text,timestamptz,integer,boolean,uuid[]) to authenticated;
revoke all on function private.protect_register() from public,anon,authenticated;

-- Audit insertion is in the same transaction; never copy personal values into logs.
create function private.audit_mutation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id) values(new.organization_id,auth.uid(),lower(tg_table_name||'.'||tg_op),tg_table_name,new.id::text);
 return new;
end $$;
revoke all on function private.audit_mutation() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['students','staff_profiles','guardians','guardian_relationships','classes','class_enrollments','subjects','class_subjects','timetable_entries','attendance_sessions','lesson_diary_entries','homework_assignments','homework_classes','assessments'] loop
 execute format('create trigger audit_mutation after insert or update on public.%I for each row execute function private.audit_mutation()',t);
 end loop;
end $$;

create function private.audit_register_batch() returns trigger language plpgsql security definer set search_path='' as $$
declare target_org uuid; changed integer; begin
 select organization_id into target_org from new_rows limit 1;
 select count(*) into changed from new_rows;
 if target_org is not null then
  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,metadata)
  values(target_org,auth.uid(),lower(tg_table_name||'.batch_'||tg_op),tg_table_name,jsonb_build_object('rows',changed));
 end if;
 return null;
end $$;
revoke all on function private.audit_register_batch() from public,anon,authenticated;
create trigger attendance_records_batch_insert after insert on public.attendance_records referencing new table as new_rows for each statement execute function private.audit_register_batch();
create trigger attendance_records_batch_update after update on public.attendance_records referencing new table as new_rows for each statement execute function private.audit_register_batch();
create trigger assessment_marks_batch_insert after insert on public.assessment_marks referencing new table as new_rows for each statement execute function private.audit_register_batch();
create trigger assessment_marks_batch_update after update on public.assessment_marks referencing new table as new_rows for each statement execute function private.audit_register_batch();
