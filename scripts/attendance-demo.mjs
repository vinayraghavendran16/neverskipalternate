import { createClient } from "@supabase/supabase-js";

const command = process.argv[2];
const slug = process.argv[3] || "northstar-academy";
if (!["create", "delete"].includes(command)) throw new Error("Usage: node --env-file=.env.local scripts/attendance-demo.mjs <create|delete> [school-slug]");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase administration is not configured.");
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const fail = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };
const { data: school, error: schoolError } = await db.from("organizations").select("id,name").eq("slug", slug).eq("status", "active").maybeSingle();
fail("Load school", schoolError); if (!school) throw new Error(`Active school '${slug}' was not found.`);
const prefix = "DEMO-ATT-";

async function deleteFixture() {
  const [{ data: students }, { data: staff }, { data: guardians }, { data: subjects }, { data: classes }] = await Promise.all([
    db.from("students").select("id").eq("organization_id", school.id).like("admission_number", `${prefix}%`),
    db.from("staff_profiles").select("id").eq("organization_id", school.id).like("employee_number", `${prefix}%`),
    db.from("guardians").select("id").eq("organization_id", school.id).like("phone", "+91000000%"),
    db.from("subjects").select("id").eq("organization_id", school.id).like("code", `${prefix}%`),
    db.from("classes").select("id").eq("organization_id", school.id).like("grade", "[Demo]%"),
  ]);
  const studentIds = (students || []).map(item => item.id), classIds = (classes || []).map(item => item.id), subjectIds = (subjects || []).map(item => item.id);
  if (classIds.length) {
    fail("Delete demo attendance", (await db.from("attendance_sessions").delete().in("class_id", classIds)).error);
    const { data: allocations } = await db.from("class_subjects").select("id").in("class_id", classIds);
    const allocationIds = (allocations || []).map(item => item.id);
    if (allocationIds.length) fail("Delete demo assessments", (await db.from("assessments").delete().in("class_subject_id", allocationIds)).error);
    fail("Delete demo classes", (await db.from("classes").delete().in("id", classIds)).error);
  }
  if (studentIds.length) {
    const { data: invoices } = await db.from("fee_invoices").select("id").in("student_id", studentIds);
    const invoiceIds = (invoices || []).map(item => item.id);
    if (invoiceIds.length) fail("Delete demo payments", (await db.from("fee_payments").delete().in("invoice_id", invoiceIds)).error);
    fail("Delete demo invoices", (await db.from("fee_invoices").delete().in("student_id", studentIds)).error);
    fail("Delete demo marks", (await db.from("assessment_marks").delete().in("student_id", studentIds)).error);
    fail("Delete demo students", (await db.from("students").delete().in("id", studentIds)).error);
  }
  if (subjectIds.length) fail("Delete demo subjects", (await db.from("subjects").delete().in("id", subjectIds)).error);
  if (guardians?.length) fail("Delete demo guardians", (await db.from("guardians").delete().in("id", guardians.map(item => item.id))).error);
  if (staff?.length) fail("Delete demo staff", (await db.from("staff_profiles").delete().in("id", staff.map(item => item.id))).error);
  return { students: studentIds.length, staff: staff?.length || 0, guardians: guardians?.length || 0, subjects: subjectIds.length, classes: classIds.length };
}

if (command === "delete") {
  console.log(JSON.stringify({ school: school.name, deleted: await deleteFixture() }));
  process.exit(0);
}

await deleteFixture();
const [{ data: campus, error: campusError }, { data: existingYear, error: yearError }] = await Promise.all([
  db.from("campuses").select("id").eq("organization_id", school.id).eq("status", "active").order("created_at").limit(1).maybeSingle(),
  db.from("academic_years").select("id").eq("organization_id", school.id).eq("status", "active").order("starts_on", { ascending: false }).limit(1).maybeSingle(),
]);
fail("Load campus", campusError); fail("Load academic year", yearError); if (!campus) throw new Error("Create an active branch before loading demo data.");
let year = existingYear;
if (!year) {
  const result = await db.from("academic_years").insert({ organization_id: school.id, name: "2026-27 Demo", starts_on: "2026-06-01", ends_on: "2027-03-31", status: "active" }).select("id").single();
  fail("Create academic year", result.error); year = result.data;
}
const names = [
  ["Aanya", "Sharma"], ["Aarav", "Mehta"], ["Aditi", "Rao"], ["Advait", "Nair"], ["Anaya", "Kapoor"], ["Arjun", "Iyer"],
  ["Diya", "Singh"], ["Ishaan", "Patel"], ["Kavya", "Reddy"], ["Krish", "Gupta"], ["Meera", "Joshi"], ["Neel", "Verma"],
  ["Nisha", "Bose"], ["Pranav", "Menon"], ["Rhea", "Malhotra"], ["Rohan", "Das"], ["Saanvi", "Kulkarni"], ["Samarth", "Jain"],
  ["Sara", "Khan"], ["Shaurya", "Bhat"], ["Tara", "Pillai"], ["Ved", "Chopra"], ["Vihaan", "Mishra"], ["Zoya", "Ali"],
];
const studentResult = await db.from("students").insert(names.map(([first_name, last_name], index) => ({ organization_id: school.id, campus_id: campus.id, admission_number: `${prefix}${String(index + 1).padStart(3, "0")}`, first_name: `[Demo] ${first_name}`, last_name, date_of_birth: `2014-${String(index % 12 + 1).padStart(2, "0")}-${String(index % 20 + 1).padStart(2, "0")}`, joined_on: "2026-06-01", status: "active" }))).select("id,admission_number");
fail("Create demo students", studentResult.error); const students = studentResult.data || [];
const staffResult = await db.from("staff_profiles").insert([
  { organization_id: school.id, campus_id: campus.id, employee_number: `${prefix}T01`, first_name: "[Demo] Maya", last_name: "Thomas", designation: "Class Teacher", department: "Academics", status: "active" },
  { organization_id: school.id, campus_id: campus.id, employee_number: `${prefix}T02`, first_name: "[Demo] Kabir", last_name: "Sethi", designation: "Mathematics Teacher", department: "Academics", status: "active" },
  { organization_id: school.id, campus_id: campus.id, employee_number: `${prefix}S01`, first_name: "[Demo] Leena", last_name: "Dutt", designation: "Attendance Coordinator", department: "Administration", status: "active" },
]).select("id,employee_number");
fail("Create demo staff", staffResult.error); const staff = staffResult.data || [];
const guardianResult = await db.from("guardians").insert(Array.from({ length: 12 }, (_, index) => ({ organization_id: school.id, first_name: `[Demo] Parent ${index + 1}`, last_name: "Attendance", phone: `+91000000${String(index + 1).padStart(4, "0")}`, email: `demo.parent.${index + 1}@example.invalid`, occupation: "Test profile", status: "active" }))).select("id");
fail("Create demo guardians", guardianResult.error); const guardians = guardianResult.data || [];
const relationships = students.map((student, index) => ({ organization_id: school.id, student_id: student.id, guardian_id: guardians[Math.floor(index / 2)].id, relationship: "Parent", is_primary: true, can_pick_up: true }));
fail("Link demo families", (await db.from("guardian_relationships").insert(relationships)).error);
const subjectResult = await db.from("subjects").insert(["English", "Mathematics", "Science", "Social Studies"].map((name, index) => ({ organization_id: school.id, name: `[Demo] ${name}`, code: `${prefix}${["ENG", "MAT", "SCI", "SST"][index]}`, status: "active" }))).select("id,code");
fail("Create demo subjects", subjectResult.error); const subjects = subjectResult.data || [];
const classResult = await db.from("classes").insert(["A", "B"].map(section => ({ organization_id: school.id, campus_id: campus.id, academic_year_id: year.id, grade: "[Demo] Grade 6", section }))).select("id,section");
fail("Create demo classes", classResult.error); const classes = classResult.data || [];
fail("Enroll demo students", (await db.from("class_enrollments").insert(students.map((student, index) => ({ organization_id: school.id, class_id: classes[index < 12 ? 0 : 1].id, student_id: student.id, status: "active", joined_on: "2026-06-01" })))).error);
fail("Allocate demo subjects", (await db.from("class_subjects").insert(classes.flatMap((schoolClass, classIndex) => subjects.map((subject, subjectIndex) => ({ organization_id: school.id, class_id: schoolClass.id, subject_id: subject.id, teacher_staff_id: staff[(classIndex + subjectIndex) % 2].id }))))).error);
console.log(JSON.stringify({ school: school.name, created: { students: students.length, guardians: guardians.length, staff: staff.length, classes: classes.length, subjects: subjects.length }, marker: prefix }));
