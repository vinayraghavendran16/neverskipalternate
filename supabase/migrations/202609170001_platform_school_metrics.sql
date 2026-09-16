-- One bounded portfolio query for school-level operational metrics.
create or replace function public.platform_school_metrics(p_org uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'students_total',(select count(*) from public.students where organization_id=p_org),
    'students_active',(select count(*) from public.students where organization_id=p_org and status='active'),
    'staff_total',(select count(*) from public.staff_profiles where organization_id=p_org),
    'staff_active',(select count(*) from public.staff_profiles where organization_id=p_org and status='active'),
    'teachers_active',(select count(*) from public.staff_profiles where organization_id=p_org and status='active' and designation~*'(teacher|faculty|educator)'),
    'guardians_active',(select count(*) from public.guardians where organization_id=p_org and status='active'),
    'active_accounts',(select count(*) from public.memberships where organization_id=p_org and status='active'),
    'owners',(select count(*) from public.memberships where organization_id=p_org and status='active' and role='owner'),
    'administrators',(select count(*) from public.memberships where organization_id=p_org and status='active' and role in ('administrator','principal')),
    'classes',(select count(*) from public.classes where organization_id=p_org),
    'subjects',(select count(*) from public.subjects where organization_id=p_org and status='active'),
    'assessments',(select count(*) from public.assessments where organization_id=p_org),
    'homework',(select count(*) from public.homework_assignments where organization_id=p_org),
    'attendance_sessions',(select count(*) from public.attendance_sessions where organization_id=p_org),
    'attendance_records',(select count(*) from public.attendance_records where organization_id=p_org),
    'present_records',(select count(*) from public.attendance_records where organization_id=p_org and status='present'),
    'announcements',(select count(*) from public.announcements where organization_id=p_org and status='published'),
    'notifications',(select count(*) from public.notifications where organization_id=p_org),
    'notifications_read',(select count(*) from public.notifications where organization_id=p_org and read_at is not null),
    'deliveries',(select count(*) from public.notification_deliveries where organization_id=p_org),
    'deliveries_completed',(select count(*) from public.notification_deliveries where organization_id=p_org and status='delivered'),
    'fees_billed',coalesce((select sum(amount) from public.fee_invoices where organization_id=p_org),0),
    'fees_collected',coalesce((select sum(paid_amount) from public.fee_invoices where organization_id=p_org),0),
    'pending_approvals',(
      (select count(*) from public.leave_requests where organization_id=p_org and status='pending')+
      (select count(*) from public.attendance_corrections where organization_id=p_org and status='pending')
    ),
    'transport_routes',(select count(*) from public.transport_routes where organization_id=p_org and status='active'),
    'open_incidents',(select count(*) from public.operational_incidents where organization_id=p_org and status<>'resolved'),
    'workflow_events',(select count(*) from public.audit_events where organization_id=p_org)
  )
$$;

revoke all on function public.platform_school_metrics(uuid) from public,anon,authenticated;
grant execute on function public.platform_school_metrics(uuid) to service_role;
comment on function public.platform_school_metrics(uuid) is 'Service-only aggregate used by the platform school KPI tab.';
