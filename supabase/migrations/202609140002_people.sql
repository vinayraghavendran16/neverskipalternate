-- Northstar School OS: Phase 2 people management
-- Searchable student, staff and guardian records with privacy-aware RLS.

alter table public.students
  add column user_id uuid references auth.users(id) on delete set null,
  add column preferred_name text,
  add column gender text check (gender is null or gender in ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  add column email text,
  add column phone text,
  add column address text,
  add column emergency_notes text,
  add column joined_on date;

create unique index students_user_org_unique on public.students(organization_id, user_id) where user_id is not null;

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  employee_number text not null,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text,
  email text,
  phone text,
  designation text not null,
  department text,
  employment_type text not null default 'full_time' check (employment_type in ('full_time','part_time','contract','visiting')),
  joined_on date,
  status text not null default 'active' check (status in ('active','on_leave','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, employee_number),
  constraint staff_campus_organization_fk foreign key (campus_id, organization_id)
    references public.campuses(id, organization_id)
);

create index staff_profiles_org_idx on public.staff_profiles(organization_id);
create index staff_profiles_campus_idx on public.staff_profiles(campus_id);
create unique index staff_profiles_user_org_unique on public.staff_profiles(organization_id, user_id) where user_id is not null;

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text,
  email text,
  phone text not null,
  occupation text,
  address text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index guardians_org_idx on public.guardians(organization_id);
create index guardians_phone_idx on public.guardians(organization_id, phone);
create unique index guardians_user_org_unique on public.guardians(organization_id, user_id) where user_id is not null;

alter table public.guardian_relationships add column guardian_id uuid references public.guardians(id) on delete cascade;

insert into public.guardians (id, organization_id, user_id, first_name, email, phone)
select distinct gr.guardian_user_id, gr.organization_id, gr.guardian_user_id,
  coalesce(p.full_name, 'Guardian'), u.email, coalesce(u.phone, 'Not provided')
from public.guardian_relationships gr
left join public.profiles p on p.id = gr.guardian_user_id
left join auth.users u on u.id = gr.guardian_user_id
on conflict (id) do nothing;

update public.guardian_relationships set guardian_id = guardian_user_id where guardian_id is null;
alter table public.guardian_relationships alter column guardian_id set not null;
alter table public.guardian_relationships alter column guardian_user_id drop not null;
alter table public.guardian_relationships add constraint guardian_relationship_student_guardian_unique unique (student_id, guardian_id);
alter table public.guardian_relationships add constraint guardian_record_organization_fk foreign key (guardian_id, organization_id)
  references public.guardians(id, organization_id);

create trigger staff_profiles_updated_at before update on public.staff_profiles for each row execute function private.set_updated_at();
create trigger guardians_updated_at before update on public.guardians for each row execute function private.set_updated_at();

create function private.can_read_student(target_student_id uuid, target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_org_role(target_org_id, array['owner','administrator','principal','teacher','staff']::public.app_role[])
    or exists (
      select 1 from public.students s
      where s.id = target_student_id and s.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.guardian_relationships gr
      where gr.student_id = target_student_id and gr.guardian_user_id = (select auth.uid())
    )
$$;

revoke execute on function private.can_read_student(uuid, uuid) from public, anon;
grant execute on function private.can_read_student(uuid, uuid) to authenticated;

alter table public.staff_profiles enable row level security;
alter table public.guardians enable row level security;
grant select, insert, update on public.staff_profiles, public.guardians to authenticated;

drop policy students_read_org on public.students;
create policy students_read_authorized on public.students for select to authenticated
using (private.can_read_student(id, organization_id));

drop policy guardian_relationships_read on public.guardian_relationships;
create policy guardian_relationships_read_authorized on public.guardian_relationships for select to authenticated
using (private.can_read_student(student_id, organization_id));

create policy staff_profiles_read_authorized on public.staff_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_org_role(organization_id, array['owner','administrator','principal','teacher','staff']::public.app_role[])
);
create policy staff_profiles_insert_manager on public.staff_profiles for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy staff_profiles_update_manager on public.staff_profiles for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));

create policy guardians_read_authorized on public.guardians for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[])
);
create policy guardians_insert_staff on public.guardians for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy guardians_update_staff on public.guardians for update to authenticated
using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]))
with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));

comment on table public.staff_profiles is 'School-managed staff and teacher directory; auth account is optional.';
comment on table public.guardians is 'School-managed guardian contacts; auth account is optional.';
