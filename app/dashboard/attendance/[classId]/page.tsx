import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AttendanceSheet } from "@/components/academics/attendance-sheet";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function localDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function ClassAttendancePage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ date?: string }> }) {
  const { classId } = await params;
  const requestedDate = (await searchParams).date || localDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : localDate();
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/attendance/${classId}`);
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const { data: classRecord } = await supabase.from("classes").select("id, grade, section").eq("id", classId).eq("organization_id", context.organizationId).maybeSingle();
  if (!classRecord) notFound();
  const [{ data: enrollments }, { data: session }] = await Promise.all([
    supabase.from("class_enrollments").select("student_id").eq("class_id", classId).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("attendance_sessions").select("id, status").eq("class_id", classId).eq("attendance_date", date).maybeSingle(),
  ]);
  const studentIds = (enrollments || []).map((item) => item.student_id);
  const [{ data: students }, recordsResult] = await Promise.all([
    studentIds.length ? supabase.from("students").select("id, admission_number, first_name, last_name").in("id", studentIds).order("first_name") : Promise.resolve({ data: [] }),
    session ? supabase.from("attendance_records").select("student_id, status, reason").eq("session_id", session.id) : Promise.resolve({ data: [] }),
  ]);
  const recordMap = new Map((recordsResult.data || []).map((record) => [record.student_id, record]));
  const sheetStudents = (students || []).map((student) => { const record = recordMap.get(student.id); return { id: student.id, name: [student.first_name, student.last_name].filter(Boolean).join(" "), admissionNumber: student.admission_number, status: record?.status || "present", reason: record?.reason || "" }; });

  return <AppShell context={context} activePath="/dashboard/attendance" pageTitle="Attendance">
    <Link className="back-link" href="/dashboard/attendance">← Back to attendance</Link>
    <div className="page-head attendance-head"><div><span className="eyebrow">{session?.status?.toUpperCase() || "NOT STARTED"}</span><h1>{classRecord.grade} · Section {classRecord.section}</h1><p>{sheetStudents.length} students · attendance for {new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T12:00:00+05:30`))}</p></div><form className="date-form"><input type="date" name="date" defaultValue={date} /><button className="secondary">Go</button></form></div>
    {sheetStudents.length ? <section className="card"><AttendanceSheet classId={classId} date={date} students={sheetStudents} sessionStatus={session?.status || "not_started"} /></section> : <section className="card empty-state"><span>◎</span><h2>No students in this class</h2><p>Open Academics and add students to the class roster first.</p><Link className="primary compact" href={`/dashboard/academics/classes/${classId}`}>Manage roster →</Link></section>}
  </AppShell>;
}
