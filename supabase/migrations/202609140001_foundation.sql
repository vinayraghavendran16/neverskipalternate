-- Northstar School OS: Phase 1 production foundation
-- PostgreSQL tenancy, identity, authorization, storage and audit controls.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.app_role as enum (
  'owner', 'administrator', 'principal', 'teacher', 'parent', 'student', 'staff'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  code text not null check (char_length(code) between 2 and 24),
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid references public.campuses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role),
  constraint membership_campus_organization_fk foreign key (campus_id, organization_id)
    references public.campuses(id, organization_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_organization_id_idx on public.memberships(organization_id);
create index memberships_campus_id_idx on public.memberships(campus_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  admission_number text not null,
  first_name text not null,
  last_name text,
  date_of_birth date,
  status text not null default 'active' check (status in ('applicant', 'active', 'withdrawn', 'alumni')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint student_campus_organization_fk foreign key (campus_id, organization_id)
    references public.campuses(id, organization_id),
  unique (organization_id, admission_number)
);

create index students_organization_id_idx on public.students(organization_id);
create index students_campus_id_idx on public.students(campus_id);

create table public.guardian_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null,
  is_primary boolean not null default false,
  can_pick_up boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, guardian_user_id),
  constraint guardian_student_organization_fk foreign key (student_id, organization_id)
    references public.students(id, organization_id)
);

create index guardian_relationships_organization_id_idx on public.guardian_relationships(organization_id);
create index guardian_relationships_guardian_user_id_idx on public.guardian_relationships(guardian_user_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  grade text not null,
  section text not null,
  homeroom_teacher_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint class_campus_organization_fk foreign key (campus_id, organization_id)
    references public.campuses(id, organization_id),
  constraint class_year_organization_fk foreign key (academic_year_id, organization_id)
    references public.academic_years(id, organization_id),
  unique (academic_year_id, campus_id, grade, section)
);

create index classes_organization_id_idx on public.classes(organization_id);
create index classes_campus_id_idx on public.classes(campus_id);

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'transferred', 'completed')),
  joined_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now(),
  unique (class_id, student_id),
  constraint enrollment_class_organization_fk foreign key (class_id, organization_id)
    references public.classes(id, organization_id),
  constraint enrollment_student_organization_fk foreign key (student_id, organization_id)
    references public.students(id, organization_id),
  check (left_on is null or left_on >= joined_on)
);

create index class_enrollments_organization_id_idx on public.class_enrollments(organization_id);
create index class_enrollments_student_id_idx on public.class_enrollments(student_id);

create table public.file_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  bucket text not null default 'school-files',
  object_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 26214400),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  classification text not null default 'internal' check (classification in ('internal', 'sensitive', 'restricted')),
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'blocked', 'failed')),
  created_at timestamptz not null default now(),
  unique (bucket, object_path),
  check (split_part(object_path, '/', 1) = organization_id::text)
);

create index file_objects_organization_id_idx on public.file_objects(organization_id);
create index file_objects_owner_user_id_idx on public.file_objects(owner_user_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 120),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_org_time_idx on public.audit_events(organization_id, occurred_at desc);
create index audit_events_actor_idx on public.audit_events(actor_user_id);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id);

-- Updated-at consistency.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger campuses_updated_at before update on public.campuses for each row execute function private.set_updated_at();
create trigger academic_years_updated_at before update on public.academic_years for each row execute function private.set_updated_at();
create trigger memberships_updated_at before update on public.memberships for each row execute function private.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute function private.set_updated_at();
create trigger classes_updated_at before update on public.classes for each row execute function private.set_updated_at();

-- Create a minimal profile when an invited Auth user is created.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1), 'User'));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Security-definer helpers avoid recursive membership policies. They are kept
-- outside exposed schemas, have a pinned search path and return caller-scoped data.
create function private.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.status = 'active'
$$;

create function private.has_org_role(target_org_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.organization_id = target_org_id
      and m.status = 'active'
      and m.role = any(allowed_roles)
  )
$$;

revoke execute on function private.user_org_ids() from public, anon;
revoke execute on function private.has_org_role(uuid, public.app_role[]) from public, anon;
grant execute on function private.user_org_ids() to authenticated;
grant execute on function private.has_org_role(uuid, public.app_role[]) to authenticated;

-- Enable RLS on every exposed table.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.campuses enable row level security;
alter table public.academic_years enable row level security;
alter table public.memberships enable row level security;
alter table public.students enable row level security;
alter table public.guardian_relationships enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.file_objects enable row level security;
alter table public.audit_events enable row level security;

-- Start from no client privileges and grant only required operations.
revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update on public.campuses, public.academic_years, public.memberships, public.students, public.guardian_relationships, public.classes, public.class_enrollments, public.file_objects to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy organizations_read_member on public.organizations for select to authenticated
using (id in (select private.user_org_ids()));
create policy organizations_update_admin on public.organizations for update to authenticated
using (private.has_org_role(id, array['owner','administrator']::public.app_role[]))
with check (private.has_org_role(id, array['owner','administrator']::public.app_role[]));

create policy campuses_read_member on public.campuses for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy campuses_insert_admin on public.campuses for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));
create policy campuses_update_admin on public.campuses for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));

create policy academic_years_read_member on public.academic_years for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy academic_years_insert_admin on public.academic_years for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));
create policy academic_years_update_admin on public.academic_years for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));

create policy memberships_read_member on public.memberships for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy memberships_insert_admin on public.memberships for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));
create policy memberships_update_admin on public.memberships for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));

create policy students_read_org on public.students for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy students_insert_staff on public.students for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy students_update_staff on public.students for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));

create policy guardian_relationships_read on public.guardian_relationships for select to authenticated
using (guardian_user_id = (select auth.uid()) or organization_id in (select private.user_org_ids()));
create policy guardian_relationships_insert_admin on public.guardian_relationships for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','staff']::public.app_role[]));
create policy guardian_relationships_update_admin on public.guardian_relationships for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','staff']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','staff']::public.app_role[]));

create policy classes_read_org on public.classes for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy classes_insert_admin on public.classes for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy classes_update_admin on public.classes for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

create policy class_enrollments_read_org on public.class_enrollments for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy class_enrollments_insert_admin on public.class_enrollments for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy class_enrollments_update_admin on public.class_enrollments for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));

create policy file_objects_read_org on public.file_objects for select to authenticated
using (organization_id in (select private.user_org_ids()));
create policy file_objects_insert_owner on public.file_objects for insert to authenticated
with check (owner_user_id = (select auth.uid()) and organization_id in (select private.user_org_ids()));
create policy file_objects_update_admin on public.file_objects for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator']::public.app_role[]));

create policy audit_events_read_admin on public.audit_events for select to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy audit_events_insert_member on public.audit_events for insert to authenticated
with check (actor_user_id = (select auth.uid()) and organization_id in (select private.user_org_ids()));

-- Private storage. Object paths must begin with the organization UUID.
insert into storage.buckets (id, name, public, file_size_limit)
values ('school-files', 'school-files', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy school_files_read_member on storage.objects for select to authenticated
using (bucket_id = 'school-files' and split_part(name, '/', 1)::uuid in (select private.user_org_ids()));
create policy school_files_insert_member on storage.objects for insert to authenticated
with check (bucket_id = 'school-files' and split_part(name, '/', 1)::uuid in (select private.user_org_ids()));
create policy school_files_update_owner_or_admin on storage.objects for update to authenticated
using (
  bucket_id = 'school-files' and (
    owner_id = (select auth.uid()::text)
    or private.has_org_role(split_part(name, '/', 1)::uuid, array['owner','administrator']::public.app_role[])
  )
)
with check (bucket_id = 'school-files' and split_part(name, '/', 1)::uuid in (select private.user_org_ids()));
create policy school_files_delete_admin on storage.objects for delete to authenticated
using (bucket_id = 'school-files' and private.has_org_role(split_part(name, '/', 1)::uuid, array['owner','administrator']::public.app_role[]));

comment on table public.audit_events is 'Append-only tenant audit trail. No authenticated update or delete grants.';
comment on schema private is 'Non-exposed security helpers with pinned search paths.';
