-- Platform portfolio, commercial tracking, multi-branch provisioning and branding.

alter table public.organizations
  add column legal_name text,
  add column website_url text,
  add column logo_url text,
  add column school_type text not null default 'day_school'
    check (school_type in ('preschool','day_school','day_boarding','boarding','college','other')),
  add column education_board text,
  add column established_year integer check (established_year is null or established_year between 1800 and 2200),
  add column affiliation_number text,
  add column primary_email text,
  add column primary_phone text,
  add column onboarding_stage text not null default 'invited'
    check (onboarding_stage in ('invited','profile','data_import','training','live','paused')),
  add column go_live_on date,
  add column customer_success_owner text;

alter table public.campuses
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column state text,
  add column postal_code text,
  add column country text not null default 'India',
  add column latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  add column longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  add column email text,
  add column phone text,
  add column status text not null default 'active' check (status in ('planned','active','inactive'));

create table public.organization_commercials (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_name text not null default 'Standard',
  billing_cycle text not null default 'annual' check (billing_cycle in ('monthly','quarterly','annual')),
  recurring_amount numeric(14,2) not null default 0 check (recurring_amount >= 0),
  implementation_fee numeric(14,2) not null default 0 check (implementation_fee >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  contract_status text not null default 'trial' check (contract_status in ('trial','active','paused','expired')),
  contract_starts_on date,
  contract_ends_on date,
  licensed_students integer check (licensed_students is null or licensed_students >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contract_ends_on is null or contract_starts_on is null or contract_ends_on >= contract_starts_on)
);

create table public.organization_owner_profiles (
  membership_id uuid primary key references public.memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_owner_profiles_org_idx on public.organization_owner_profiles(organization_id);
create trigger organization_commercials_updated_at before update on public.organization_commercials for each row execute function private.set_updated_at();
create trigger organization_owner_profiles_updated_at before update on public.organization_owner_profiles for each row execute function private.set_updated_at();

alter table public.organization_commercials enable row level security;
alter table public.organization_owner_profiles enable row level security;
revoke all on public.organization_commercials, public.organization_owner_profiles from public, anon, authenticated;
grant all on public.organization_commercials, public.organization_owner_profiles to service_role;

insert into storage.buckets(id,name,public,file_size_limit)
values('brand-assets','brand-assets',true,2097152)
on conflict(id) do update set public=true,file_size_limit=2097152;

create or replace function public.platform_create_school_portfolio(
  p_name text,
  p_slug text,
  p_legal_name text,
  p_website_url text,
  p_logo_url text,
  p_school_type text,
  p_education_board text,
  p_established_year integer,
  p_affiliation_number text,
  p_primary_email text,
  p_primary_phone text,
  p_customer_success_owner text,
  p_branches jsonb,
  p_owners jsonb,
  p_plan_name text,
  p_billing_cycle text,
  p_recurring_amount numeric,
  p_implementation_fee numeric,
  p_contract_status text,
  p_contract_starts_on date,
  p_contract_ends_on date,
  p_licensed_students integer,
  p_actor_user uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  school_id uuid;
  owner_record record;
  membership_id uuid;
begin
  if p_actor_user is null or not exists(select 1 from auth.users where id=p_actor_user) then
    raise exception 'A valid platform operator is required';
  end if;
  if char_length(trim(p_name)) not between 2 and 160 or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid school identity';
  end if;
  if p_school_type not in ('preschool','day_school','day_boarding','boarding','college','other')
    or p_billing_cycle not in ('monthly','quarterly','annual')
    or p_contract_status not in ('trial','active','paused','expired') then
    raise exception 'Invalid portfolio classification';
  end if;
  if jsonb_typeof(p_branches) <> 'array' or jsonb_array_length(p_branches) = 0
    or jsonb_typeof(p_owners) <> 'array' or jsonb_array_length(p_owners) = 0 then
    raise exception 'At least one branch and owner are required';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_branches) as b(name text,code text,address_line1 text,city text,state text,postal_code text,latitude numeric,longitude numeric)
    where char_length(trim(b.name)) not between 2 and 160 or char_length(trim(b.code)) not between 2 and 24
      or nullif(trim(b.address_line1),'') is null or nullif(trim(b.city),'') is null or nullif(trim(b.state),'') is null
      or (b.latitude is not null and b.latitude not between -90 and 90)
      or (b.longitude is not null and b.longitude not between -180 and 180)
  ) or (select count(*) from jsonb_to_recordset(p_branches) as b(code text)) <>
       (select count(distinct upper(trim(code))) from jsonb_to_recordset(p_branches) as b(code text)) then
    raise exception 'Invalid or duplicate branch details';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_owners) as o(user_id uuid)
    where o.user_id is null or not exists(select 1 from auth.users u where u.id=o.user_id)
  ) or (select count(*) from jsonb_to_recordset(p_owners) as o(user_id uuid)) <>
       (select count(distinct user_id) from jsonb_to_recordset(p_owners) as o(user_id uuid)) then
    raise exception 'Invalid or duplicate owner accounts';
  end if;

  perform set_config('request.jwt.claim.sub','',true);
  insert into public.organizations(
    name,slug,legal_name,website_url,logo_url,school_type,education_board,established_year,
    affiliation_number,primary_email,primary_phone,onboarding_stage,customer_success_owner
  ) values (
    trim(p_name),p_slug,nullif(trim(p_legal_name),''),nullif(trim(p_website_url),''),nullif(trim(p_logo_url),''),p_school_type,
    nullif(trim(p_education_board),''),p_established_year,nullif(trim(p_affiliation_number),''),nullif(trim(p_primary_email),''),
    nullif(trim(p_primary_phone),''),'invited',nullif(trim(p_customer_success_owner),'')
  ) returning id into school_id;

  insert into public.campuses(
    organization_id,name,code,address_line1,address_line2,city,state,postal_code,country,latitude,longitude,email,phone
  ) select school_id,trim(b.name),upper(trim(b.code)),trim(b.address_line1),nullif(trim(b.address_line2),''),trim(b.city),trim(b.state),
    nullif(trim(b.postal_code),''),coalesce(nullif(trim(b.country),''),'India'),b.latitude,b.longitude,nullif(trim(b.email),''),nullif(trim(b.phone),'')
  from jsonb_to_recordset(p_branches) as b(name text,code text,address_line1 text,address_line2 text,city text,state text,postal_code text,country text,latitude numeric,longitude numeric,email text,phone text);

  for owner_record in select * from jsonb_to_recordset(p_owners) as o(user_id uuid,job_title text,phone text,is_primary boolean)
  loop
    insert into public.memberships(organization_id,campus_id,user_id,role,status)
      values(school_id,null,owner_record.user_id,'owner','active') returning id into membership_id;
    insert into public.organization_owner_profiles(membership_id,organization_id,user_id,job_title,phone,is_primary)
      values(membership_id,school_id,owner_record.user_id,nullif(trim(owner_record.job_title),''),nullif(trim(owner_record.phone),''),coalesce(owner_record.is_primary,false));
  end loop;

  insert into public.organization_commercials(
    organization_id,plan_name,billing_cycle,recurring_amount,implementation_fee,contract_status,
    contract_starts_on,contract_ends_on,licensed_students
  ) values (
    school_id,coalesce(nullif(trim(p_plan_name),''),'Standard'),p_billing_cycle,coalesce(p_recurring_amount,0),
    coalesce(p_implementation_fee,0),p_contract_status,p_contract_starts_on,p_contract_ends_on,p_licensed_students
  );

  insert into public.audit_events(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(school_id,p_actor_user,'organizations.platform_portfolio_created','organizations',school_id::text,
    jsonb_build_object('branch_count',jsonb_array_length(p_branches),'owner_count',jsonb_array_length(p_owners)));
  return school_id;
end;
$$;

revoke all on function public.platform_create_school_portfolio(text,text,text,text,text,text,text,integer,text,text,text,text,jsonb,jsonb,text,text,numeric,numeric,text,date,date,integer,uuid) from public,anon,authenticated;
grant execute on function public.platform_create_school_portfolio(text,text,text,text,text,text,text,integer,text,text,text,text,jsonb,jsonb,text,text,numeric,numeric,text,date,date,integer,uuid) to service_role;

comment on table public.organization_commercials is 'Service-only subscription and contract facts used for portfolio ARR reporting.';
comment on table public.organization_owner_profiles is 'Service-only school owner contact and accountability metadata.';
