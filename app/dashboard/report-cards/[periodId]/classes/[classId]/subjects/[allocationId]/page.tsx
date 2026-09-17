import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubjectReportRegister } from "@/components/reporting/subject-report-register";
import { getUserContext } from "@/lib/auth/context";
import { parseGradeScale, reportStatusLabel } from "@/lib/formal-reports";
import { createClient } from "@/lib/supabase/server";

type Params = { periodId: string; classId: string; allocationId: string };

export default async function SubjectReportPage({ params }: { params: Promise<Params> }) {
  const context = await getUserContext(); if (!context) redirect("/login");
  if (["parent", "student"].includes(context.role)) redirect("/dashboard/report-cards");
  const { periodId, classId, allocationId } = await params;
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const [periodResult, classResult, allocationResult, cardsResult] = await Promise.all([
    supabase.from("reporting_periods").select("id,name,template_id").eq("id", periodId).single(),
    supabase.from("classes").select("id,grade,section").eq("id", classId).single(),
    supabase.from("class_subjects").select("id,subject_id,teacher_staff_id").eq("id", allocationId).eq("class_id", classId).single(),
    supabase.from("report_cards").select("id,student_id,status").eq("period_id", periodId).eq("class_id", classId).order("created_at"),
  ]);
  if (periodResult.error || classResult.error || allocationResult.error || cardsResult.error) redirect(`/dashboard/report-cards/${periodId}/classes/${classId}?error=Subject+register+is+not+available`);
  const cards = cardsResult.data || []; if (!cards.length) redirect(`/dashboard/report-cards?period=${periodId}`);
  const [subjectResult, teacherResult, templateResult, studentsResult, rowsResult] = await Promise.all([
    supabase.from("subjects").select("id,name,code").eq("id", allocationResult.data.subject_id).single(),
    allocationResult.data.teacher_staff_id ? supabase.from("staff_profiles").select("id,user_id,first_name,last_name").eq("id", allocationResult.data.teacher_staff_id).single() : Promise.resolve({ data: null, error: null }),
    supabase.from("report_card_templates").select("grading_scale,show_percentage,show_teacher_comments").eq("id", periodResult.data.template_id).single(),
    supabase.from("students").select("id,first_name,last_name,preferred_name,admission_number").in("id", cards.map((row) => row.student_id)).order("first_name"),
    supabase.from("report_card_subjects").select("report_card_id,grade,percentage,teacher_comment").eq("class_subject_id", allocationId).in("report_card_id", cards.map((row) => row.id)),
  ]);
  if (subjectResult.error || teacherResult.error || templateResult.error || studentsResult.error || rowsResult.error) throw new Error("Subject report register could not be loaded.");
  const leader = ["owner", "administrator", "principal", "staff"].includes(context.role);
  if (context.role === "teacher" && teacherResult.data?.user_id !== context.userId) redirect(`/dashboard/report-cards/${periodId}/classes/${classId}?error=This+subject+is+assigned+to+another+teacher`);
  if (!leader && context.role !== "teacher") redirect("/dashboard/report-cards");
  const studentMap = new Map((studentsResult.data || []).map((row) => [row.id, row])), rowMap = new Map((rowsResult.data || []).map((row) => [row.report_card_id, row]));
  const rows = cards.map((card) => { const student = studentMap.get(card.student_id), value = rowMap.get(card.id); return { reportCardId: card.id, studentId: card.student_id, name: student ? `${student.preferred_name || student.first_name} ${student.last_name}` : "Student", admission: student?.admission_number || "", grade: value?.grade || "", percentage: value?.percentage === null || value?.percentage === undefined ? null : Number(value.percentage), comment: value?.teacher_comment || "" }; });
  const status = cards[0].status, locked = cards.some((row) => row.status !== "draft");
  return <AppShell context={context} activePath="/dashboard/report-cards" pageTitle="Report cards">
    <Link className="back-link" href={`/dashboard/report-cards/${periodId}/classes/${classId}`}>← Back to class reports</Link>
    <div className="page-head"><div><span className="eyebrow">{periodResult.data.name.toUpperCase()} · SUBJECT REGISTER</span><h1>{subjectResult.data.name}</h1><p>{classResult.data.grade} · Section {classResult.data.section}{teacherResult.data ? ` · ${teacherResult.data.first_name} ${teacherResult.data.last_name}` : " · Teacher not assigned"}</p></div><span className={`status ${status === "draft" ? "status-warning" : ""}`}>{reportStatusLabel(status)}</span></div>
    <section className="card"><header className="card-header"><div><h2>Student results and feedback</h2><p>Save the whole register in one atomic update. Submitted classes remain locked.</p></div><span className="status">{rows.length} students</span></header><SubjectReportRegister periodId={periodId} classId={classId} allocationId={allocationId} rows={rows} grades={parseGradeScale(templateResult.data.grading_scale)} showPercentage={templateResult.data.show_percentage} showComments={templateResult.data.show_teacher_comments} locked={locked}/></section>
  </AppShell>;
}
