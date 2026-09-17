import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EnrollmentForm, SubjectAllocationForm, TimetableForm } from "@/components/academics/class-forms";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const tabs = [["overview", "Overview"], ["roster", "Roster"], ["subjects", "Subjects & teachers"], ["timetable", "Timetable"]] as const;

export default async function ClassDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/academics/classes/${id}`);
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: classRecord, error: classError } = await supabase.from("classes").select("id, organization_id, campus_id, academic_year_id, grade, section, homeroom_teacher_user_id").eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (classError) throw new Error("Class details could not be loaded.");
  if (!classRecord) notFound();
  const canManage = ["owner", "administrator", "principal"].includes(context.role);
  const requestedView = (await searchParams).view || "overview";
  const view = tabs.some(([key]) => key === requestedView) ? requestedView : "overview";
  const [studentsResult, enrollmentsResult, subjectsResult, staffResult, allocationsResult, timetableResult, yearResult, currentStaffResult] = await Promise.all([
    supabase.from("students").select("id, admission_number, first_name, last_name").eq("organization_id", context.organizationId).eq("status", "active").order("first_name").order("last_name"),
    supabase.from("class_enrollments").select("id, student_id, status").eq("class_id", id).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId).eq("status", "active").order("name"),
    supabase.from("staff_profiles").select("id, first_name, last_name, designation").eq("organization_id", context.organizationId).eq("status", "active").order("first_name"),
    supabase.from("class_subjects").select("id, subject_id, teacher_staff_id").eq("class_id", id).eq("organization_id", context.organizationId),
    supabase.from("timetable_entries").select("id, class_subject_id, weekday, period_number, starts_at, ends_at, room").eq("class_id", id).eq("organization_id", context.organizationId).order("weekday").order("period_number"),
    supabase.from("academic_years").select("name").eq("id", classRecord.academic_year_id).maybeSingle(),
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
  ]);
  if ([studentsResult, enrollmentsResult, subjectsResult, staffResult, allocationsResult, timetableResult, yearResult, currentStaffResult].some((result) => result.error)) throw new Error("Class workspace could not be loaded.");
  if (context.role === "teacher" && classRecord.homeroom_teacher_user_id !== context.userId && !(allocationsResult.data || []).some((item) => item.teacher_staff_id === currentStaffResult.data?.id)) redirect("/dashboard/academics");

  const students = studentsResult.data || [], enrolledIds = new Set((enrollmentsResult.data || []).map((item) => item.student_id));
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const subjectMap = new Map((subjectsResult.data || []).map((subject) => [subject.id, subject]));
  const staffMap = new Map((staffResult.data || []).map((person) => [person.id, person]));
  const allocations = (allocationsResult.data || []).map((allocation) => ({ ...allocation, subject: subjectMap.get(allocation.subject_id), teacher: allocation.teacher_staff_id ? staffMap.get(allocation.teacher_staff_id) : null }));
  const allocationMap = new Map(allocations.map((allocation) => [allocation.id, allocation]));
  const timetable = timetableResult.data || [];
  const unassignedSubjects = allocations.filter((item) => !item.teacher).length;
  const readinessSteps = [
    { label: "Students enrolled", complete: enrolledIds.size > 0, href: "roster" },
    { label: "Subjects allocated", complete: allocations.length > 0, href: "subjects" },
    { label: "Every subject has a teacher", complete: allocations.length > 0 && unassignedSubjects === 0, href: "subjects" },
    { label: "Timetable created", complete: timetable.length > 0, href: "timetable" },
  ];
  const base = `/dashboard/academics/classes/${id}`;

  return <AppShell context={context} activePath="/dashboard/academics" pageTitle="Academics">
    <Link className="back-link" href="/dashboard/academics">← Back to academics</Link>
    <div className="page-head class-head"><div><span className="eyebrow">{yearResult.data?.name || "ACADEMIC YEAR"}</span><h1>{classRecord.grade} · Section {classRecord.section}</h1><p>{enrolledIds.size} student{enrolledIds.size === 1 ? "" : "s"} · {allocations.length} subject{allocations.length === 1 ? "" : "s"} · {timetable.length} timetable period{timetable.length === 1 ? "" : "s"}</p></div><Link className="primary compact" href={`/dashboard/attendance/${id}`}><span>Take attendance</span><span>→</span></Link></div>
    <nav className="platform-tabs academics-tabs class-tabs" aria-label="Class workspace sections">{tabs.map(([key, label]) => <Link key={key} href={`${base}?view=${key}`} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}</Link>)}</nav>

    {view === "overview" && <div className="class-overview-grid"><section className="card"><div className="card-header"><div><h2>Teach this class</h2><p>Frequent actions stay one click away.</p></div></div><div className="class-action-grid"><Link href={`/dashboard/attendance/${id}`}><span>✓</span><div><b>Take attendance</b><small>Open today’s register</small></div><strong>→</strong></Link><Link href="/dashboard/homework"><span>↗</span><div><b>Assign homework</b><small>Create and publish a task</small></div><strong>→</strong></Link><Link href="/dashboard/assessments"><span>▤</span><div><b>Create assessment</b><small>Set marks and open entry</small></div><strong>→</strong></Link><Link href="/dashboard/teacher/diary"><span>◫</span><div><b>Update class diary</b><small>Record the lesson once</small></div><strong>→</strong></Link></div></section><aside className="card"><div className="card-header"><div><h2>Class readiness</h2><p>Resolve gaps before they block teachers.</p></div></div><div className="readiness-list">{readinessSteps.map((step) => <Link href={`${base}?view=${step.href}`} key={step.label} className={step.complete ? "complete" : ""}><span>{step.complete ? "✓" : "!"}</span><b>{step.label}</b><small>{step.complete ? "Complete" : "Review →"}</small></Link>)}</div></aside></div>}

    {view === "roster" && <section className="card academic-panel"><div className="card-header"><div><h2>Class roster</h2><p>Active students assigned to this section.</p></div><span className="status">{enrolledIds.size} enrolled</span></div><div className="roster-list roster-full">{[...enrolledIds].map((studentId, index) => { const student = studentMap.get(studentId); return student ? <div key={studentId}><span>{String(index + 1).padStart(2, "0")}</span><b>{[student.first_name, student.last_name].filter(Boolean).join(" ")}</b><small>{student.admission_number}</small></div> : null; })}{!enrolledIds.size && <p className="empty-copy roster-empty">No students enrolled.</p>}</div>{canManage && <div className="card-body bordered-top"><h3 className="section-title">Add students</h3><p className="section-help">Search, select one or many, then add them in one step.</p><EnrollmentForm classId={id} students={students.filter((student) => !enrolledIds.has(student.id)).map((student) => ({ id: student.id, name: [student.first_name, student.last_name].filter(Boolean).join(" "), admissionNumber: student.admission_number }))} /></div>}</section>}

    {view === "subjects" && <section className="card academic-panel"><div className="card-header"><div><h2>Subjects and teachers</h2><p>One accountable teacher for each subject taught in this class.</p></div><span className={`status ${unassignedSubjects ? "status-warning" : ""}`}>{unassignedSubjects ? `${unassignedSubjects} unassigned` : `${allocations.length} allocated`}</span></div><div className="allocation-directory">{allocations.map((allocation) => <div key={allocation.id}><span>{allocation.subject?.code || "SUB"}</span><div><b>{allocation.subject?.name || "Subject"}</b><small>{allocation.teacher ? [allocation.teacher.first_name, allocation.teacher.last_name].filter(Boolean).join(" ") : "Teacher unassigned"}</small></div><span className={`status ${allocation.teacher ? "" : "status-warning"}`}>{allocation.teacher ? "Ready" : "Action needed"}</span></div>)}{!allocations.length && <p className="empty-copy">No subjects allocated.</p>}</div>{canManage && <div className="card-body bordered-top academic-inline-editor"><h3 className="section-title">Allocate or update a subject</h3><p className="section-help">Choosing an existing subject updates its teacher without creating a duplicate.</p><SubjectAllocationForm classId={id} subjects={(subjectsResult.data || []).map((subject) => ({ id: subject.id, name: `${subject.name} (${subject.code})` }))} teachers={(staffResult.data || []).map((person) => ({ id: person.id, name: [person.first_name, person.last_name].filter(Boolean).join(" ") }))} /></div>}</section>}

    {view === "timetable" && <div className="timetable-workspace"><section className="card"><div className="card-header"><div><h2>Weekly timetable</h2><p>Periods are ordered automatically within each day.</p></div><span className="status">{timetable.length} period{timetable.length === 1 ? "" : "s"}</span></div><div className="week-grid">{days.map((day, dayIndex) => { const slots = timetable.filter((slot) => slot.weekday === dayIndex + 1); return <div className="day-column" key={day}><h3>{day.slice(0, 3)}</h3>{slots.map((slot) => { const allocation = allocationMap.get(slot.class_subject_id); return <div className="period" key={slot.id}><span>P{slot.period_number}</span><b>{allocation?.subject?.name || "Subject"}</b><small>{slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}{slot.room ? ` · ${slot.room}` : ""}</small></div>; })}{!slots.length && <small className="no-period">No periods</small>}</div>; })}</div></section>{canManage && <section className="card"><div className="card-header"><div><h2>Add or replace a period</h2><p>Saving the same day and period updates that slot.</p></div></div><div className="card-body"><TimetableForm classId={id} allocations={allocations.map((allocation) => ({ id: allocation.id, label: allocation.subject?.name || "Subject" }))} /></div></section>}</div>}
  </AppShell>;
}
