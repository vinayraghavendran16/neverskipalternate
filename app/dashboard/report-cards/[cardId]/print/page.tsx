import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/reporting/print-button";
import { getUserContext } from "@/lib/auth/context";
import { parseGradeScale } from "@/lib/formal-reports";
import { attendanceSummary, dateLabel } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";

export default async function PrintableReportCard({ params }: { params: Promise<{ cardId: string }> }) {
  const context = await getUserContext(); if (!context) redirect("/login");
  const { cardId } = await params, supabase = await createClient(); if (!supabase) redirect("/login");
  const cardResult = await supabase.from("report_cards").select("id,period_id,class_id,student_id,template_id,status,overall_comment,published_at").eq("id", cardId).maybeSingle();
  if (cardResult.error || !cardResult.data) notFound();
  const card = cardResult.data;
  if (["parent", "student"].includes(context.role) && card.status !== "published") notFound();
  const [periodResult, classResult, studentResult, templateResult, rowsResult] = await Promise.all([
    supabase.from("reporting_periods").select("name,starts_on,ends_on").eq("id", card.period_id).single(),
    supabase.from("classes").select("grade,section").eq("id", card.class_id).single(),
    supabase.from("students").select("first_name,last_name,preferred_name,admission_number").eq("id", card.student_id).single(),
    supabase.from("report_card_templates").select("title,grading_scale,show_percentage,show_attendance,show_teacher_comments").eq("id", card.template_id).single(),
    supabase.from("report_card_subjects").select("class_subject_id,grade,percentage,teacher_comment").eq("report_card_id", card.id),
  ]);
  if (periodResult.error || classResult.error || studentResult.error || templateResult.error || rowsResult.error) throw new Error("The report card could not be rendered.");
  const allocationIds = (rowsResult.data || []).map((row) => row.class_subject_id);
  const allocationsResult = allocationIds.length ? await supabase.from("class_subjects").select("id,subject_id,teacher_staff_id").in("id", allocationIds) : { data: [], error: null };
  if (allocationsResult.error) throw new Error("Report subjects could not be loaded.");
  const subjectIds = (allocationsResult.data || []).map((row) => row.subject_id), teacherIds = (allocationsResult.data || []).flatMap((row) => row.teacher_staff_id ? [row.teacher_staff_id] : []);
  const [subjectsResult, teachersResult, sessionsResult] = await Promise.all([
    subjectIds.length ? supabase.from("subjects").select("id,name,code").in("id", subjectIds) : Promise.resolve({ data: [], error: null }),
    teacherIds.length ? supabase.from("staff_profiles").select("id,first_name,last_name").in("id", teacherIds) : Promise.resolve({ data: [], error: null }),
    templateResult.data.show_attendance ? supabase.from("attendance_sessions").select("id").eq("class_id", card.class_id).gte("attendance_date", periodResult.data.starts_on).lte("attendance_date", periodResult.data.ends_on).in("status", ["submitted", "locked"]) : Promise.resolve({ data: [], error: null }),
  ]);
  if (subjectsResult.error || teachersResult.error || sessionsResult.error) throw new Error("Report evidence could not be loaded.");
  const sessionIds = (sessionsResult.data || []).map((row) => row.id);
  const attendanceResult = sessionIds.length ? await supabase.from("attendance_records").select("status").eq("student_id", card.student_id).in("session_id", sessionIds) : { data: [], error: null };
  if (attendanceResult.error) throw new Error("Attendance summary could not be loaded.");
  const attendance = attendanceSummary((attendanceResult.data || []).map((row) => row.status));
  const subjects = new Map((subjectsResult.data || []).map((row) => [row.id, row])), teachers = new Map((teachersResult.data || []).map((row) => [row.id, row])), allocations = new Map((allocationsResult.data || []).map((row) => [row.id, row]));
  const student = studentResult.data, template = templateResult.data, grades = parseGradeScale(template.grading_scale);
  const name = `${student.preferred_name || student.first_name} ${student.last_name}`;
  return <main className="print-page">
    <div className="print-toolbar"><Link href="/dashboard/report-cards">← Report cards</Link><span className={`status ${card.status !== "published" ? "status-warning" : ""}`}>{card.status}</span><PrintButton/></div>
    <article className="report-card-paper">
      <header className="report-card-brand"><div>{context.organizationLogoUrl ? <span className="report-logo" style={{ backgroundImage: `url(${context.organizationLogoUrl})` }}/> : <span className="brand-mark"><i/><i/><i/></span>}<div><b>{context.organizationName}</b><small>{context.campusName || "Academic record"}</small></div></div><span>Formal academic record</span></header>
      <section className="report-card-title"><span>{periodResult.data.name}</span><h1>{template.title}</h1><p>{dateLabel(periodResult.data.starts_on)} - {dateLabel(periodResult.data.ends_on)}</p></section>
      <dl className="student-facts"><div><dt>Student</dt><dd>{name}</dd></div><div><dt>Admission number</dt><dd>{student.admission_number}</dd></div><div><dt>Class</dt><dd>{classResult.data.grade} · Section {classResult.data.section}</dd></div><div><dt>Status</dt><dd>{card.status === "published" ? `Published ${card.published_at ? dateLabel(card.published_at) : ""}` : "Internal preview"}</dd></div></dl>
      <table className="report-card-table"><thead><tr><th>Subject</th><th>Grade</th>{template.show_percentage && <th>Percentage</th>}<th>Teacher</th></tr></thead><tbody>{(rowsResult.data || []).map((row) => { const allocation = allocations.get(row.class_subject_id), subject = allocation ? subjects.get(allocation.subject_id) : null, teacher = allocation?.teacher_staff_id ? teachers.get(allocation.teacher_staff_id) : null; return <tr key={row.class_subject_id}><td><b>{subject?.name || "Subject"}</b>{template.show_teacher_comments && row.teacher_comment && <small>{row.teacher_comment}</small>}</td><td>{row.grade || "-"}</td>{template.show_percentage && <td>{row.percentage === null ? "-" : `${Number(row.percentage)}%`}</td>}<td>{teacher ? `${teacher.first_name} ${teacher.last_name}` : "-"}</td></tr>; })}</tbody></table>
      {template.show_attendance && <section className="report-attendance"><h2>Attendance</h2><div><span><b>{attendance.rate === null ? "-" : `${attendance.rate}%`}</b><small>attendance</small></span><span><b>{attendance.present}</b><small>present</small></span><span><b>{attendance.late}</b><small>late</small></span><span><b>{attendance.excused}</b><small>excused</small></span><span><b>{attendance.absent}</b><small>absent</small></span></div></section>}
      {card.overall_comment && <section className="report-overall"><h2>Overall comment</h2><p>{card.overall_comment}</p></section>}
      <section className="grade-key"><h2>Grading key</h2><p>{grades.map((item) => `${item.grade}: ${item.label}`).join(" · ")}</p></section>
      <footer><span>Record ID {card.id}</span><span>Generated from Northstar · {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span></footer>
    </article>
  </main>;
}
