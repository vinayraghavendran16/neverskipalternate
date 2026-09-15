import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupDashboard } from "@/components/setup-dashboard";
import { getUserContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function schoolDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const activityLabels: Record<string, string> = {
  "attendance.submitted": "Attendance submitted",
  "attendance.draft_saved": "Attendance draft saved",
  "academics.class_created": "Class created",
  "academics.students_enrolled": "Class roster updated",
  "academics.subject_created": "Subject created",
  "academics.subject_allocated": "Subject allocated",
  "academics.timetable_updated": "Timetable updated",
  "people.student_created": "Student added",
  "people.staff_created": "Staff member added",
  "people.guardian_created": "Guardian added",
  "teaching.diary_published": "Class diary published",
  "teaching.diary_saved": "Class diary draft saved",
  "homework.published": "Homework published",
  "homework.draft_created": "Homework draft saved",
  "assessment.created": "Assessment created",
  "assessment.marks_saved": "Assessment marks saved",
  "assessment.marks_published": "Assessment marks published",
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupDashboard />;
  const context = await getUserContext();
  if (!context) redirect("/login");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  if (context.role === "teacher") redirect("/dashboard/teacher");
  if (context.role === "parent" || context.role === "student") redirect("/dashboard/learning");
  const today = schoolDate();
  const [studentsResult, staffResult, classesResult, sessionsResult, activityResult] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId).order("grade"),
    supabase.from("attendance_sessions").select("id, class_id, status, submitted_at").eq("organization_id", context.organizationId).eq("attendance_date", today),
    supabase.from("audit_events").select("id, action, occurred_at, metadata").eq("organization_id", context.organizationId).order("occurred_at", { ascending: false }).limit(6),
  ]);
  if ([studentsResult, staffResult, classesResult, sessionsResult, activityResult].some((result) => result.error)) throw new Error("School data could not be loaded. Please retry.");
  const classes = classesResult.data || [];
  const sessions = new Map((sessionsResult.data || []).map((session) => [session.class_id, session]));
  const completed = [...sessions.values()].filter((session) => session.status === "submitted" || session.status === "locked").length;
  const dueClasses = classes.filter((classRecord) => !["submitted", "locked"].includes(sessions.get(classRecord.id)?.status || ""));
  const completion = classes.length ? Math.round((completed / classes.length) * 100) : 0;
  const firstName = context.fullName.split(/\s+/)[0] || context.fullName;

  return (
    <AppShell context={context}>
      <div className="page-head command-head"><div><span className="eyebrow">COMMAND CENTRE · {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>{greeting()}, {firstName}.</h1><p>Here is what needs attention across {context.organizationName} today.</p></div><span className="release">Release {process.env.NEXT_PUBLIC_RELEASE_SHA || "local"}</span></div>
      <section className="metrics command-metrics"><Link className="metric" href="/dashboard/people?tab=students"><span>Active students</span><strong>{studentsResult.count || 0}</strong><small>Open student directory →</small></Link><Link className="metric" href="/dashboard/people?tab=staff"><span>Active staff</span><strong>{staffResult.count || 0}</strong><small>Open staff directory →</small></Link><Link className="metric" href="/dashboard/academics"><span>Classes</span><strong>{classes.length}</strong><small>Manage academics →</small></Link><Link className="metric" href="/dashboard/attendance"><span>Attendance today</span><strong>{completion}%</strong><small>{completed} of {classes.length} submitted →</small></Link></section>
      <div className="command-grid">
        <section className="card today-card"><header className="card-header"><div><h2>Today’s attention</h2><p>Daily work that is still open.</p></div><span className={`status ${dueClasses.length ? "status-warning" : ""}`}>{dueClasses.length ? `${dueClasses.length} due` : "All clear"}</span></header><div className="attention-list">{dueClasses.slice(0, 6).map((classRecord) => { const state = sessions.get(classRecord.id)?.status || "not_started"; return <Link href={`/dashboard/attendance/${classRecord.id}?date=${today}`} key={classRecord.id}><span className="attention-icon">◫</span><div><b>{classRecord.grade} · Section {classRecord.section}</b><small>Attendance {state.replace("_", " ")}</small></div><span>Mark now →</span></Link>; })}{!classes.length && <div className="attention-empty"><b>Set up your first class</b><small>Create the academic structure before starting daily attendance.</small><Link className="secondary" href="/dashboard/academics">Open academics</Link></div>}{classes.length > 0 && !dueClasses.length && <div className="attention-empty success-empty"><b>Attendance is complete</b><small>Every class has submitted today’s register.</small><Link className="secondary" href="/dashboard/attendance">Review registers</Link></div>}</div></section>
        <aside className="command-side"><section className="card quick-card"><header className="card-header"><div><h2>Quick actions</h2><p>Start common school tasks.</p></div></header><div className="quick-actions"><Link href="/dashboard/people/students/new"><span>＋</span><div><b>Add student</b><small>Create a student record</small></div></Link><Link href="/dashboard/people/import"><span>⇧</span><div><b>Import students</b><small>Upload a CSV roster</small></div></Link><Link href="/dashboard/academics"><span>▦</span><div><b>Manage classes</b><small>Rosters and timetable</small></div></Link><Link href="/dashboard/attendance"><span>◫</span><div><b>Take attendance</b><small>Mark daily exceptions</small></div></Link></div></section></aside>
      </div>
      <section className="card activity-card"><header className="card-header"><div><h2>Recent activity</h2><p>Latest audited changes in this school tenant.</p></div><span className="status">AUDITED</span></header><div className="activity-list">{(activityResult.data || []).map((event) => <div key={event.id}><span className="activity-dot" /><div><b>{activityLabels[event.action] || event.action.replaceAll(".", " ")}</b><small>{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(event.occurred_at))}</small></div></div>)}{!activityResult.data?.length && <p className="empty-copy">No recent activity is visible for this role yet.</p>}</div></section>
    </AppShell>
  );
}
