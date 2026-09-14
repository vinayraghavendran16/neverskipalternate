import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EnrollmentForm, SubjectAllocationForm, TimetableForm } from "@/components/academics/class-forms";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/academics/classes/${id}`);
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: classRecord } = await supabase.from("classes").select("*").eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (!classRecord) notFound();
  const canManage = ["owner", "administrator", "principal"].includes(context.role);
  const [studentsResult, enrollmentsResult, subjectsResult, staffResult, allocationsResult, timetableResult, yearResult] = await Promise.all([
    supabase.from("students").select("id, admission_number, first_name, last_name").eq("organization_id", context.organizationId).eq("status", "active").order("first_name"),
    supabase.from("class_enrollments").select("id, student_id, status").eq("class_id", id).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId).eq("status", "active").order("name"),
    supabase.from("staff_profiles").select("id, first_name, last_name, designation").eq("organization_id", context.organizationId).eq("status", "active").order("first_name"),
    supabase.from("class_subjects").select("id, subject_id, teacher_staff_id").eq("class_id", id).eq("organization_id", context.organizationId),
    supabase.from("timetable_entries").select("id, class_subject_id, weekday, period_number, starts_at, ends_at, room").eq("class_id", id).eq("organization_id", context.organizationId).order("weekday").order("period_number"),
    supabase.from("academic_years").select("name").eq("id", classRecord.academic_year_id).maybeSingle(),
  ]);
  const students = studentsResult.data || [], enrolledIds = new Set((enrollmentsResult.data || []).map((item) => item.student_id));
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const subjectMap = new Map((subjectsResult.data || []).map((subject) => [subject.id, subject]));
  const staffMap = new Map((staffResult.data || []).map((person) => [person.id, person]));
  const allocations = (allocationsResult.data || []).map((allocation) => ({ ...allocation, subject: subjectMap.get(allocation.subject_id), teacher: allocation.teacher_staff_id ? staffMap.get(allocation.teacher_staff_id) : null }));
  const allocationMap = new Map(allocations.map((allocation) => [allocation.id, allocation]));

  return <AppShell context={context} activePath="/dashboard/academics" pageTitle="Academics">
    <Link className="back-link" href="/dashboard/academics">← Back to academics</Link>
    <div className="page-head class-head"><div><span className="eyebrow">{yearResult.data?.name || "ACADEMIC YEAR"}</span><h1>{classRecord.grade} · Section {classRecord.section}</h1><p>{enrolledIds.size} students · {allocations.length} subjects · {timetableResult.data?.length || 0} timetable periods</p></div><Link className="primary compact" href={`/dashboard/attendance/${id}`}><span>Take attendance</span><span>→</span></Link></div>
    <div className="class-layout">
      <section className="card"><div className="card-header"><div><h2>Class roster</h2><p>Active students currently assigned to this section.</p></div><span className="status">{enrolledIds.size} enrolled</span></div><div className="roster-list">{[...enrolledIds].map((studentId, index) => { const student = studentMap.get(studentId); return student ? <div key={studentId}><span>{String(index + 1).padStart(2, "0")}</span><b>{[student.first_name, student.last_name].filter(Boolean).join(" ")}</b><small>{student.admission_number}</small></div> : null; })}{!enrolledIds.size && <p className="empty-copy roster-empty">No students enrolled.</p>}</div>{canManage && <div className="card-body bordered-top"><h3 className="section-title">Add students</h3><EnrollmentForm classId={id} students={students.filter((student) => !enrolledIds.has(student.id)).map((student) => ({ id: student.id, name: [student.first_name, student.last_name].filter(Boolean).join(" "), admissionNumber: student.admission_number }))} /></div>}</section>
      <aside className="academic-side"><section className="card"><div className="card-header"><div><h2>Subject allocation</h2><p>Teacher ownership for this class.</p></div></div><div className="card-body allocation-list">{allocations.map((allocation) => <div key={allocation.id}><span>{allocation.subject?.code || "SUB"}</span><div><b>{allocation.subject?.name || "Subject"}</b><small>{allocation.teacher ? [allocation.teacher.first_name, allocation.teacher.last_name].filter(Boolean).join(" ") : "Teacher unassigned"}</small></div></div>)}{!allocations.length && <p className="empty-copy">No subjects allocated.</p>}</div>{canManage && <div className="card-body bordered-top"><SubjectAllocationForm classId={id} subjects={(subjectsResult.data || []).map((subject) => ({ id: subject.id, name: `${subject.name} (${subject.code})` }))} teachers={(staffResult.data || []).map((person) => ({ id: person.id, name: [person.first_name, person.last_name].filter(Boolean).join(" ") }))} /></div>}</section>
      {canManage && <section className="card"><div className="card-header"><div><h2>Add timetable period</h2><p>One subject per class period.</p></div></div><div className="card-body"><TimetableForm classId={id} allocations={allocations.map((allocation) => ({ id: allocation.id, label: allocation.subject?.name || "Subject" }))} /></div></section>}</aside>
    </div>
    <section className="card timetable-card"><div className="card-header"><div><h2>Weekly timetable</h2><p>Periods are ordered automatically within each day.</p></div></div><div className="week-grid">{days.map((day, dayIndex) => { const slots = (timetableResult.data || []).filter((slot) => slot.weekday === dayIndex + 1); return <div className="day-column" key={day}><h3>{day.slice(0, 3)}</h3>{slots.map((slot) => { const allocation = allocationMap.get(slot.class_subject_id); return <div className="period" key={slot.id}><span>P{slot.period_number}</span><b>{allocation?.subject?.name || "Subject"}</b><small>{slot.starts_at.slice(0, 5)}–{slot.ends_at.slice(0, 5)}{slot.room ? ` · ${slot.room}` : ""}</small></div>; })}{!slots.length && <small className="no-period">No periods</small>}</div>; })}</div></section>
  </AppShell>;
}
