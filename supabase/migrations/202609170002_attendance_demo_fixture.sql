-- Reversible, visibly-labelled attendance fixture for the Northstar Academy test tenant.
-- Every inserted person or academic item carries DEMO-ATT- or [Demo] so cleanup can be scoped safely.
do $$
declare
  org_id uuid; campus_id uuid; year_id uuid; class_a uuid; class_b uuid; student_id uuid; guardian_id uuid;
  teacher_one uuid; teacher_two uuid; i integer;
  first_names text[]:=array['Aanya','Aarav','Aditi','Advait','Anaya','Arjun','Diya','Ishaan','Kavya','Krish','Meera','Neel','Nisha','Pranav','Rhea','Rohan','Saanvi','Samarth','Sara','Shaurya','Tara','Ved','Vihaan','Zoya'];
  last_names text[]:=array['Sharma','Mehta','Rao','Nair','Kapoor','Iyer','Singh','Patel','Reddy','Gupta','Joshi','Verma','Bose','Menon','Malhotra','Das','Kulkarni','Jain','Khan','Bhat','Pillai','Chopra','Mishra','Ali'];
begin
  select id into org_id from public.organizations where slug='northstar-academy' and status='active';
  if org_id is null or exists(select 1 from public.students where organization_id=org_id and admission_number like 'DEMO-ATT-%') then return; end if;
  select id into campus_id from public.campuses where organization_id=org_id and status='active' order by created_at limit 1;
  if campus_id is null then raise exception 'Northstar Academy needs an active branch before demo attendance data can be created'; end if;
  select id into year_id from public.academic_years where organization_id=org_id and status='active' order by starts_on desc limit 1;
  if year_id is null then
    insert into public.academic_years(organization_id,name,starts_on,ends_on,status) values(org_id,'2026-27 Demo','2026-06-01','2027-03-31','active') returning id into year_id;
  end if;

  insert into public.staff_profiles(organization_id,campus_id,employee_number,first_name,last_name,designation,department,status)
  values(org_id,campus_id,'DEMO-ATT-T01','[Demo] Maya','Thomas','Class Teacher','Academics','active') returning id into teacher_one;
  insert into public.staff_profiles(organization_id,campus_id,employee_number,first_name,last_name,designation,department,status)
  values(org_id,campus_id,'DEMO-ATT-T02','[Demo] Kabir','Sethi','Mathematics Teacher','Academics','active') returning id into teacher_two;
  insert into public.staff_profiles(organization_id,campus_id,employee_number,first_name,last_name,designation,department,status)
  values(org_id,campus_id,'DEMO-ATT-S01','[Demo] Leena','Dutt','Attendance Coordinator','Administration','active');

  insert into public.subjects(organization_id,name,code) values
    (org_id,'[Demo] English','DEMO-ATT-ENG'),(org_id,'[Demo] Mathematics','DEMO-ATT-MAT'),
    (org_id,'[Demo] Science','DEMO-ATT-SCI'),(org_id,'[Demo] Social Studies','DEMO-ATT-SST');
  insert into public.classes(organization_id,campus_id,academic_year_id,grade,section) values(org_id,campus_id,year_id,'[Demo] Grade 6','A') returning id into class_a;
  insert into public.classes(organization_id,campus_id,academic_year_id,grade,section) values(org_id,campus_id,year_id,'[Demo] Grade 6','B') returning id into class_b;

  for i in 1..24 loop
    if mod(i-1,2)=0 then
      insert into public.guardians(organization_id,first_name,last_name,email,phone,occupation,status)
      values(org_id,'[Demo] Parent '||((i+1)/2),'Attendance','demo.parent.'||((i+1)/2)||'@example.invalid','+91000000'||lpad(((i+1)/2)::text,4,'0'),'Test profile','active') returning id into guardian_id;
    end if;
    insert into public.students(organization_id,campus_id,admission_number,first_name,last_name,date_of_birth,joined_on,status)
    values(org_id,campus_id,'DEMO-ATT-'||lpad(i::text,3,'0'),'[Demo] '||first_names[i],last_names[i],make_date(2014,mod(i-1,12)+1,mod(i-1,20)+1),'2026-06-01','active') returning id into student_id;
    insert into public.class_enrollments(organization_id,class_id,student_id,status,joined_on) values(org_id,case when i<=12 then class_a else class_b end,student_id,'active','2026-06-01');
    insert into public.guardian_relationships(organization_id,student_id,guardian_id,relationship,is_primary,can_pick_up) values(org_id,student_id,guardian_id,'Parent',true,true);
  end loop;

  insert into public.class_subjects(organization_id,class_id,subject_id,teacher_staff_id)
  select org_id,c.id,s.id,case when row_number() over(order by c.id,s.code)%2=0 then teacher_one else teacher_two end
  from (values(class_a),(class_b)) c(id) cross join public.subjects s where s.organization_id=org_id and s.code like 'DEMO-ATT-%';
end $$;
