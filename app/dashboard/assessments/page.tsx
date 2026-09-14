import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function schoolDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function AssessmentsPage() {
  const context = await getUserContext(); if (!context) redirect("/login?next=/dashboard/assessments");
  if (!['owner','administrator','principal','teacher','staff'].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const [staffResult, classResult, subjectResult, allocationsResult, assessmentsResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("assessments").select("id, class_subject_id, title, assessment_date, max_marks, status, created_by").eq("organization_id", context.organizationId).order("assessment_date", { ascending: false }).limit(100),
  ]);
  const manager = ["owner","administrator","principal","staff"].includes(context.role); const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allowed = new Set(allocations.map((item) => item.id)); const classMap = new Map((classResult.data || []).map((item) => [item.id,item])); const subjectMap = new Map((subjectResult.data || []).map((item) => [item.id,item])); const allocationMap = new Map(allocations.map((item) => [item.id,item]));
  const options = allocations.map((item) => ({ id: item.id, label: `${classMap.get(item.class_id)?.grade || "Class"} ${classMap.get(item.class_id)?.section || ""} · ${subjectMap.get(item.subject_id)?.name || "Subject"}` }));
  const assessments = (assessmentsResult.data || []).filter((item) => allowed.has(item.class_subject_id) && (manager || item.created_by === context.userId));
  return <AppShell context={context} activePath="/dashboard/assessments" pageTitle="Assessments"><div className="page-head"><div><span className="eyebrow">ASSESSMENTS</span><h1>Marks entry without the wait.</h1><p>Open a class grid, type continuously and send every mark in one batched save.</p></div></div><div className="assessment-layout"><section className="card"><div className="card-header"><div><h2>Create assessment</h2><p>The roster is loaded automatically.</p></div></div><div className="card-body"><AssessmentForm allocations={options} today={schoolDate()} /></div></section><aside className="card"><div className="card-header"><div><h2>Assessment register</h2><p>Open and published assessments.</p></div><span className="status">{assessments.length}</span></div><div className="assessment-list">{assessments.map((item) => { const allocation = allocationMap.get(item.class_subject_id); const schoolClass = allocation ? classMap.get(allocation.class_id) : null; const subject = allocation ? subjectMap.get(allocation.subject_id) : null; return <Link href={`/dashboard/assessments/${item.id}/marks`} key={item.id}><span className="assessment-icon">{subject?.code.slice(0,3) || "ASM"}</span><div><b>{item.title}</b><small>{schoolClass ? `${schoolClass.grade} · Section ${schoolClass.section}` : "Class"} · {subject?.name || "Subject"}</small></div><span><b>{item.max_marks}</b><small>maximum</small></span><span className={`status ${item.status === "published" ? "" : "status-warning"}`}>{item.status.replace("_", " ")}</span></Link>; })}{!assessments.length && <p className="empty-copy task-empty">No assessments created yet.</p>}</div></aside></div></AppShell>;
}
