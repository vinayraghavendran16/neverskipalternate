-- Northstar School OS: family portal, communication, approvals and fee visibility.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid references public.campuses(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  audience public.app_role[] not null default array['owner','administrator','principal','teacher','parent','student','staff']::public.app_role[],
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  requires_acknowledgement boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint announcement_campus_org_fk foreign key (campus_id, organization_id) references public.campuses(id, organization_id),
  check (cardinality(audience) > 0),
  check (expires_at is null or expires_at > coalesce(published_at, created_at))
);

create table public.announcement_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (announcement_id, user_id),
  constraint receipt_announcement_org_fk foreign key (announcement_id, organization_id) references public.announcements(id, organization_id)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid references public.students(id) on delete cascade,
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  leave_type text not null check (leave_type in ('sick','personal','family','official','other')),
  starts_on date not null,
  ends_on date not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint leave_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id),
  constraint leave_staff_org_fk foreign key (staff_id, organization_id) references public.staff_profiles(id, organization_id),
  check ((student_id is not null)::integer + (staff_id is not null)::integer = 1),
  check (ends_on >= starts_on),
  check ((status = 'pending' and reviewed_by is null and reviewed_at is null) or status in ('approved','rejected','cancelled'))
);

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  homework_id uuid not null references public.homework_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  response text check (response is null or char_length(response) <= 5000),
  status text not null default 'not_started' check (status in ('not_started','submitted','returned','completed')),
  submitted_by uuid references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (homework_id, student_id),
  unique (id, organization_id),
  constraint submission_homework_org_fk foreign key (homework_id, organization_id) references public.homework_assignments(id, organization_id),
  constraint submission_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id)
);

create table public.fee_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  fee_name text not null check (char_length(fee_name) between 1 and 160),
  amount numeric(12,2) not null check (amount > 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0 and paid_amount <= amount),
  due_on date not null,
  status text not null default 'due' check (status in ('due','partial','paid','waived','cancelled')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint invoice_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id)
);

create table public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  invoice_id uuid not null references public.fee_invoices(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null check (method in ('cash','bank_transfer','upi','cheque','card','online_gateway')),
  reference text check (reference is null or char_length(reference) <= 120),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint payment_invoice_org_fk foreign key (invoice_id, organization_id) references public.fee_invoices(id, organization_id)
);

create index announcements_org_published_idx on public.announcements(organization_id, published_at desc) where status = 'published';
create index receipts_user_idx on public.announcement_receipts(user_id, read_at desc);
create index leave_org_status_idx on public.leave_requests(organization_id, status, starts_on);
create index submissions_student_idx on public.homework_submissions(student_id, updated_at desc);
create index invoices_student_due_idx on public.fee_invoices(student_id, due_on desc);
create index payments_invoice_idx on public.fee_payments(invoice_id, paid_at desc);

create trigger announcements_updated_at before update on public.announcements for each row execute function private.set_updated_at();
create trigger leave_requests_updated_at before update on public.leave_requests for each row execute function private.set_updated_at();
create trigger homework_submissions_updated_at before update on public.homework_submissions for each row execute function private.set_updated_at();
create trigger fee_invoices_updated_at before update on public.fee_invoices for each row execute function private.set_updated_at();

alter table public.announcements enable row level security;
alter table public.announcement_receipts enable row level security;
alter table public.leave_requests enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.fee_invoices enable row level security;
alter table public.fee_payments enable row level security;

grant select, insert, update on public.announcements, public.announcement_receipts, public.leave_requests, public.homework_submissions, public.fee_invoices to authenticated;
grant select on public.fee_payments to authenticated;

create function private.can_read_announcement(target_id uuid, target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.announcements a
    join public.memberships m on m.organization_id = a.organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
    where a.id = target_id and a.organization_id = target_org
      and (
        private.has_org_role(target_org, array['owner','administrator','principal']::public.app_role[])
        or (a.status = 'published' and m.role = any(a.audience) and (a.campus_id is null or a.campus_id = m.campus_id) and (a.expires_at is null or a.expires_at > now()))
      )
  )
$$;

create function private.can_submit_homework(target_homework uuid, target_student uuid, target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_org_role(target_org,array['parent','student']::public.app_role[])
    and private.can_read_student(target_student, target_org)
    and exists (
      select 1 from public.homework_assignments h
      join public.homework_classes hc on hc.homework_id = h.id and hc.organization_id = h.organization_id
      join public.class_enrollments e on e.class_id = hc.class_id and e.organization_id = hc.organization_id
      where h.id = target_homework and h.organization_id = target_org and h.status = 'published'
        and e.student_id = target_student and e.status = 'active'
    )
$$;

create function private.can_read_homework(target_homework uuid, target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_org_role(target_org, array['owner','administrator','principal','teacher','staff']::public.app_role[])
    or exists (
      select 1 from public.homework_assignments h
      join public.homework_classes hc on hc.homework_id=h.id and hc.organization_id=h.organization_id
      join public.class_enrollments e on e.class_id=hc.class_id and e.organization_id=hc.organization_id
      where h.id=target_homework and h.organization_id=target_org and h.status='published' and e.status='active'
        and private.can_read_student(e.student_id,target_org)
    )
$$;

revoke execute on function private.can_read_announcement(uuid,uuid), private.can_submit_homework(uuid,uuid,uuid), private.can_read_homework(uuid,uuid) from public, anon;
grant execute on function private.can_read_announcement(uuid,uuid), private.can_submit_homework(uuid,uuid,uuid), private.can_read_homework(uuid,uuid) to authenticated;

create policy announcements_read on public.announcements for select to authenticated using (private.can_read_announcement(id, organization_id));
create policy announcements_insert on public.announcements for insert to authenticated with check (created_by = (select auth.uid()) and private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy announcements_update on public.announcements for update to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]) or created_by = (select auth.uid())) with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));

create policy receipts_read on public.announcement_receipts for select to authenticated using (user_id = (select auth.uid()) or private.has_org_role(organization_id, array['owner','administrator','principal']::public.app_role[]));
create policy receipts_insert on public.announcement_receipts for insert to authenticated with check (user_id = (select auth.uid()) and private.can_read_announcement(announcement_id, organization_id));
create policy receipts_update on public.announcement_receipts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and private.can_read_announcement(announcement_id, organization_id));

create policy leave_read on public.leave_requests for select to authenticated using (
  private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[])
  or requested_by = (select auth.uid())
  or (student_id is not null and private.can_read_student(student_id, organization_id))
  or (staff_id is not null and exists(select 1 from public.staff_profiles s where s.id=staff_id and s.user_id=(select auth.uid())))
);
create policy leave_insert on public.leave_requests for insert to authenticated with check (
  requested_by = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null and (
    (student_id is not null and private.can_read_student(student_id, organization_id))
    or (staff_id is not null and exists(select 1 from public.staff_profiles s where s.id=staff_id and s.user_id=(select auth.uid())))
  )
);
create policy leave_update on public.leave_requests for update to authenticated using (
  private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]) or (requested_by = (select auth.uid()) and status = 'pending')
) with check (
  private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]) or (requested_by = (select auth.uid()) and status = 'cancelled')
);

create policy submissions_read on public.homework_submissions for select to authenticated using (
  private.can_submit_homework(homework_id, student_id, organization_id)
  or exists(select 1 from public.homework_assignments h join public.homework_classes hc on hc.homework_id=h.id join public.class_enrollments e on e.class_id=hc.class_id where h.id=homework_submissions.homework_id and e.student_id=homework_submissions.student_id and private.can_assign_homework(h.id,hc.class_id,homework_submissions.organization_id))
);
create policy submissions_insert on public.homework_submissions for insert to authenticated with check (submitted_by = (select auth.uid()) and private.can_submit_homework(homework_id, student_id, organization_id));
create policy submissions_update on public.homework_submissions for update to authenticated using (
  private.can_submit_homework(homework_id, student_id, organization_id)
  or exists(select 1 from public.homework_assignments h join public.homework_classes hc on hc.homework_id=h.id join public.class_enrollments e on e.class_id=hc.class_id where h.id=homework_submissions.homework_id and e.student_id=homework_submissions.student_id and private.can_assign_homework(h.id,hc.class_id,homework_submissions.organization_id))
) with check (organization_id in (select private.user_org_ids()));

create function private.protect_homework_submission() returns trigger language plpgsql set search_path='' as $$
declare teacher_access boolean; begin
  if tg_op = 'INSERT' then
    if new.submitted_by <> auth.uid() or new.status not in ('submitted','completed') or new.feedback is not null or new.reviewed_by is not null or new.reviewed_at is not null then raise exception 'Invalid student submission'; end if;
    return new;
  end if;
  select exists(select 1 from public.homework_classes hc where hc.homework_id=new.homework_id and private.can_assign_homework(new.homework_id,hc.class_id,new.organization_id)) into teacher_access;
  if teacher_access then
    if new.response is distinct from old.response or new.submitted_by is distinct from old.submitted_by or new.submitted_at is distinct from old.submitted_at then raise exception 'Teachers cannot alter a student response'; end if;
    if new.status not in ('returned','completed') then raise exception 'Choose returned or completed when reviewing'; end if;
  else
    if new.feedback is distinct from old.feedback or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then raise exception 'Students cannot alter teacher feedback'; end if;
    if new.submitted_by <> auth.uid() or new.status not in ('submitted','completed') then raise exception 'Invalid student submission update'; end if;
  end if;
  return new;
end $$;
create trigger protect_homework_submission before insert or update on public.homework_submissions for each row execute function private.protect_homework_submission();
revoke all on function private.protect_homework_submission() from public,anon,authenticated;

create policy invoices_read on public.fee_invoices for select to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]) or private.can_read_student(student_id, organization_id));
create policy invoices_insert on public.fee_invoices for insert to authenticated with check (created_by = (select auth.uid()) and private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy invoices_update on public.fee_invoices for update to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[])) with check (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]));
create policy payments_read on public.fee_payments for select to authenticated using (private.has_org_role(organization_id, array['owner','administrator','principal','staff']::public.app_role[]) or exists(select 1 from public.fee_invoices i where i.id=fee_payments.invoice_id and private.can_read_student(i.student_id,i.organization_id)));

-- Family users can read only published work assigned to a linked active student.
drop policy homework_read_org on public.homework_assignments;
create policy homework_read on public.homework_assignments for select to authenticated using (
  private.can_read_homework(id,organization_id)
);
drop policy homework_classes_read_org on public.homework_classes;
create policy homework_classes_read on public.homework_classes for select to authenticated using (
  private.can_read_homework(homework_id,organization_id)
);
drop policy assessments_read_staff on public.assessments;
create policy assessments_read on public.assessments for select to authenticated using (
  private.can_teach_class_subject(class_subject_id, organization_id)
  or (status='published' and exists(select 1 from public.class_subjects cs join public.class_enrollments e on e.class_id=cs.class_id and e.organization_id=cs.organization_id where cs.id=assessments.class_subject_id and e.status='active' and private.can_read_student(e.student_id,assessments.organization_id)))
);

-- Family attendance history is limited to sessions containing a linked student.
drop policy session_privacy on public.attendance_sessions;
create policy session_privacy on public.attendance_sessions as restrictive for select to authenticated using (
  private.has_org_role(organization_id,array['owner','administrator','principal','teacher','staff']::public.app_role[])
  or exists(select 1 from public.class_enrollments e where e.class_id=attendance_sessions.class_id and e.organization_id=attendance_sessions.organization_id and e.status='active' and private.can_read_student(e.student_id,attendance_sessions.organization_id))
);

create function private.protect_fee_invoice() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' and (new.paid_amount<>0 or new.status<>'due') then raise exception 'New invoices must start unpaid'; end if;
  if tg_op='UPDATE' and (new.paid_amount is distinct from old.paid_amount or new.status is distinct from old.status) and coalesce(current_setting('northstar.recording_payment',true),'')<>'on' then raise exception 'Use the controlled payment workflow to change a balance'; end if;
  return new;
end $$;
create trigger protect_fee_invoice before insert or update on public.fee_invoices for each row execute function private.protect_fee_invoice();
revoke all on function private.protect_fee_invoice() from public,anon,authenticated;

create function public.record_fee_payment(p_invoice uuid, p_amount numeric, p_method text, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invoice public.fee_invoices; payment_id uuid; new_total numeric; begin
  select * into strict invoice from public.fee_invoices where id=p_invoice for update;
  if not private.has_org_role(invoice.organization_id,array['owner','administrator','principal','staff']::public.app_role[]) then raise exception 'Finance access required'; end if;
  if invoice.status in ('paid','waived','cancelled') then raise exception 'This invoice cannot accept a payment'; end if;
  if p_amount <= 0 or invoice.paid_amount + p_amount > invoice.amount then raise exception 'Payment exceeds the outstanding balance'; end if;
  if p_method not in ('cash','bank_transfer','upi','cheque','card','online_gateway') then raise exception 'Invalid payment method'; end if;
  insert into public.fee_payments(organization_id,invoice_id,amount,method,reference,recorded_by)
  values(invoice.organization_id,invoice.id,p_amount,p_method,nullif(trim(p_reference),''),auth.uid()) returning id into payment_id;
  new_total := invoice.paid_amount + p_amount;
  perform set_config('northstar.recording_payment','on',true);
  update public.fee_invoices set paid_amount=new_total,status=case when new_total=amount then 'paid' else 'partial' end where id=invoice.id;
  return payment_id;
end $$;
revoke all on function public.record_fee_payment(uuid,numeric,text,text) from public,anon;
grant execute on function public.record_fee_payment(uuid,numeric,text,text) to authenticated;

do $$ declare t text; begin
  foreach t in array array['announcements','announcement_receipts','leave_requests','homework_submissions','fee_invoices','fee_payments'] loop
    execute format('create policy active_membership_required on public.%I as restrictive for all to authenticated using (organization_id in (select private.user_org_ids())) with check (organization_id in (select private.user_org_ids()))',t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['announcements','leave_requests','homework_submissions','fee_invoices','fee_payments'] loop
    execute format('create trigger audit_mutation after insert or update on public.%I for each row execute function private.audit_mutation()',t);
  end loop;
end $$;

comment on table public.announcements is 'Targeted in-app school notices with optional acknowledgements.';
comment on table public.leave_requests is 'Student and staff leave requests reviewed through one operations queue.';
comment on table public.homework_submissions is 'One learner response and review state per homework assignment.';
comment on table public.fee_invoices is 'Student fee dues and offline collection status; gateway settlement is intentionally separate.';
