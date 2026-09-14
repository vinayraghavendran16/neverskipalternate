-- Northstar School OS: Phase 3 academics and daily attendance.

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  code text not null check (char_length(code) between 1 and 24),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.class_subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  teacher_staff_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (class_id, subject_id),
  constraint class_subject_class_org_fk foreign key (class_id, organization_id) references public.classes(id, organization_id),
  constraint class_subject_subject_org_fk foreign key (subject_id, organization_id) references public.subjects(id, organization_id),
  constraint class_subject_teacher_org_fk foreign key (teacher_staff_id, organization_id) references public.staff_profiles(id, organization_id)
);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  period_number smallint not null check (period_number between 1 and 20),
  starts_at time not null,
  ends_at time not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (class_id, weekday, period_number),
  constraint timetable_class_org_fk foreign key (class_id, organization_id) references public.classes(id, organization_id),
  constraint timetable_subject_org_fk foreign key (class_subject_id, organization_id) references public.class_subjects(id, organization_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  attendance_date date not null,
  status text not null default 'draft' check (status in ('draft','submitted','locked')),
  marked_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (class_id, attendance_date),
  constraint attendance_session_campus_org_fk foreign key (campus_id, organization_id) references public.campuses(id, organization_id),
  constraint attendance_session_class_org_fk foreign key (class_id, organization_id) references public.classes(id, organization_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null check (status in ('present','absent','late','excused')),
  reason text,
  marked_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (session_id, student_id),
  constraint attendance_record_session_org_fk foreign key (session_id, organization_id) references public.attendance_sessions(id, organization_id),
  constraint attendance_record_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id)
);

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  attendance_record_id uuid not null references public.attendance_records(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_status text not null check (requested_status in ('present','absent','late','excused')),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (attendance_record_id, requested_by, status),
  constraint attendance_correction_record_org_fk foreign key (attendance_record_id, organization_id) references public.attendance_records(id, organization_id)
);

create index subjects_org_idx on public.subjects(organization_id);
create index class_subjects_class_idx on public.class_subjects(class_id);
create index timetable_class_day_idx on public.timetable_entries(class_id, weekday, period_number);
create index attendance_sessions_org_date_idx on public.attendance_sessions(organization_id, attendance_date desc);
create index attendance_records_student_idx on public.attendance_records(student_id);
create index attendance_corrections_org_status_idx on public.attendance_corrections(organization_id, status);

create trigger subjects_updated_at before update on public.subjects for each row execute function private.set_updated_at();
create trigger class_subjects_updated_at before update on public.class_subjects for each row execute function private.set_updated_at();
create trigger timetable_entries_updated_at before update on public.timetable_entries for each row execute function private.set_updated_at();
create trigger attendance_sessions_updated_at before update on public.attendance_sessions for each row execute function private.set_updated_at();

alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_corrections enable row level security;

grant select, insert, update on public.subjects, public.class_subjects, public.timetable_entries, public.attendance_sessions, public.attendance_records, public.attendance_corrections to authenticated;

create function private.can_mark_class(target_class_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(target_org_id, array['owner','administrator','principal','staff']::public.app_role[])
    or (
      private.has_org_role(target_org_id, array['teacher']::public.app_role[])
      and (
        exists (
          select 1 from public.classes c
          where c.id = target_class_id
            and c.organization_id = target_org_id
            and c.homeroom_teacher_user_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.class_subjects cs
          join public.staff_profiles sp on sp.id = cs.teacher_staff_id and sp.organization_id = cs.organization_id
          where cs.class_id = target_class_id
            and cs.organization_id = target_org_id
            and sp.user_id = (select auth.uid())
        )
      )
    )
$$;

create function private.can_mark_attendance_session(target_session_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.attendance_sessions attendance_session
    where attendance_session.id = target_session_id
      and attendance_session.organization_id = target_org_id
      and private.can_mark_class(attendance_session.class_id, attendance_session.organization_id)
  )
$$;

revoke execute on function private.can_mark_class(uuid, uuid) from public, anon;
revoke execute on function private.can_mark_attendance_session(uuid, uuid) from public, anon;
grant execute on function private.can_mark_class(uuid, uuid) to authenticated;
grant execute on function private.can_mark_attendance_session(uuid, uuid) to authenticated;

create policy subjects_read_org on public.subjects for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy subjects_insert_admin on public.subjects for insert to authenticated with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy subjects_update_admin on public.subjects for update to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[])) with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

create policy class_subjects_read_org on public.class_subjects for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy class_subjects_insert_admin on public.class_subjects for insert to authenticated with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy class_subjects_update_admin on public.class_subjects for update to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[])) with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

create policy timetable_read_org on public.timetable_entries for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy timetable_insert_admin on public.timetable_entries for insert to authenticated with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy timetable_update_admin on public.timetable_entries for update to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[])) with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

create policy attendance_sessions_read_org on public.attendance_sessions for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy attendance_sessions_insert_teacher on public.attendance_sessions for insert to authenticated with check (marked_by = (select auth.uid()) and private.can_mark_class(class_id, organization_id));
create policy attendance_sessions_update_teacher on public.attendance_sessions for update to authenticated using (private.can_mark_class(class_id, organization_id)) with check (private.can_mark_class(class_id, organization_id));

create policy attendance_records_read_authorized on public.attendance_records for select to authenticated using (private.can_read_student(student_id, organization_id));
create policy attendance_records_insert_teacher on public.attendance_records for insert to authenticated with check (private.can_mark_attendance_session(session_id, organization_id));
create policy attendance_records_update_teacher on public.attendance_records for update to authenticated using (private.can_mark_attendance_session(session_id, organization_id)) with check (private.can_mark_attendance_session(session_id, organization_id));

create policy attendance_corrections_read_authorized on public.attendance_corrections for select to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','teacher','staff']::public.app_role[]) or requested_by = (select auth.uid()));
create policy attendance_corrections_insert_member on public.attendance_corrections for insert to authenticated
with check (requested_by = (select auth.uid()) and organization_id in (select private.user_org_ids()));
create policy attendance_corrections_update_admin on public.attendance_corrections for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

comment on table public.attendance_records is 'One status per enrolled student per daily class attendance session.';
comment on table public.attendance_corrections is 'Recoverable attendance corrections with explicit review state.';
