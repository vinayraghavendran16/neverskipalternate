import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeworkForm } from "@/components/teaching/homework-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function defaultDue() { const date = new Date(Date.now() + 24 * 60 * 60 * 1000); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date) + "T17:00"; }

export default async function HomeworkPage() {
  const context = await getUserContext(); if (!context) redirect("/login?next=/dashboard/homework");
  if (!['owner','administrator','principal','teacher','staff'].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const [staffResult, classResult, subjectResult, allocationsResult, homeworkResult, mappingsResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId).order("grade"),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId).eq("status", "active").order("name"),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("homework_assignments").select("id, subject_id, title, instructions, due_at, estimated_minutes, status, created_by").eq("organization_id", context.organizationId).order("due_at", { ascending: false }).limit(100),
    supabase.from("homework_classes").select("homework_id, class_id").eq("organization_id", context.organizationId).limit(1000),
  ]);
  const manager = ["owner","administrator","principal","staff"].includes(context.role); const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allowedSubjectIds = new Set(allocations.map((item) => item.subject_id)); const subjectMap = new Map((subjectResult.data || []).map((item) => [item.id,item])); const classMap = new Map((classResult.data || []).map((item) => [item.id,item]));
  const classes = (classResult.data || []).filter((item) => allocations.some((allocation) => allocation.class_id === item.id)).map((item) => ({ id: item.id, label: `${item.grade} · Section ${item.section}`, subjectIds: allocations.filter((allocation) => allocation.class_id === item.id).map((allocation) => allocation.subject_id) }));
  const subjects = (subjectResult.data || []).filter((item) => allowedSubjectIds.has(item.id)).map((item) => ({ id: item.id, label: `${item.name} (${item.code})` }));
  const mappings = new Map<string,string[]>(); for (const row of mappingsResult.data || []) mappings.set(row.homework_id, [...(mappings.get(row.homework_id) || []), row.class_id]);
  const homework = (homeworkResult.data || []).filter((item) => manager || item.created_by === context.userId);
  return <AppShell context={context} activePath="/dashboard/homework" pageTitle="Homework"><div className="page-head"><div><span className="eyebrow">HOMEWORK</span><h1>Create once. Assign broadly.</h1><p>One clear task can be published to every relevant class without duplicate entry.</p></div></div><div className="homework-layout"><section className="card"><div className="card-header"><div><h2>New homework</h2><p>Choose a subject and one or more allocated classes.</p></div></div><div className="card-body"><HomeworkForm subjects={subjects} classes={classes} defaultDue={defaultDue()} /></div></section><aside className="card"><div className="card-header"><div><h2>Assignments</h2><p>Latest homework first.</p></div><span className="status">{homework.length}</span></div><div className="homework-list">{homework.map((item) => { const classLabels = (mappings.get(item.id) || []).map((id) => { const value = classMap.get(id); return value ? `${value.grade} ${value.section}` : "Class"; }); return <article key={item.id}><div><span className={`status ${item.status === "draft" ? "status-warning" : ""}`}>{item.status}</span><small>{subjectMap.get(item.subject_id)?.code || "SUB"}</small></div><h3>{item.title}</h3><p>{item.instructions}</p><footer><span>{classLabels.join(", ") || "No class"}</span><span>Due {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(item.due_at))}</span></footer></article>; })}{!homework.length && <p className="empty-copy task-empty">No homework created yet.</p>}</div></aside></div></AppShell>;
}
