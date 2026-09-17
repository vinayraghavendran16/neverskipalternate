import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeworkForm } from "@/components/teaching/homework-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function defaultDue() {
  const date = new Date(Date.now() + 86400000);
  return `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date)}T17:00`;
}
function currentTime() { return Date.now(); }

export default async function HomeworkPage({ searchParams }: { searchParams: Promise<{ view?: string; class?: string }> }) {
  const query = await searchParams;
  const view = ["assignments", "create", "review"].includes(query.view || "") ? query.view! : "assignments";
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/homework");
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const [staffResult, classResult, subjectResult, allocationsResult, homeworkResult, mappingsResult, enrollmentsResult, submissionsResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId).order("grade"),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId).eq("status", "active").order("name"),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("homework_assignments").select("id, subject_id, title, instructions, due_at, estimated_minutes, status, created_by").eq("organization_id", context.organizationId).order("due_at", { ascending: false }).limit(100),
    supabase.from("homework_classes").select("homework_id, class_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("class_enrollments").select("class_id, student_id").eq("organization_id", context.organizationId).eq("status", "active").limit(10000),
    supabase.from("homework_submissions").select("homework_id, student_id, status").eq("organization_id", context.organizationId).limit(10000),
  ]);
  if ([staffResult, classResult, subjectResult, allocationsResult, homeworkResult, mappingsResult, enrollmentsResult, submissionsResult].some((result) => result.error)) throw new Error("School homework data could not be loaded. Please retry.");

  const manager = ["owner", "administrator", "principal", "staff"].includes(context.role);
  const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allowedSubjectIds = new Set(allocations.map((item) => item.subject_id));
  const subjectMap = new Map((subjectResult.data || []).map((item) => [item.id, item]));
  const classMap = new Map((classResult.data || []).map((item) => [item.id, item]));
  const classes = (classResult.data || []).filter((item) => allocations.some((allocation) => allocation.class_id === item.id)).map((item) => ({ id: item.id, label: `${item.grade} · Section ${item.section}`, subjectIds: allocations.filter((allocation) => allocation.class_id === item.id).map((allocation) => allocation.subject_id) }));
  const subjects = (subjectResult.data || []).filter((item) => allowedSubjectIds.has(item.id)).map((item) => ({ id: item.id, label: `${item.name} (${item.code})` }));
  const mappings = new Map<string, string[]>();
  for (const row of mappingsResult.data || []) mappings.set(row.homework_id, [...(mappings.get(row.homework_id) || []), row.class_id]);
  const rosterByClass = new Map<string, Set<string>>();
  for (const row of enrollmentsResult.data || []) rosterByClass.set(row.class_id, new Set([...(rosterByClass.get(row.class_id) || []), row.student_id]));
  const submissionsByHomework = new Map<string, { studentId: string; status: string }[]>();
  for (const row of submissionsResult.data || []) submissionsByHomework.set(row.homework_id, [...(submissionsByHomework.get(row.homework_id) || []), { studentId: row.student_id, status: row.status }]);
  const homework = (homeworkResult.data || []).filter((item) => manager || item.created_by === context.userId).map((item) => {
    const classIds = mappings.get(item.id) || [];
    const assigned = new Set(classIds.flatMap((classId) => [...(rosterByClass.get(classId) || [])]));
    const submissions = (submissionsByHomework.get(item.id) || []).filter((row) => assigned.has(row.studentId));
    return { ...item, classIds, assigned: assigned.size, completed: new Set(submissions.filter((row) => row.status === "completed").map((row) => row.studentId)).size, needsReview: submissions.filter((row) => row.status === "submitted").length, returned: submissions.filter((row) => row.status === "returned").length };
  });
  const now = currentTime();
  const dueSoon = homework.filter((item) => item.status === "published" && new Date(item.due_at).getTime() >= now && new Date(item.due_at).getTime() <= now + 2 * 86400000).length;
  const overdue = homework.filter((item) => item.status === "published" && new Date(item.due_at).getTime() < now && item.completed < item.assigned).length;
  const reviewQueue = homework.reduce((sum, item) => sum + item.needsReview, 0);
  const requestedClass = classes.find((item) => item.id === query.class);
  const initialSubjectId = requestedClass?.subjectIds[0];
  const formatDue = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
  const tabs = [["assignments", "Assignments"], ["create", "Create"], ["review", `Review${reviewQueue ? ` (${reviewQueue})` : ""}`]];

  return <AppShell context={context} activePath="/dashboard/homework" pageTitle="Homework">
    <div className="page-head"><div><span className="eyebrow">HOMEWORK</span><h1>Assign clearly. Follow up quickly.</h1><p>Create from class context, see completion at a glance, and keep feedback in one review queue.</p></div>{view !== "create" && <Link className="primary compact" href="/dashboard/homework?view=create"><span>Create homework</span><span>→</span></Link>}</div>
    <div className="teaching-metrics" aria-label="Homework overview"><article><small>Published</small><strong>{homework.filter((item) => item.status === "published").length}</strong><span>active assignments</span></article><article><small>Due soon</small><strong>{dueSoon}</strong><span>within 48 hours</span></article><article><small>Review queue</small><strong>{reviewQueue}</strong><span>student submissions</span></article><article><small>Overdue</small><strong>{overdue}</strong><span>with incomplete work</span></article></div>
    <nav className="platform-tabs teaching-tabs" aria-label="Homework workspace sections">{tabs.map(([key, label]) => <Link key={key} href={`/dashboard/homework?view=${key}`} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}</Link>)}</nav>
    {view === "create" && <section className="card tab-panel teaching-form-card"><div className="card-header"><div><h2>New homework</h2><p>Write it once, choose every relevant class, then save or publish deliberately.</p></div></div><div className="card-body"><HomeworkForm subjects={subjects} classes={classes} defaultDue={defaultDue()} initialSubjectId={initialSubjectId} initialClassId={requestedClass?.id} /></div></section>}
    {view === "assignments" && <section className="card tab-panel"><div className="card-header"><div><h2>Assignment register</h2><p>Newest due dates first, with live completion and review signals.</p></div><span className="status">{homework.length}</span></div><div className="teaching-register">{homework.map((item) => {
      const classLabels = item.classIds.map((id) => { const value = classMap.get(id); return value ? `${value.grade} ${value.section}` : "Class"; });
      const progress = item.assigned ? Math.round((item.completed / item.assigned) * 100) : 0;
      const isOverdue = item.status === "published" && new Date(item.due_at).getTime() < now && item.completed < item.assigned;
      return <Link href={`/dashboard/homework/${item.id}`} key={item.id} className="teaching-register-row"><span className="subject-token">{subjectMap.get(item.subject_id)?.code?.slice(0, 4) || "HW"}</span><div className="register-main"><div><b>{item.title}</b><span className={`status ${item.status === "draft" || isOverdue ? "status-warning" : ""}`}>{isOverdue ? "overdue" : item.status}</span></div><small>{classLabels.join(", ") || "No class"} · Due {formatDue(item.due_at)}</small><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="register-stat"><b>{item.completed}/{item.assigned}</b><small>complete</small></div><div className="register-stat"><b>{item.needsReview}</b><small>to review</small></div><span className="row-arrow">→</span></Link>})}{!homework.length && <div className="empty-state compact-empty"><span>↗</span><h2>No homework yet</h2><p>Create the first task from a class or this workspace.</p><Link className="primary compact" href="/dashboard/homework?view=create"><span>Create homework</span><span>→</span></Link></div>}</div></section>}
    {view === "review" && <section className="card tab-panel"><div className="card-header"><div><h2>Review queue</h2><p>Assignments needing teacher attention appear first.</p></div><span className="status">{reviewQueue}</span></div><div className="teaching-register">{homework.filter((item) => item.needsReview || item.returned).sort((a, b) => b.needsReview - a.needsReview).map((item) => <Link href={`/dashboard/homework/${item.id}?status=${item.needsReview ? "submitted" : "returned"}`} key={item.id} className="teaching-register-row review-row"><span className="subject-token">{subjectMap.get(item.subject_id)?.code?.slice(0, 4) || "HW"}</span><div className="register-main"><b>{item.title}</b><small>{item.classIds.map((id) => { const value = classMap.get(id); return value ? `${value.grade} ${value.section}` : "Class"; }).join(", ")}</small></div><div className="register-stat"><b>{item.needsReview}</b><small>new</small></div><div className="register-stat"><b>{item.returned}</b><small>returned</small></div><span className="row-arrow">→</span></Link>)}{!homework.some((item) => item.needsReview || item.returned) && <div className="empty-state compact-empty"><span>✓</span><h2>Review queue is clear</h2><p>New student submissions will appear here.</p></div>}</div></section>}
  </AppShell>;
}
