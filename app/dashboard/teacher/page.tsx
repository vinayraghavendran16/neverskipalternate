import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function schoolDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function schoolWeekday() { const name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date()); return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(name) + 1; }

export default async function TeacherTodayPage() {
  const context = await getUserContext(); if (!context) redirect("/login?next=/dashboard/teacher");
  if (!['owner','administrator','principal','teacher','staff'].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const today = schoolDate(), weekday = schoolWeekday();
  const [staffResult, classResult, subjectResult, allocationsResult, timetableResult, diaryResult, attendanceResult, homeworkResult, assessmentResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("timetable_entries").select("id, class_id, class_subject_id, period_number, starts_at, ends_at, room").eq("organization_id", context.organizationId).eq("weekday", weekday).order("period_number").limit(100),
    supabase.from("lesson_diary_entries").select("id, class_subject_id, timetable_entry_id, status").eq("organization_id", context.organizationId).eq("entry_date", today).limit(100),
    supabase.from("attendance_sessions").select("class_id, status").eq("organization_id", context.organizationId).eq("attendance_date", today),
    supabase.from("homework_assignments").select("id, title, due_at, status, created_by").eq("organization_id", context.organizationId).gte("due_at", new Date().toISOString()).order("due_at").limit(20),
    supabase.from("assessments").select("id, title, assessment_date, status, class_subject_id, created_by").eq("organization_id", context.organizationId).in("status", ["draft", "marks_open"]).order("assessment_date").limit(30),
  ]);
  if ([staffResult, classResult, subjectResult, allocationsResult, timetableResult, diaryResult, attendanceResult, homeworkResult, assessmentResult].some((result) => result.error)) throw new Error("School data could not be loaded. Please retry.");
  const manager = ["owner","administrator","principal","staff"].includes(context.role);
  const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allocationIds = new Set(allocations.map((item) => item.id));
  const classMap = new Map((classResult.data || []).map((item) => [item.id, item])); const subjectMap = new Map((subjectResult.data || []).map((item) => [item.id, item]));
  const allocationMap = new Map(allocations.map((item) => [item.id, item]));
  const diaryKeys = new Set((diaryResult.data || []).map((item) => `${item.class_subject_id}:${item.timetable_entry_id || ""}`));
  const attendanceMap = new Map((attendanceResult.data || []).map((item) => [item.class_id, item.status]));
  const schedule = (timetableResult.data || []).filter((item) => allocationIds.has(item.class_subject_id));
  const openAssessments = (assessmentResult.data || []).filter((item) => allocationIds.has(item.class_subject_id) && (manager || item.created_by === context.userId));
  const upcomingHomework = (homeworkResult.data || []).filter((item) => manager || item.created_by === context.userId);
  const diaryDone = schedule.filter((item) => diaryKeys.has(`${item.class_subject_id}:${item.id}`)).length;

  return <AppShell context={context} activePath="/dashboard/teacher" pageTitle="Teacher Today">
    <div className="page-head teacher-head"><div><span className="eyebrow">TEACHER TODAY · {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>Your teaching day, in one view.</h1><p>Attendance, lesson records, homework and marks without jumping between modules.</p></div><Link className="primary compact" href="/dashboard/teacher/diary"><span>Write class diary</span><span>→</span></Link></div>
    <section className="teacher-metrics"><Link href="/dashboard/attendance"><span>Attendance</span><strong>{new Set(schedule.map((item) => item.class_id).filter((id) => ["submitted","locked"].includes(attendanceMap.get(id) || ""))).size}/{new Set(schedule.map((item) => item.class_id)).size}</strong><small>Classes submitted</small></Link><Link href="/dashboard/teacher/diary"><span>Class diary</span><strong>{diaryDone}/{schedule.length}</strong><small>Periods recorded</small></Link><Link href="/dashboard/homework"><span>Upcoming homework</span><strong>{upcomingHomework.length}</strong><small>Open assignments</small></Link><Link href="/dashboard/assessments"><span>Marks pending</span><strong>{openAssessments.length}</strong><small>Open assessments</small></Link></section>
    <div className="teacher-grid"><section className="card schedule-card"><div className="card-header"><div><h2>Today’s timetable</h2><p>Actions are attached to the period, so there is less searching.</p></div><span className="status">{schedule.length} periods</span></div><div className="today-schedule">{schedule.map((slot) => { const allocation = allocationMap.get(slot.class_subject_id); const schoolClass = classMap.get(slot.class_id); const subject = allocation ? subjectMap.get(allocation.subject_id) : null; const diaryComplete = diaryKeys.has(`${slot.class_subject_id}:${slot.id}`); return <div className="schedule-row" key={slot.id}><span className="period-time"><b>{slot.starts_at.slice(0,5)}</b><small>{slot.ends_at.slice(0,5)}</small></span><span className="schedule-period">P{slot.period_number}</span><div><b>{subject?.name || "Subject"}</b><small>{schoolClass ? `${schoolClass.grade} · Section ${schoolClass.section}` : "Class"}{slot.room ? ` · ${slot.room}` : ""}</small></div><div className="schedule-actions"><Link href={`/dashboard/attendance/${slot.class_id}?date=${today}`}>{["submitted","locked"].includes(attendanceMap.get(slot.class_id) || "") ? "Attendance ✓" : "Attendance"}</Link><Link className={diaryComplete ? "done" : ""} href={`/dashboard/teacher/diary?allocation=${slot.class_subject_id}&period=${slot.id}&date=${today}`}>{diaryComplete ? "Diary ✓" : "Add diary"}</Link></div></div>; })}{!schedule.length && <div className="attention-empty"><b>No timetable periods today</b><small>Your assigned timetable will appear here automatically.</small><Link className="secondary" href="/dashboard/academics">Open academics</Link></div>}</div></section>
      <aside className="teacher-side"><section className="card"><div className="card-header"><div><h2>Open assessments</h2><p>Continue marks entry.</p></div></div><div className="teacher-task-list">{openAssessments.slice(0,5).map((item) => { const allocation = allocationMap.get(item.class_subject_id); const schoolClass = allocation ? classMap.get(allocation.class_id) : null; return <Link href={`/dashboard/assessments/${item.id}/marks`} key={item.id}><span>▤</span><div><b>{item.title}</b><small>{schoolClass ? `${schoolClass.grade} ${schoolClass.section}` : "Class"} · {item.status.replace("_", " ")}</small></div><strong>→</strong></Link>; })}{!openAssessments.length && <p className="empty-copy task-empty">Nothing waiting for marks.</p>}</div></section><section className="card"><div className="card-header"><div><h2>Shortcuts</h2><p>Common teacher tasks.</p></div></div><div className="teacher-shortcuts"><Link href="/dashboard/homework">Create homework <span>→</span></Link><Link href="/dashboard/assessments">New assessment <span>→</span></Link><Link href="/dashboard/attendance">All attendance <span>→</span></Link></div></section></aside>
    </div>
  </AppShell>;
}
