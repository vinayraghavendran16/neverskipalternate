-- Formal academic records: templates, reporting periods, report cards and subject narratives.

create table public.report_card_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  title text not null check (char_length(title) between 2 and 160),
  grading_scale jsonb not null default '[{"grade":"A","label":"Excellent"},{"grade":"B","label":"Strong"},{"grade":"C","label":"Secure"},{"grade":"D","label":"Developing"}]'::jsonb,
  show_percentage boolean not null default true,
  show_attendance boolean not null default true,
  show_teacher_comments boolean not null default true,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name),
  check (jsonb_typeof(grading_scale) = 'array' and jsonb_array_length(grading_scale) between 1 and 20)
);

create table public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  template_id uuid not null references public.report_card_templates(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('draft','open','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (academic_year_id, name),
  constraint reporting_period_year_org_fk foreign key (academic_year_id, organization_id) references public.academic_years(id, organization_id),
  constraint reporting_period_template_org_fk foreign key (template_id, organization_id) references public.report_card_templates(id, organization_id),
  check (ends_on >= starts_on)
);

create table public.report_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  period_id uuid not null references public.reporting_periods(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  template_id uuid not null references public.report_card_templates(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','submitted','approved','published')),
  overall_comment text check (overall_comment is null or char_length(overall_comment) <= 1500),
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (period_id, student_id),
  constraint report_card_period_org_fk foreign key (period_id, organization_id) references public.reporting_periods(id, organization_id),
  constraint report_card_class_org_fk foreign key (class_id, organization_id) references public.classes(id, organization_id),
  constraint report_card_student_org_fk foreign key (student_id, organization_id) references public.students(id, organization_id),
  constraint report_card_template_org_fk foreign key (template_id, organization_id) references public.report_card_templates(id, organization_id)
);

create table public.report_card_subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  report_card_id uuid not null references public.report_cards(id) on delete cascade,
  class_subject_id uuid not null references public.class_subjects(id) on delete restrict,
  grade text check (grade is null or char_length(grade) <= 24),
  percentage numeric(5,2) check (percentage is null or percentage between 0 and 100),
  teacher_comment text check (teacher_comment is null or char_length(teacher_comment) <= 1000),
  updated_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (report_card_id, class_subject_id),
  constraint report_subject_card_org_fk foreign key (report_card_id, organization_id) references public.report_cards(id, organization_id),
  constraint report_subject_allocation_org_fk foreign key (class_subject_id, organization_id) references public.class_subjects(id, organization_id)
);

create index reporting_periods_org_dates_idx on public.reporting_periods(organization_id, starts_on desc);
create index report_cards_period_class_idx on public.report_cards(period_id, class_id, status);
create index report_cards_student_idx on public.report_cards(student_id, published_at desc);
create index report_card_subjects_card_idx on public.report_card_subjects(report_card_id, class_subject_id);

create trigger report_card_templates_updated_at before update on public.report_card_templates for each row execute function private.set_updated_at();
create trigger reporting_periods_updated_at before update on public.reporting_periods for each row execute function private.set_updated_at();
create trigger report_cards_updated_at before update on public.report_cards for each row execute function private.set_updated_at();
create trigger report_card_subjects_updated_at before update on public.report_card_subjects for each row execute function private.set_updated_at();

alter table public.report_card_templates enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.report_cards enable row level security;
alter table public.report_card_subjects enable row level security;
grant select, insert, update on public.report_card_templates, public.reporting_periods, public.report_cards, public.report_card_subjects to authenticated;

create function private.can_manage_report_class(target_class_id uuid, target_org_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.has_org_role(target_org_id,array['owner','administrator','principal','staff']::public.app_role[])
  or (private.has_org_role(target_org_id,array['teacher']::public.app_role[]) and exists(
    select 1 from public.class_subjects cs join public.staff_profiles sp on sp.id=cs.teacher_staff_id and sp.organization_id=cs.organization_id
    where cs.class_id=target_class_id and cs.organization_id=target_org_id and sp.user_id=(select auth.uid()) and sp.status='active'
  ))
$$;
revoke execute on function private.can_manage_report_class(uuid,uuid) from public,anon;
grant execute on function private.can_manage_report_class(uuid,uuid) to authenticated;

create policy report_templates_read on public.report_card_templates for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy report_templates_manage on public.report_card_templates for all to authenticated using (private.has_org_role(organization_id,array['owner','administrator','principal']::public.app_role[])) with check (private.has_org_role(organization_id,array['owner','administrator','principal']::public.app_role[]));
create policy reporting_periods_read on public.reporting_periods for select to authenticated using (organization_id in (select private.user_org_ids()));
create policy reporting_periods_manage on public.reporting_periods for all to authenticated using (private.has_org_role(organization_id,array['owner','administrator','principal']::public.app_role[])) with check (private.has_org_role(organization_id,array['owner','administrator','principal']::public.app_role[]));

create policy report_cards_read on public.report_cards for select to authenticated using (
  private.can_manage_report_class(class_id,organization_id)
  or (status='published' and private.can_read_student(student_id,organization_id))
);
create policy report_cards_insert on public.report_cards for insert to authenticated with check (private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));
create policy report_cards_update on public.report_cards for update to authenticated using (private.can_manage_report_class(class_id,organization_id)) with check (private.can_manage_report_class(class_id,organization_id));

create policy report_subjects_read on public.report_card_subjects for select to authenticated using (exists(
  select 1 from public.report_cards rc where rc.id=report_card_id and rc.organization_id=organization_id
  and (private.can_manage_report_class(rc.class_id,rc.organization_id) or (rc.status='published' and private.can_read_student(rc.student_id,rc.organization_id)))
));
create policy report_subjects_insert on public.report_card_subjects for insert to authenticated with check (
  private.can_teach_class_subject(class_subject_id,organization_id)
  and exists(select 1 from public.report_cards rc where rc.id=report_card_id and rc.organization_id=organization_id and rc.status='draft')
);
create policy report_subjects_update on public.report_card_subjects for update to authenticated using (
  private.can_teach_class_subject(class_subject_id,organization_id)
  and exists(select 1 from public.report_cards rc where rc.id=report_card_id and rc.organization_id=organization_id and rc.status='draft')
) with check (private.can_teach_class_subject(class_subject_id,organization_id));

create function private.protect_report_card_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.organization_id<>old.organization_id or new.period_id<>old.period_id or new.class_id<>old.class_id
    or new.student_id<>old.student_id or new.template_id<>old.template_id or new.created_by<>old.created_by then
    raise exception 'Report-card identity cannot be changed';
  end if;
  if new.status<>old.status then
    if new.overall_comment is distinct from old.overall_comment then raise exception 'Save comments before changing workflow status'; end if;
    if old.status='draft' and new.status='submitted' then
      if not private.can_manage_report_class(old.class_id,old.organization_id) then raise exception 'Report submission access denied'; end if;
      new.submitted_at=now(); new.reviewed_by=null; new.reviewed_at=null; new.published_at=null;
    elsif old.status='submitted' and new.status='approved' then
      if not private.has_org_role(old.organization_id,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Report approval access denied'; end if;
      new.reviewed_by=auth.uid(); new.reviewed_at=now(); new.published_at=null;
    elsif old.status='approved' and new.status='published' then
      if not private.has_org_role(old.organization_id,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Report publication access denied'; end if;
      new.published_at=now();
    else raise exception 'Invalid report-card workflow transition'; end if;
  else
    if old.status<>'draft' then raise exception 'Submitted report cards are locked'; end if;
    if not private.has_org_role(old.organization_id,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Overall comment access denied'; end if;
    if new.submitted_at is distinct from old.submitted_at or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at or new.published_at is distinct from old.published_at then
      raise exception 'Workflow metadata cannot be edited directly';
    end if;
  end if;
  return new;
end $$;

create trigger protect_report_card_update before update on public.report_cards
for each row execute function private.protect_report_card_update();

create function public.initialize_report_cards(p_period uuid,p_class uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare target_org uuid; target_template uuid; created_count integer;
begin
  select rp.organization_id,rp.template_id into strict target_org,target_template from public.reporting_periods rp
  join public.classes c on c.academic_year_id=rp.academic_year_id and c.organization_id=rp.organization_id
  where rp.id=p_period and c.id=p_class and rp.status in ('draft','open');
  if not private.has_org_role(target_org,array['owner','administrator','principal','staff']::public.app_role[]) then raise exception 'Report setup access denied'; end if;
  insert into public.report_cards(organization_id,period_id,class_id,student_id,template_id,created_by)
  select target_org,p_period,p_class,e.student_id,target_template,auth.uid() from public.class_enrollments e
  where e.class_id=p_class and e.organization_id=target_org and e.status='active'
  on conflict(period_id,student_id) do nothing;
  get diagnostics created_count = row_count;
  insert into public.report_card_subjects(organization_id,report_card_id,class_subject_id,updated_by)
  select target_org,rc.id,cs.id,auth.uid() from public.report_cards rc cross join public.class_subjects cs
  where rc.period_id=p_period and rc.class_id=p_class and cs.class_id=p_class and cs.organization_id=target_org
  on conflict(report_card_id,class_subject_id) do nothing;
  return created_count;
end $$;

create function public.save_report_overall_comments(p_period uuid,p_class uuid,p_rows jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare target_org uuid; saved_count integer;
begin
  select organization_id into strict target_org from public.reporting_periods where id=p_period;
  if not private.has_org_role(target_org,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Comment access denied'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid comment register'; end if;
  if exists(select 1 from jsonb_to_recordset(p_rows) as r(report_card_id uuid,overall_comment text)
    where r.overall_comment is not null and char_length(r.overall_comment)>1500) then raise exception 'Invalid report comment'; end if;
  update public.report_cards rc set overall_comment=nullif(btrim(r.overall_comment),''),updated_at=now()
  from jsonb_to_recordset(p_rows) as r(report_card_id uuid,overall_comment text)
  where rc.id=r.report_card_id and rc.period_id=p_period and rc.class_id=p_class and rc.organization_id=target_org and rc.status='draft';
  get diagnostics saved_count = row_count;
  if saved_count<>jsonb_array_length(p_rows) then raise exception 'Report roster changed or is locked'; end if;
  return saved_count;
end $$;

create function public.save_report_subject_register(p_period uuid,p_class uuid,p_class_subject uuid,p_rows jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare target_org uuid; saved_count integer;
begin
  select organization_id into strict target_org from public.class_subjects where id=p_class_subject and class_id=p_class;
  if not private.can_teach_class_subject(p_class_subject,target_org) then raise exception 'Subject access denied'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>1000 then raise exception 'Invalid subject register'; end if;
  if exists(select 1 from jsonb_to_recordset(p_rows) as r(report_card_id uuid,grade text,percentage numeric,teacher_comment text)
    where char_length(r.grade)>24 or r.percentage<0 or r.percentage>100 or char_length(r.teacher_comment)>1000) then raise exception 'Invalid report value'; end if;
  update public.report_card_subjects rcs set grade=nullif(r.grade,''),percentage=r.percentage,teacher_comment=nullif(r.teacher_comment,''),updated_by=auth.uid(),updated_at=now()
  from jsonb_to_recordset(p_rows) as r(report_card_id uuid,grade text,percentage numeric,teacher_comment text)
  join public.report_cards rc on rc.id=r.report_card_id and rc.period_id=p_period and rc.class_id=p_class and rc.organization_id=target_org and rc.status='draft'
  where rcs.report_card_id=rc.id and rcs.class_subject_id=p_class_subject and rcs.organization_id=target_org;
  get diagnostics saved_count = row_count;
  if saved_count<>jsonb_array_length(p_rows) then raise exception 'Report roster changed or is locked'; end if;
  return saved_count;
end $$;

create function public.set_report_class_status(p_period uuid,p_class uuid,p_status text)
returns integer language plpgsql security definer set search_path='' as $$
declare target_org uuid; changed integer;
begin
  select organization_id into strict target_org from public.reporting_periods where id=p_period;
  if p_status='submitted' then
    if not private.can_manage_report_class(p_class,target_org) then raise exception 'Report class access denied'; end if;
    if not exists(select 1 from public.report_card_subjects rcs join public.report_cards rc on rc.id=rcs.report_card_id where rc.period_id=p_period and rc.class_id=p_class) then raise exception 'No subject reports are configured'; end if;
    if exists(select 1 from public.report_card_subjects rcs join public.report_cards rc on rc.id=rcs.report_card_id where rc.period_id=p_period and rc.class_id=p_class and (rcs.grade is null or btrim(rcs.grade)='')) then raise exception 'Every subject needs a grade'; end if;
    update public.report_cards set status='submitted',submitted_at=now() where period_id=p_period and class_id=p_class and status='draft';
  elsif p_status='approved' then
    if not private.has_org_role(target_org,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Approval access denied'; end if;
    update public.report_cards set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where period_id=p_period and class_id=p_class and status='submitted';
  elsif p_status='published' then
    if not private.has_org_role(target_org,array['owner','administrator','principal']::public.app_role[]) then raise exception 'Publication access denied'; end if;
    update public.report_cards set status='published',published_at=now() where period_id=p_period and class_id=p_class and status='approved';
  else raise exception 'Invalid report status'; end if;
  get diagnostics changed = row_count;
  if changed=0 then raise exception 'No report cards were ready for this transition'; end if;
  if p_status='published' then
    with recipients as (
      select rc.id report_card_id,rc.organization_id,coalesce(s.preferred_name,s.first_name) student_name,s.user_id
      from public.report_cards rc join public.students s on s.id=rc.student_id and s.organization_id=rc.organization_id
      where rc.period_id=p_period and rc.class_id=p_class and rc.status='published' and s.user_id is not null
      union
      select rc.id,rc.organization_id,coalesce(s.preferred_name,s.first_name),gr.guardian_user_id
      from public.report_cards rc join public.students s on s.id=rc.student_id and s.organization_id=rc.organization_id
      join public.guardian_relationships gr on gr.student_id=rc.student_id and gr.organization_id=rc.organization_id
      where rc.period_id=p_period and rc.class_id=p_class and rc.status='published' and gr.guardian_user_id is not null
    ), created as (
      insert into public.notifications(organization_id,user_id,title,body,priority,href,in_app_enabled)
      select r.organization_id,r.user_id,'Report card published',r.student_name||'''s report card is ready.','normal','/dashboard/report-cards/'||r.report_card_id::text||'/print',
        coalesce((select np.enabled from public.notification_preferences np where np.organization_id=r.organization_id and np.user_id=r.user_id and np.channel='in_app'),true)
      from recipients r returning id,organization_id,user_id,in_app_enabled
    )
    insert into public.notification_deliveries(organization_id,notification_id,user_id,channel,status,attempts,idempotency_key,delivered_at)
    select c.organization_id,c.id,c.user_id,'in_app',case when c.in_app_enabled then 'delivered' else 'cancelled' end,
      case when c.in_app_enabled then 1 else 0 end,'report-card:'||c.id::text||':in_app',case when c.in_app_enabled then now() end
    from created c;
  end if;
  return changed;
end $$;

revoke execute on function public.initialize_report_cards(uuid,uuid) from public,anon;
revoke execute on function public.save_report_subject_register(uuid,uuid,uuid,jsonb) from public,anon;
revoke execute on function public.save_report_overall_comments(uuid,uuid,jsonb) from public,anon;
revoke execute on function public.set_report_class_status(uuid,uuid,text) from public,anon;
grant execute on function public.initialize_report_cards(uuid,uuid), public.save_report_subject_register(uuid,uuid,uuid,jsonb), public.save_report_overall_comments(uuid,uuid,jsonb), public.set_report_class_status(uuid,uuid,text) to authenticated;

comment on table public.report_cards is 'Formal student records; family visibility begins only after publication.';
comment on function public.set_report_class_status(uuid,uuid,text) is 'Enforces draft to submitted to approved to published class-level workflow.';

-- Tenant provisioning is exclusively a platform service operation.
revoke execute on function public.create_owned_school(text,text,text,text) from authenticated;
