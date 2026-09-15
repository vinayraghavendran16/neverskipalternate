import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MarksGrid } from "@/components/assessments/marks-grid";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function MarksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const context = await getUserContext(); if (!context) redirect(`/login?next=/dashboard/assessments/${id}/marks`);
  if (!['owner','administrator','principal','teacher','staff'].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const { data: assessment } = await supabase.from("assessments").select("id, class_subject_id, title, assessment_date, max_marks, status, created_by").eq("id", id).eq("organization_id", context.organizationId).maybeSingle(); if (!assessment) notFound();
  const [{ data: allocation }, { data: staff }] = await Promise.all([
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("id", assessment.class_subject_id).maybeSingle(),
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
  ]);
  if (!allocation) notFound(); const manager = ["owner","administrator","principal","staff"].includes(context.role); if (!manager && allocation.teacher_staff_id !== staff?.id) redirect("/dashboard/assessments");
  const [{ data: schoolClass }, { data: subject }, { data: enrollments, error: enrollmentError }, { data: marks, error: marksError }] = await Promise.all([
    supabase.from("classes").select("grade, section").eq("id", allocation.class_id).maybeSingle(),
    supabase.from("subjects").select("name, code").eq("id", allocation.subject_id).maybeSingle(),
    supabase.from("class_enrollments").select("student_id").eq("class_id", allocation.class_id).eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("assessment_marks").select("student_id, marks, result_status, note").eq("assessment_id", assessment.id).eq("organization_id", context.organizationId),
  ]);
  if (enrollmentError || marksError) throw new Error("Marks could not be loaded.");
  const studentIds = (enrollments || []).map((item) => item.student_id); const { data: students, error: studentError } = studentIds.length ? await supabase.from("students").select("id, admission_number, first_name, last_name").in("id", studentIds).order("first_name") : { data: [], error: null };
  if (studentError) throw new Error("Students could not be loaded.");
  const markMap = new Map((marks || []).map((mark) => [mark.student_id, mark])); const rows = (students || []).map((student) => { const mark = markMap.get(student.id); return { studentId: student.id, name: [student.first_name, student.last_name].filter(Boolean).join(" "), admissionNumber: student.admission_number, status: (mark?.result_status || "scored") as "scored" | "absent" | "not_applicable", marks: mark?.marks === undefined ? null : mark.marks, note: mark?.note || "" }; });
  return <AppShell context={context} activePath="/dashboard/assessments" pageTitle="Marks entry"><Link className="back-link" href="/dashboard/assessments">← Assessments</Link><div className="page-head marks-head"><div><span className="eyebrow">{subject?.code || "ASSESSMENT"} · {assessment.status.toUpperCase().replace("_", " ")}</span><h1>{assessment.title}</h1><p>{schoolClass?.grade || "Class"} · Section {schoolClass?.section || ""} · {subject?.name || "Subject"} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(`${assessment.assessment_date}T12:00:00+05:30`))}</p></div><span className="max-mark-chip">Maximum <b>{assessment.max_marks}</b></span></div>{rows.length ? <section className="card"><MarksGrid assessmentId={assessment.id} maxMarks={Number(assessment.max_marks)} initialRows={rows} locked={["published", "archived"].includes(assessment.status)} /></section> : <section className="card empty-state"><span>◎</span><h2>No enrolled students</h2><p>Add students to this class before entering marks.</p><Link className="secondary" href={`/dashboard/academics/classes/${allocation.class_id}`}>Manage class roster</Link></section>}</AppShell>;
}
