-- Northstar School OS: Phase 4 teacher daily work, homework and assessments.

create table public.lesson_diary_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_subject_id uuid not null references public.class_subjects(id) on delete restrict,
  timetable_entry_id uuid references public.timetable_entries(id) on delete set null,
  entry_date date not null,
  topic text not null check (char_length(topic) between 1 and 180),
  summary text not null check (char_length(summary) between 1 and 4000),
  learning_objective text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint diary_class_subject_org_fk foreign key (class_subject_id, organization_id) references public.class_subjects(id, organization_id)
);

create unique index diary_timetable_date_unique on public.lesson_diary_entries(timetable_entry_id, entry_date) where timetable_entry_id is not null;
create index diary_org_date_idx on public.lesson_diary_entries(organization_id, entry_date desc);
create index diary_subject_date_idx on public.lesson_diary_entries(class_subject_id, entry_date desc);

create table public.homework_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  instructions text not null check (char_length(instructions) between 1 and 5000),
  due_at timestamptz not null,
  estimated_minutes smallint check (estimated_minutes is null or estimated_minutes between 1 and 600),
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint homework_subject_org_fk foreign key (subject_id, organization_id) references public.subjects(id, organization_id)
);

create table public.homework_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  homework_id uuid not null references public.homework_assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (homework_id, class_id),
  constraint homework_class_assignment_org_fk foreign key (homework_id, organization_id) references public.homework_assignments(id, organization_id),
  constraint homework_class_class_org_fk foreign key (class_id, organization_id) references public.classes(id, organization_id)
);

create index homework_org_due_idx on public.homework_assignments(organization_id, due_at desc);
create index homework_classes_class_idx on public.homework_classes(class_id, homework_id);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_subject_id uuid not null references public.class_subjects(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  assessment_date date not null,
  max_marks numeric(7,2) not null check (max_marks > 0 and max_marks <= 10000),
  weight_percent numeric(5,2) check (weight_percent is null or weight_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft','marks_open','published','archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint assessment_class_subject_org_fk foreign key (class_subject_id, organization_id) references public.class_subjects(id, organization_id)
);

create table public.assessment_marks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  marks numeric(7,2),
  result_status text not null default 'scored' check (result_status in ('scored','absent','not_applicable')),
  note text,
  marked_by uuid not null references auth.users(id) on delete restrict,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id),
  constraint assessment_mark_assessment_org_fk foreign key (assessment_id, organization_id) references public.assessments(id, organization_id),
  constraint assessment_mark_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id),
  check ((result_status = 'scored' and marks is not null and marks >= 0) or (result_status <> 'scored' and marks is null))
);

create index assessments_org_date_idx on public.assessments(organization_id, assessment_date desc);
create index assessments_subject_date_idx on public.assessments(class_subject_id, assessment_date desc);
create index assessment_marks_assessment_idx on public.assessment_marks(assessment_id, student_id);
create index assessment_marks_student_idx on public.assessment_marks(student_id, assessment_id);

create function private.validate_homework_class()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.homework_assignments homework
    join public.class_subjects allocation
      on allocation.subject_id = homework.subject_id
      and allocation.organization_id = homework.organization_id
    where homework.id = new.homework_id
      and homework.organization_id = new.organization_id
      and allocation.class_id = new.class_id
  ) then
    raise exception 'Homework subject is not allocated to the selected class';
  end if;
  return new;
end;
$$;

create function private.validate_assessment_mark()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed_max numeric(7,2);
  target_class_id uuid;
begin
  select assessment.max_marks, allocation.class_id
    into allowed_max, target_class_id
  from public.assessments assessment
  join public.class_subjects allocation on allocation.id = assessment.class_subject_id
  where assessment.id = new.assessment_id and assessment.organization_id = new.organization_id;

  if allowed_max is null then raise exception 'Assessment not found'; end if;
  if new.result_status = 'scored' and new.marks > allowed_max then raise exception 'Marks exceed assessment maximum'; end if;
  if not exists (
    select 1 from public.class_enrollments enrollment
    where enrollment.class_id = target_class_id
      and enrollment.student_id = new.student_id
      and enrollment.organization_id = new.organization_id
      and enrollment.status = 'active'
  ) then
    raise exception 'Student is not actively enrolled in the assessment class';
  end if;
  return new;
end;
$$;

create trigger homework_class_validate before insert or update on public.homework_classes for each row execute function private.validate_homework_class();
create trigger assessment_mark_validate before insert or update on public.assessment_marks for each row execute function private.validate_assessment_mark();

revoke execute on function private.validate_homework_class() from public, anon, authenticated;
revoke execute on function private.validate_assessment_mark() from public, anon, authenticated;

create trigger lesson_diary_updated_at before update on public.lesson_diary_entries for each row execute function private.set_updated_at();
create trigger homework_assignments_updated_at before update on public.homework_assignments for each row execute function private.set_updated_at();
create trigger assessments_updated_at before update on public.assessments for each row execute function private.set_updated_at();
create trigger assessment_marks_updated_at before update on public.assessment_marks for each row execute function private.set_updated_at();

alter table public.lesson_diary_entries enable row level security;
alter table public.homework_assignments enable row level security;
alter table public.homework_classes enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_marks enable row level security;

grant select, insert, update on public.lesson_diary_entries, public.homework_assignments, public.homework_classes, public.assessments, public.assessment_marks to authenticated;

create function private.can_teach_class_subject(target_class_subject_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(target_org_id, array['owner','administrator','principal','staff']::public.app_role[])
    or exists (
      select 1
      from public.class_subjects cs
      join public.staff_profiles sp on sp.id = cs.teacher_staff_id and sp.organization_id = cs.organization_id
      where cs.id = target_class_subject_id
        and cs.organization_id = target_org_id
        and sp.user_id = (select auth.uid())
    )
$$;

create function private.can_manage_assessment(target_assessment_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessments assessment
    where assessment.id = target_assessment_id
      and assessment.organization_id = target_org_id
      and private.can_teach_class_subject(assessment.class_subject_id, assessment.organization_id)
  )
$$;

create function private.can_assign_homework(target_homework_id uuid, target_class_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(target_org_id, array['owner','administrator','principal','staff']::public.app_role[])
    or exists (
      select 1
      from public.homework_assignments homework
      join public.class_subjects allocation
        on allocation.subject_id = homework.subject_id
        and allocation.class_id = target_class_id
        and allocation.organization_id = homework.organization_id
      where homework.id = target_homework_id
        and homework.organization_id = target_org_id
        and private.can_teach_class_subject(allocation.id, allocation.organization_id)
    )
$$;

create function private.can_read_assessment_mark(target_assessment_id uuid, target_student_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_manage_assessment(target_assessment_id, target_org_id)
    or exists (
      select 1 from public.students student
      where student.id = target_student_id
        and student.organization_id = target_org_id
        and student.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.guardian_relationships relationship
      where relationship.student_id = target_student_id
        and relationship.organization_id = target_org_id
        and relationship.guardian_user_id = (select auth.uid())
    )
$$;

revoke execute on function private.can_teach_class_subject(uuid, uuid) from public, anon;
revoke execute on function private.can_manage_assessment(uuid, uuid) from public, anon;
revoke execute on function private.can_assign_homework(uuid, uuid, uuid) from public, anon;
revoke execute on function private.can_read_assessment_mark(uuid, uuid, uuid) from public, anon;
grant execute on function private.can_teach_class_subject(uuid, uuid) to authenticated;
grant execute on function private.can_manage_assessment(uuid, uuid) to authenticated;
grant execute on function private.can_assign_homework(uuid, uuid, uuid) to authenticated;
grant execute on function private.can_read_assessment_mark(uuid, uuid, uuid) to authenticated;

create policy diary_read_staff on public.lesson_diary_entries for select to authenticated
using (private.can_teach_class_subject(class_subject_id, organization_id));
create policy diary_insert_teacher on public.lesson_diary_entries for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_teach_class_subject(class_subject_id, organization_id));
create policy diary_update_teacher on public.lesson_diary_entries for update to authenticated
using (created_by = (select auth.uid()) or private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (private.can_teach_class_subject(class_subject_id, organization_id));

create policy homework_read_org on public.homework_assignments for select to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','teacher','staff']::public.app_role[]));
create policy homework_insert_teacher on public.homework_assignments for insert to authenticated
with check (created_by = (select auth.uid()) and private.has_org_role(organization_id, array['owner','administrator','principal','teacher','staff']::public.app_role[]));
create policy homework_update_teacher on public.homework_assignments for update to authenticated
using (created_by = (select auth.uid()) or private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (organization_id in (select private.user_org_ids()));

create policy homework_classes_read_org on public.homework_classes for select to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','teacher','staff']::public.app_role[]));
create policy homework_classes_insert_teacher on public.homework_classes for insert to authenticated
with check (private.can_assign_homework(homework_id, class_id, organization_id));
create policy homework_classes_update_teacher on public.homework_classes for update to authenticated
using (private.can_assign_homework(homework_id, class_id, organization_id)) with check (private.can_assign_homework(homework_id, class_id, organization_id));

create policy assessments_read_staff on public.assessments for select to authenticated
using (private.can_teach_class_subject(class_subject_id, organization_id));
create policy assessments_insert_teacher on public.assessments for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_teach_class_subject(class_subject_id, organization_id));
create policy assessments_update_teacher on public.assessments for update to authenticated
using (created_by = (select auth.uid()) or private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (private.can_teach_class_subject(class_subject_id, organization_id));

create policy assessment_marks_read_authorized on public.assessment_marks for select to authenticated
using (private.can_read_assessment_mark(assessment_id, student_id, organization_id));
create policy assessment_marks_insert_teacher on public.assessment_marks for insert to authenticated
with check (marked_by = (select auth.uid()) and private.can_manage_assessment(assessment_id, organization_id));
create policy assessment_marks_update_teacher on public.assessment_marks for update to authenticated
using (private.can_manage_assessment(assessment_id, organization_id))
with check (marked_by = (select auth.uid()) and private.can_manage_assessment(assessment_id, organization_id));

comment on table public.lesson_diary_entries is 'Daily lesson record authored against a teacher class-subject allocation.';
comment on table public.homework_assignments is 'Reusable homework content mapped to one or more classes.';
comment on table public.assessment_marks is 'One batched mark record per student and assessment.';
