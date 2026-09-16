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
  if ([classResult, enrollmentResult, sessionResult].some((result) => result.error)) throw new Error("School data could not be loaded. Please retry.");
  let classes = classResult.data || [];
  if (context.role === "teacher") {
    const { data: teacher } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    const { data: allocations } = teacher ? await supabase.from("class_subjects").select("class_id").eq("organization_id", context.organizationId).eq("teacher_staff_id", teacher.id) : { data: [] };
    const assigned = new Set((allocations || []).map(item => item.class_id));
    classes = classes.filter(item => item.homeroom_teacher_user_id === context.userId || assigned.has(item.id));
  }
  classes.sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }) || a.section.localeCompare(b.section));
  const sessions = new Map((sessionResult.data || []).map((session) => [session.class_id, session]));
  const rosterCounts = new Map<string, number>(); for (const item of enrollmentResult.data || []) rosterCounts.set(item.class_id, (rosterCounts.get(item.class_id) || 0) + 1);
  const submitted = classes.filter(item => { const session = sessions.get(item.id); return session?.status === "submitted" || session?.status === "locked"; }).length;
  const nextDue = classes.find(item => { const session = sessions.get(item.id); return !session || !["submitted", "locked"].includes(session.status); });

  return <AppShell context={context} activePath="/dashboard/attendance" pageTitle="Attendance">
    <div className="page-head"><div><span className="eyebrow">DAILY ATTENDANCE</span><h1>Everyone present. Tap exceptions.</h1><p>Approved leave is filled automatically. Mark absence or lateness in one tap, review exceptions, and submit.</p></div>{nextDue ? <Link className="primary compact" href={`/dashboard/attendance/${nextDue.id}?date=${today}`}>Start next due →</Link> : <span className="date-chip">All done today</span>}</div>
    <section className="attendance-summary"><div><strong>{classes.length}</strong><span>Classes</span></div><div><strong>{submitted}</strong><span>Submitted</span></div><div><strong>{classes.length - submitted}</strong><span>Still due</span></div><div><strong>{enrollmentResult.data?.length || 0}</strong><span>Students expected</span></div></section>
    <section className="card attendance-classes"><div className="card-header"><div><h2>{context.role === "teacher" ? "My classes" : "Today’s classes"}</h2><p>Due classes appear first. Submitted registers remain available for audited updates.</p></div><span className="status">{submitted}/{classes.length} complete</span></div><div className="attendance-class-list">{[...classes].sort((a, b) => Number(Boolean(sessions.get(a.id)?.status === "submitted" || sessions.get(a.id)?.status === "locked")) - Number(Boolean(sessions.get(b.id)?.status === "submitted" || sessions.get(b.id)?.status === "locked"))).map((item) => { const session = sessions.get(item.id); const state = session?.status || "not_started"; return <Link href={`/dashboard/attendance/${item.id}?date=${today}`} key={item.id}><span className="class-icon">{item.grade.replace(/[^0-9A-Za-z]/g, "").slice(-2) || "CL"}</span><div><b>{item.grade} · Section {item.section}</b><small>{rosterCounts.get(item.id) || 0} students</small></div><span className={`status attendance-state-${state}`}>{state.replace("_", " ")}</span><strong>{state === "not_started" ? "Start" : state === "draft" ? "Continue" : "Review"} →</strong></Link>; })}{!classes.length && <div className="empty-state"><span>◫</span><h2>{context.role === "teacher" ? "No assigned classes" : "No classes configured"}</h2><p>{context.role === "teacher" ? "Ask a school administrator to assign your homeroom or subject classes." : "Create classes and enroll students before taking attendance."}</p>{context.role !== "teacher" && <Link className="primary compact" href="/dashboard/academics">Open academics →</Link>}</div>}</div></section>
  </AppShell>;
}
