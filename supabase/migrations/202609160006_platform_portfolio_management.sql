-- Platform-only management for existing school portfolios.

create or replace function public.platform_update_school_portfolio(
  p_org uuid,p_website_url text,p_logo_url text,p_school_type text,p_education_board text,
  p_established_year integer,p_affiliation_number text,p_primary_email text,p_primary_phone text,
  p_onboarding_stage text,p_go_live_on date,p_customer_success_owner text,p_plan_name text,
  p_billing_cycle text,p_recurring_amount numeric,p_implementation_fee numeric,p_contract_status text,
  p_contract_starts_on date,p_contract_ends_on date,p_licensed_students integer,p_actor_user uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.organizations where id=p_org) or not exists(select 1 from auth.users where id=p_actor_user) then raise exception 'Invalid school or operator'; end if;
  if p_school_type not in ('preschool','day_school','day_boarding','boarding','college','other') or p_onboarding_stage not in ('invited','profile','data_import','training','live','paused') or p_billing_cycle not in ('monthly','quarterly','annual') or p_contract_status not in ('trial','active','paused','expired') or coalesce(p_recurring_amount,-1)<0 or coalesce(p_implementation_fee,-1)<0 then raise exception 'Invalid portfolio details'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  update public.organizations set website_url=nullif(trim(p_website_url),''),logo_url=coalesce(nullif(trim(p_logo_url),''),logo_url),school_type=p_school_type,education_board=nullif(trim(p_education_board),''),established_year=p_established_year,affiliation_number=nullif(trim(p_affiliation_number),''),primary_email=nullif(trim(p_primary_email),''),primary_phone=nullif(trim(p_primary_phone),''),onboarding_stage=p_onboarding_stage,go_live_on=p_go_live_on,customer_success_owner=nullif(trim(p_customer_success_owner),'') where id=p_org;
  insert into public.organization_commercials(organization_id,plan_name,billing_cycle,recurring_amount,implementation_fee,contract_status,contract_starts_on,contract_ends_on,licensed_students)
  values(p_org,trim(p_plan_name),p_billing_cycle,p_recurring_amount,p_implementation_fee,p_contract_status,p_contract_starts_on,p_contract_ends_on,p_licensed_students)
  on conflict(organization_id) do update set plan_name=excluded.plan_name,billing_cycle=excluded.billing_cycle,recurring_amount=excluded.recurring_amount,implementation_fee=excluded.implementation_fee,contract_status=excluded.contract_status,contract_starts_on=excluded.contract_starts_on,contract_ends_on=excluded.contract_ends_on,licensed_students=excluded.licensed_students;
  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id) values(p_org,p_actor_user,'organizations.platform_portfolio_updated','organizations',p_org::text);
  return true;
end $$;

create or replace function public.platform_add_school_branches(p_org uuid,p_branches jsonb,p_actor_user uuid) returns integer language plpgsql security definer set search_path='' as $$
declare added integer;
begin
  if not exists(select 1 from public.organizations where id=p_org) or not exists(select 1 from auth.users where id=p_actor_user) then raise exception 'Invalid school or operator'; end if;
  if jsonb_typeof(p_branches)<>'array' or jsonb_array_length(p_branches)=0 or jsonb_array_length(p_branches)>50 then raise exception 'Invalid branch batch'; end if;
  if exists(select 1 from jsonb_to_recordset(p_branches) as b(name text,code text,address_line1 text,city text,state text,latitude numeric,longitude numeric) where char_length(trim(name)) not between 2 and 160 or char_length(trim(code)) not between 2 and 24 or nullif(trim(address_line1),'') is null or nullif(trim(city),'') is null or nullif(trim(state),'') is null or (latitude is not null and latitude not between -90 and 90) or (longitude is not null and longitude not between -180 and 180)) or (select count(*) from jsonb_to_recordset(p_branches) as b(code text))<>(select count(distinct upper(trim(code))) from jsonb_to_recordset(p_branches) as b(code text)) then raise exception 'Invalid or duplicate branch details'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  insert into public.campuses(organization_id,name,code,address_line1,city,state,postal_code,country,latitude,longitude,email,phone)
  select p_org,trim(name),upper(trim(code)),trim(address_line1),trim(city),trim(state),nullif(trim(postal_code),''),coalesce(nullif(trim(country),''),'India'),latitude,longitude,nullif(trim(email),''),nullif(trim(phone),'') from jsonb_to_recordset(p_branches) as b(name text,code text,address_line1 text,city text,state text,postal_code text,country text,latitude numeric,longitude numeric,email text,phone text);
  get diagnostics added=row_count;
  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id,metadata) values(p_org,p_actor_user,'campuses.platform_bulk_created','organizations',p_org::text,jsonb_build_object('count',added));return added;
end $$;

create or replace function public.platform_update_school_branch(p_org uuid,p_branch uuid,p_address_line1 text,p_city text,p_state text,p_postal_code text,p_latitude numeric,p_longitude numeric,p_email text,p_phone text,p_actor_user uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from auth.users where id=p_actor_user) or nullif(trim(p_address_line1),'') is null or nullif(trim(p_city),'') is null or nullif(trim(p_state),'') is null or (p_latitude is not null and p_latitude not between -90 and 90) or (p_longitude is not null and p_longitude not between -180 and 180) then raise exception 'Invalid branch details'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  update public.campuses set address_line1=trim(p_address_line1),city=trim(p_city),state=trim(p_state),postal_code=nullif(trim(p_postal_code),''),latitude=p_latitude,longitude=p_longitude,email=nullif(trim(p_email),''),phone=nullif(trim(p_phone),'') where id=p_branch and organization_id=p_org;
  if not found then raise exception 'Branch not found'; end if;
  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id) values(p_org,p_actor_user,'campuses.platform_location_updated','campuses',p_branch::text);return true;
end $$;

create or replace function public.platform_add_school_owners(p_org uuid,p_owners jsonb,p_actor_user uuid) returns integer language plpgsql security definer set search_path='' as $$
declare owner_record record;membership_id uuid;added integer:=0;
begin
  if not exists(select 1 from public.organizations where id=p_org) or not exists(select 1 from auth.users where id=p_actor_user) or jsonb_typeof(p_owners)<>'array' or jsonb_array_length(p_owners)=0 or jsonb_array_length(p_owners)>20 then raise exception 'Invalid school, operator or owner batch'; end if;
  if exists(select 1 from jsonb_to_recordset(p_owners) as o(user_id uuid) where user_id is null or not exists(select 1 from auth.users u where u.id=o.user_id)) or (select count(*) from jsonb_to_recordset(p_owners) as o(user_id uuid))<>(select count(distinct user_id) from jsonb_to_recordset(p_owners) as o(user_id uuid)) then raise exception 'Invalid or duplicate owner accounts'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  for owner_record in select * from jsonb_to_recordset(p_owners) as o(user_id uuid,job_title text,phone text,is_primary boolean) loop
    insert into public.memberships(organization_id,user_id,role,status) values(p_org,owner_record.user_id,'owner','active') on conflict(organization_id,user_id,role) do update set status='active' returning id into membership_id;
    insert into public.organization_owner_profiles(membership_id,organization_id,user_id,job_title,phone,is_primary) values(membership_id,p_org,owner_record.user_id,nullif(trim(owner_record.job_title),''),nullif(trim(owner_record.phone),''),coalesce(owner_record.is_primary,false)) on conflict(organization_id,user_id) do update set job_title=excluded.job_title,phone=excluded.phone,is_primary=excluded.is_primary;
    added:=added+1;
  end loop;
  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id,metadata) values(p_org,p_actor_user,'memberships.platform_owners_added','organizations',p_org::text,jsonb_build_object('count',added));return added;
end $$;

revoke all on function public.platform_update_school_portfolio(uuid,text,text,text,text,integer,text,text,text,text,date,text,text,text,numeric,numeric,text,date,date,integer,uuid) from public,anon,authenticated;
revoke all on function public.platform_add_school_branches(uuid,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.platform_update_school_branch(uuid,uuid,text,text,text,text,numeric,numeric,text,text,uuid) from public,anon,authenticated;
revoke all on function public.platform_add_school_owners(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.platform_update_school_portfolio(uuid,text,text,text,text,integer,text,text,text,text,date,text,text,text,numeric,numeric,text,date,date,integer,uuid) to service_role;
grant execute on function public.platform_add_school_branches(uuid,jsonb,uuid) to service_role;
grant execute on function public.platform_update_school_branch(uuid,uuid,text,text,text,text,numeric,numeric,text,text,uuid) to service_role;
grant execute on function public.platform_add_school_owners(uuid,jsonb,uuid) to service_role;
