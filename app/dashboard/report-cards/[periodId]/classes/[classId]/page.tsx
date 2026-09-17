import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OverallCommentRegister } from "@/components/reporting/overall-comment-register";
import { getUserContext } from "@/lib/auth/context";
import { parseGradeScale, reportStatusLabel } from "@/lib/formal-reports";
import { percentage } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";
import { advanceReportStatus } from "../../../actions";

type Params = { periodId: string; classId: string };
type Search = { error?: string; success?: string };

export default async function ReportClassPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const context = await getUserContext(); if (!context) redirect("/login");
  if (["parent", "student"].includes(context.role)) redirect("/dashboard/report-cards");
  const { periodId, classId } = await params, query = await searchParams;
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const [periodResult, classResult, cardsResult, allocationsResult, subjectsResult, staffResult] = await Promise.all([
    supabase.from("reporting_periods").select("id,name,template_id,starts_on,ends_on,status").eq("id", periodId).single(),
    supabase.from("classes").select("id,grade,section").eq("id", classId).single(),
    supabase.from("report_cards").select("id,student_id,status,overall_comment,published_at").eq("period_id", periodId).eq("class_id", classId).order("created_at"),
    supabase.from("class_subjects").select("id,subject_id,teacher_staff_id").eq("class_id", classId).order("created_at"),
    supabase.from("subjects").select("id,name,code").eq("organization_id", context.organizationId),
    supabase.from("staff_profiles").select("id,user_id,first_name,last_name").eq("organization_id", context.organizationId),
  ]);
  if (periodResult.error || classResult.error || cardsResult.error || allocationsResult.error || subjectsResult.error || staffResult.error) redirect("/dashboard/report-cards?error=Report+class+could+not+be+opened");
  const cards = cardsResult.data || []; if (!cards.length) redirect(`/dashboard/report-cards?period=${periodId}&error=Generate+the+class+reports+first`);
  const cardIds = cards.map((row) => row.id), studentIds = cards.map((row) => row.student_id), allocationIds = (allocationsResult.data || []).map((row) => row.id);
  const [studentsResult, rowsResult, templateResult] = await Promise.all([
    supabase.from("students").select("id,first_name,last_name,preferred_name,admission_number").in("id", studentIds).order("first_name"),
    allocationIds.length ? supabase.from("report_card_subjects").select("report_card_id,class_subject_id,grade").in("report_card_id", cardIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("report_card_templates").select("id,name,title,grading_scale,show_percentage,show_attendance,show_teacher_comments").eq("id", periodResult.data.template_id).single(),
  ]);
  if (studentsResult.error || rowsResult.error || templateResult.error) throw new Error("Report class evidence could not be loaded.");
  const students = new Map((studentsResult.data || []).map((row) => [row.id, row]));
  const subjects = new Map((subjectsResult.data || []).map((row) => [row.id, row]));
  const staff = new Map((staffResult.data || []).map((row) => [row.id, row]));
  const rows = rowsResult.data || [], complete = rows.filter((row) => row.grade?.trim()).length, expected = rows.length;
  const status = cards[0].status, locked = status !== "draft", leader = ["owner", "administrator", "principal"].includes(context.role);
  const myStaff = (staffResult.data || []).find((row) => row.user_id === context.userId);
  const allocations = (allocationsResult.data || []).filter((row) => context.role !== "teacher" || row.teacher_staff_id === myStaff?.id);
  const comments = cards.map((card) => { const student = students.get(card.student_id); return { id: card.id, name: student ? `${student.preferred_name || student.first_name} ${student.last_name}` : "Student", admission: student?.admission_number || "", comment: card.overall_comment || "" }; });
  const next = status === "draft" ? "submitted" : status === "submitted" && leader ? "approved" : status === "approved" && leader ? "published" : null;
  const nextLabel = next === "submitted" ? "Submit class for review" : next === "approved" ? "Approve class reports" : next === "published" ? "Publish to families" : "";
  return <AppShell context={context} activePath="/dashboard/report-cards" pageTitle="Report cards">
    <Link className="back-link" href={`/dashboard/report-cards?period=${periodId}`}>← Back to reporting periods</Link>
    <div className="page-head"><div><span className="eyebrow">{periodResult.data.name.toUpperCase()}</span><h1>{classResult.data.grade} · Section {classResult.data.section}</h1><p>{templateResult.data.title}. Subject contributions, overall comments and controlled publication in one place.</p></div><span className={`status ${status === "draft" || status === "submitted" ? "status-warning" : ""}`}>{reportStatusLabel(status)}</span></div>
    {query.error && <p className="form-error admin-message" role="alert">{query.error}</p>}{query.success && <p className="form-success admin-message" role="status">{query.success}</p>}
    <section className="formal-kpis"><article><span>Students</span><strong>{cards.length}</strong><small>active report cards</small></article><article><span>Subject grades</span><strong>{complete}/{expected}</strong><small>{percentage(complete, expected) || 0}% complete</small></article><article><span>Overall comments</span><strong>{comments.filter((row) => row.comment.trim()).length}/{comments.length}</strong><small>leader summaries</small></article><article><span>Workflow</span><strong>{reportStatusLabel(status)}</strong><small>{locked ? "registers locked" : "open for contribution"}</small></article></section>
    <section className="card report-workflow"><header className="card-header"><div><h2>Publication control</h2><p>Every subject grade is required before submission. Families see records only after approval and publication.</p></div>{next && <form action={advanceReportStatus}><input type="hidden" name="period_id" value={periodId}/><input type="hidden" name="class_id" value={classId}/><input type="hidden" name="status" value={next}/><button className="primary compact" disabled={next === "submitted" && complete !== expected}><span>{nextLabel}</span><span>→</span></button></form>}</header><ol><li className={status === "draft" ? "active" : "done"}><b>1</b><span>Contribute<small>Subject teachers enter grades and feedback.</small></span></li><li className={status === "submitted" ? "active" : ["approved","published"].includes(status) ? "done" : ""}><b>2</b><span>Review<small>Class record is locked for checking.</small></span></li><li className={status === "approved" ? "active" : status === "published" ? "done" : ""}><b>3</b><span>Approve<small>A school leader signs off the record.</small></span></li><li className={status === "published" ? "done" : ""}><b>4</b><span>Publish<small>Families can print the final record.</small></span></li></ol></section>
    <div className="formal-workspace class-report-workspace"><section className="card"><header className="card-header"><div><h2>Subject contributions</h2><p>Each teacher works only in their assigned subject register.</p></div><span className="status">{allocations.length}</span></header><div className="subject-contribution-list">{allocations.map((allocation) => { const subject = subjects.get(allocation.subject_id), teacher = allocation.teacher_staff_id ? staff.get(allocation.teacher_staff_id) : null, allocationRows = rows.filter((row) => row.class_subject_id === allocation.id), done = allocationRows.filter((row) => row.grade?.trim()).length; return <Link key={allocation.id} href={`/dashboard/report-cards/${periodId}/classes/${classId}/subjects/${allocation.id}`}><span className="subject-token">{subject?.code?.slice(0,4) || "SUB"}</span><div><b>{subject?.name || "Subject"}</b><small>{teacher ? `${teacher.first_name} ${teacher.last_name}` : "Teacher not assigned"}</small><div className="progress-track"><span style={{ width: `${percentage(done, allocationRows.length) || 0}%` }}/></div></div><strong>{done}/{allocationRows.length}</strong><span>Open →</span></Link>; })}{!allocations.length && <div className="report-empty"><span>◎</span><b>No subject access</b><p>Ask a school leader to allocate a subject teacher to this class.</p></div>}</div></section>
      {leader && <aside className="card"><header className="card-header"><div><h2>Overall comments</h2><p>A concise strength, evidence point and next step for each learner.</p></div></header><OverallCommentRegister periodId={periodId} classId={classId} rows={comments} locked={locked}/></aside>}
    </div>
    {status === "published" && <section className="card tab-panel"><header className="card-header"><div><h2>Published cards</h2><p>Open, print or save the final family-visible record.</p></div></header><div className="published-card-list">{cards.map((card) => { const student = students.get(card.student_id); return <Link key={card.id} href={`/dashboard/report-cards/${card.id}/print`}><span>▤</span><div><b>{student ? `${student.preferred_name || student.first_name} ${student.last_name}` : "Student"}</b><small>{student?.admission_number || "Published record"}</small></div><strong>Open →</strong></Link>; })}</div></section>}
    <p className="report-footnote">Grading scale: {parseGradeScale(templateResult.data.grading_scale).map((item) => `${item.grade} ${item.label}`).join(" · ")}</p>
  </AppShell>;
}
