-- Northstar School OS: shared calendar, transport operations and correction review.

create table public.school_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid references public.campuses(id) on delete restrict, title text not null check(char_length(title) between 1 and 180),
  description text check(description is null or char_length(description)<=3000), category text not null check(category in ('academic','exam','holiday','event','meeting')),
  starts_at timestamptz not null, ends_at timestamptz not null, audience public.app_role[] not null,
  status text not null default 'published' check(status in ('draft','published','cancelled')), created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id),
  constraint event_campus_org_fk foreign key(campus_id,organization_id) references public.campuses(id,organization_id), check(ends_at>starts_at), check(cardinality(audience)>0)
);
create table public.transport_vehicles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict, registration_number text not null, label text not null,
  capacity smallint not null check(capacity between 1 and 100), driver_name text, driver_phone text, status text not null default 'active' check(status in ('active','maintenance','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id), unique(organization_id,registration_number),
  constraint vehicle_campus_org_fk foreign key(campus_id,organization_id) references public.campuses(id,organization_id)
);
create table public.transport_routes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict, vehicle_id uuid references public.transport_vehicles(id) on delete set null,
  name text not null check(char_length(name) between 1 and 120), code text not null check(char_length(code) between 1 and 24),
  morning_departure time, afternoon_departure time, status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,organization_id), unique(organization_id,code),
  constraint route_campus_org_fk foreign key(campus_id,organization_id) references public.campuses(id,organization_id),
  constraint route_vehicle_org_fk foreign key(vehicle_id,organization_id) references public.transport_vehicles(id,organization_id)
);
create table public.transport_stops (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  route_id uuid not null references public.transport_routes(id) on delete cascade, name text not null check(char_length(name) between 1 and 160),
  stop_order smallint not null check(stop_order between 1 and 200), pickup_time time, drop_time time, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), unique(route_id,stop_order), constraint stop_route_org_fk foreign key(route_id,organization_id) references public.transport_routes(id,organization_id)
);
create table public.transport_assignments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade, route_id uuid not null references public.transport_routes(id) on delete restrict,
  stop_id uuid not null references public.transport_stops(id) on delete restrict, starts_on date not null default current_date, ends_on date,
  status text not null default 'active' check(status in ('active','paused','ended')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), constraint assignment_student_org_fk foreign key(student_id,organization_id) references public.students(id,organization_id),
  constraint assignment_route_org_fk foreign key(route_id,organization_id) references public.transport_routes(id,organization_id),
  constraint assignment_stop_org_fk foreign key(stop_id,organization_id) references public.transport_stops(id,organization_id), check(ends_on is null or ends_on>=starts_on)
);
create unique index transport_student_active_unique on public.transport_assignments(student_id) where status='active';
create table public.transport_alerts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete restrict,
  route_id uuid not null references public.transport_routes(id) on delete cascade, title text not null check(char_length(title) between 1 and 160),
  message text not null check(char_length(message) between 1 and 1000), severity text not null default 'delay' check(severity in ('info','delay','critical')),
  status text not null default 'active' check(status in ('active','resolved')), published_at timestamptz not null default now(), resolved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,organization_id), constraint alert_route_org_fk foreign key(route_id,organization_id) references public.transport_routes(id,organization_id)
);

create index events_org_start_idx on public.school_events(organization_id,starts_at);
create index routes_org_idx on public.transport_routes(organization_id,status);
create index stops_route_idx on public.transport_stops(route_id,stop_order);
create index assignments_route_idx on public.transport_assignments(route_id,status);
create index alerts_route_time_idx on public.transport_alerts(route_id,published_at desc);
alter table public.transport_vehicles add constraint vehicle_campus_identity unique(id,campus_id,organization_id);
alter table public.transport_routes drop constraint route_vehicle_org_fk;
alter table public.transport_routes add constraint route_vehicle_campus_fk foreign key(vehicle_id,campus_id,organization_id) references public.transport_vehicles(id,campus_id,organization_id);
create trigger events_updated_at before update on public.school_events for each row execute function private.set_updated_at();
create trigger vehicles_updated_at before update on public.transport_vehicles for each row execute function private.set_updated_at();
create trigger routes_updated_at before update on public.transport_routes for each row execute function private.set_updated_at();
create trigger stops_updated_at before update on public.transport_stops for each row execute function private.set_updated_at();
create trigger assignments_updated_at before update on public.transport_assignments for each row execute function private.set_updated_at();
create trigger alerts_updated_at before update on public.transport_alerts for each row execute function private.set_updated_at();

alter table public.school_events enable row level security; alter table public.transport_vehicles enable row level security; alter table public.transport_routes enable row level security;
alter table public.transport_stops enable row level security; alter table public.transport_assignments enable row level security; alter table public.transport_alerts enable row level security;
grant select,insert,update on public.school_events,public.transport_vehicles,public.transport_routes,public.transport_stops,public.transport_assignments,public.transport_alerts to authenticated;

create function private.can_read_route(target_route uuid,target_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.has_org_role(target_org,array['owner','administrator','principal','teacher','staff']::public.app_role[]) or exists(
  select 1 from public.transport_assignments a where a.route_id=target_route and a.organization_id=target_org and a.status='active' and private.can_read_student(a.student_id,target_org))
$$;
revoke execute on function private.can_read_route(uuid,uuid) from public,anon; grant execute on function private.can_read_route(uuid,uuid) to authenticated;
create policy events_read on public.school_events for select to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]) or (status='published' and exists(select 1 from public.memberships m where m.user_id=auth.uid() and m.organization_id=school_events.organization_id and m.status='active' and m.role=any(school_events.audience) and (school_events.campus_id is null or school_events.campus_id=m.campus_id))));
create policy events_manage on public.school_events for all to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[])) with check(created_by=auth.uid() and private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));
create policy vehicles_read on public.transport_vehicles for select to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','teacher','staff']::public.app_role[]) or exists(select 1 from public.transport_routes r where r.vehicle_id=transport_vehicles.id and private.can_read_route(r.id,r.organization_id)));
create policy routes_read on public.transport_routes for select to authenticated using(private.can_read_route(id,organization_id));
create policy stops_read on public.transport_stops for select to authenticated using(private.can_read_route(route_id,organization_id));
create policy assignments_read on public.transport_assignments for select to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','teacher','staff']::public.app_role[]) or private.can_read_student(student_id,organization_id));
create policy alerts_read on public.transport_alerts for select to authenticated using(private.can_read_route(route_id,organization_id));
do $$ declare t text; begin foreach t in array array['transport_vehicles','transport_routes','transport_stops','transport_assignments','transport_alerts'] loop execute format('create policy transport_manage on public.%I for all to authenticated using(private.has_org_role(organization_id,array[''owner'',''administrator'',''principal'',''staff'']::public.app_role[])) with check(private.has_org_role(organization_id,array[''owner'',''administrator'',''principal'',''staff'']::public.app_role[]))',t); end loop; end $$;
do $$ declare t text; begin foreach t in array array['school_events','transport_vehicles','transport_routes','transport_stops','transport_assignments','transport_alerts'] loop execute format('create policy active_membership_required on public.%I as restrictive for all to authenticated using(organization_id in (select private.user_org_ids())) with check(organization_id in (select private.user_org_ids()))',t); execute format('create trigger audit_mutation after insert or update on public.%I for each row execute function private.audit_mutation()',t); end loop; end $$;

create function private.validate_transport_assignment() returns trigger language plpgsql set search_path='' as $$
declare allowed_capacity integer;
begin
 if not exists(select 1 from public.transport_stops s where s.id=new.stop_id and s.route_id=new.route_id and s.organization_id=new.organization_id) then
  raise exception 'Stop does not belong to route';
 end if;
 if not exists(
  select 1 from public.transport_routes r
  join public.students s on s.id=new.student_id and s.organization_id=r.organization_id and s.campus_id=r.campus_id
  where r.id=new.route_id and r.organization_id=new.organization_id
 ) then
  raise exception 'Student and route must belong to the same campus';
 end if;
 select v.capacity into allowed_capacity
 from public.transport_routes r
 join public.transport_vehicles v on v.id=r.vehicle_id and v.organization_id=r.organization_id
 where r.id=new.route_id and r.organization_id=new.organization_id
 for update of v;
 if new.status='active' and allowed_capacity is not null and (
  select count(*) from public.transport_assignments a
  where a.route_id=new.route_id and a.status='active' and a.id<>new.id
 )>=allowed_capacity then
  raise exception 'Vehicle capacity reached';
 end if;
 return new;
end $$;
create trigger validate_transport_assignment before insert or update on public.transport_assignments for each row execute function private.validate_transport_assignment();
revoke all on function private.validate_transport_assignment() from public,anon,authenticated;

create function public.review_attendance_correction(p_id uuid,p_decision text) returns boolean language plpgsql security invoker set search_path='' as $$
declare c public.attendance_corrections; begin select * into strict c from public.attendance_corrections where id=p_id for update;
 if not private.has_org_role(c.organization_id,array['owner','administrator','principal','staff']::public.app_role[]) then raise exception 'Approval access required'; end if;
 if c.status<>'pending' or p_decision not in ('approved','rejected') then raise exception 'Correction is no longer pending'; end if;
 if p_decision='approved' then update public.attendance_records set status=c.requested_status,reason=c.reason,marked_at=now() where id=c.attendance_record_id; end if;
 update public.attendance_corrections set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=c.id; return true; end $$;
revoke all on function public.review_attendance_correction(uuid,text) from public,anon; grant execute on function public.review_attendance_correction(uuid,text) to authenticated;
drop policy attendance_corrections_update_admin on public.attendance_corrections;
create policy attendance_corrections_update_admin on public.attendance_corrections for update to authenticated using(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[])) with check(private.has_org_role(organization_id,array['owner','administrator','principal','staff']::public.app_role[]));

comment on table public.school_events is 'Role and campus targeted school calendar events.';
comment on table public.transport_alerts is 'In-app transport exceptions; external delivery is a separate integration.';
