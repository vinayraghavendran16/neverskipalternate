import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function localDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function AttendancePage() {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/attendance");
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const today = localDate();
  const [classResult, enrollmentResult, sessionResult] = await Promise.all([
    supabase.from("classes").select("id, grade, section, homeroom_teacher_user_id").eq("organization_id", context.organizationId).order("grade"),
    supabase.from("class_enrollments").select("class_id").eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("attendance_sessions").select("id, class_id, status, submitted_at").eq("organization_id", context.organizationId).eq("attendance_date", today),
  ]);
  const classes = classResult.data || [], sessions = new Map((sessionResult.data || []).map((session) => [session.class_id, session]));
  const rosterCounts = new Map<string, number>(); for (const item of enrollmentResult.data || []) rosterCounts.set(item.class_id, (rosterCounts.get(item.class_id) || 0) + 1);
  const submitted = [...sessions.values()].filter((session) => session.status === "submitted" || session.status === "locked").length;

  return <AppShell context={context} activePath="/dashboard/attendance" pageTitle="Attendance">
    <div className="page-head"><div><span className="eyebrow">DAILY ATTENDANCE</span><h1>Present by default.</h1><p>Mark only exceptions, keep reasons visible and submit with confidence.</p></div><span className="date-chip">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span></div>
    <section className="attendance-summary"><div><strong>{classes.length}</strong><span>Classes</span></div><div><strong>{submitted}</strong><span>Submitted</span></div><div><strong>{classes.length - submitted}</strong><span>Still due</span></div><div><strong>{enrollmentResult.data?.length || 0}</strong><span>Students expected</span></div></section>
    <section className="card attendance-classes"><div className="card-header"><div><h2>Today’s classes</h2><p>Open a class to save a draft or submit attendance.</p></div><span className="status">{submitted}/{classes.length} complete</span></div><div className="attendance-class-list">{classes.map((item) => { const session = sessions.get(item.id); const state = session?.status || "not_started"; return <Link href={`/dashboard/attendance/${item.id}?date=${today}`} key={item.id}><span className="class-icon">{item.grade.replace(/[^0-9A-Za-z]/g, "").slice(-2) || "CL"}</span><div><b>{item.grade} · Section {item.section}</b><small>{rosterCounts.get(item.id) || 0} students</small></div><span className={`status attendance-state-${state}`}>{state.replace("_", " ")}</span><strong>Open →</strong></Link>; })}{!classes.length && <div className="empty-state"><span>◫</span><h2>No classes configured</h2><p>Create classes and enroll students before taking attendance.</p><Link className="primary compact" href="/dashboard/academics">Open academics →</Link></div>}</div></section>
  </AppShell>;
}
