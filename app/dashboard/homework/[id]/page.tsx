import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubmissionReviewForm } from "@/components/teaching/submission-review-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export default async function HomeworkDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; q?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  if (!databaseId.safeParse(id).success) notFound();
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/homework/${id}`);
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const [homeworkResult, mappingsResult, submissionsResult] = await Promise.all([
    supabase.from("homework_assignments").select("id,title,instructions,due_at,status,estimated_minutes").eq("id", id).eq("organization_id", context.organizationId).maybeSingle(),
    supabase.from("homework_classes").select("class_id").eq("homework_id", id).eq("organization_id", context.organizationId),
    supabase.from("homework_submissions").select("id,student_id,response,status,feedback,submitted_at").eq("homework_id", id).eq("organization_id", context.organizationId).order("submitted_at", { ascending: false }),
  ]);
  if (homeworkResult.error || mappingsResult.error || submissionsResult.error) throw new Error("Homework responses could not be loaded.");
  if (!homeworkResult.data) notFound();
  const classIds = (mappingsResult.data || []).map((mapping) => mapping.class_id);
  const enrollmentResult = classIds.length ? await supabase.from("class_enrollments").select("student_id").in("class_id", classIds).eq("status", "active") : { data: [], error: null };
  if (enrollmentResult.error) throw new Error("Homework roster could not be loaded.");
  const studentIds = [...new Set((enrollmentResult.data || []).map((enrollment) => enrollment.student_id))];
  const studentsResult = studentIds.length ? await supabase.from("students").select("id,first_name,last_name,admission_number").in("id", studentIds).order("first_name") : { data: [], error: null };
  if (studentsResult.error) throw new Error("Students could not be loaded.");
  const submissions = new Map((submissionsResult.data || []).map((submission) => [submission.student_id, submission]));
  const rows = (studentsResult.data || []).map((student) => ({ student, submission: submissions.get(student.id), status: submissions.get(student.id)?.status || "not_started" }));
  const counts = { submitted: rows.filter((row) => row.status === "submitted").length, completed: rows.filter((row) => row.status === "completed").length, returned: rows.filter((row) => row.status === "returned").length, not_started: rows.filter((row) => row.status === "not_started").length };
  const activeStatus = ["submitted", "completed", "returned", "not_started"].includes(query.status || "") ? query.status! : "all";
  const needle = (query.q || "").trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => (activeStatus === "all" || row.status === activeStatus) && (!needle || `${row.student.first_name} ${row.student.last_name || ""} ${row.student.admission_number}`.toLocaleLowerCase().includes(needle)));
  const due = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(homeworkResult.data.due_at));
  const statusTabs = [["all", `All (${rows.length})`], ["submitted", `Needs review (${counts.submitted})`], ["returned", `Returned (${counts.returned})`], ["not_started", `Not started (${counts.not_started})`], ["completed", `Complete (${counts.completed})`]];
  return <AppShell context={context} activePath="/dashboard/homework" pageTitle="Homework responses">
    <Link className="back-link" href="/dashboard/homework?view=assignments">← Homework</Link>
    <div className="page-head homework-detail-head"><div><span className="eyebrow">{homeworkResult.data.status.toUpperCase()} · DUE {due.toUpperCase()}</span><h1>{homeworkResult.data.title}</h1><p>{homeworkResult.data.instructions}</p></div><div className="detail-meta"><b>{homeworkResult.data.estimated_minutes || "—"}</b><small>minutes expected</small></div></div>
    <div className="teaching-metrics response-metrics"><article><small>Complete</small><strong>{counts.completed}</strong><span>accepted work</span></article><article><small>Needs review</small><strong>{counts.submitted}</strong><span>new responses</span></article><article><small>Returned</small><strong>{counts.returned}</strong><span>awaiting revision</span></article><article><small>Not started</small><strong>{counts.not_started}</strong><span>students</span></article></div>
    <section className="card"><div className="card-header response-toolbar"><div><h2>Student progress</h2><p>Review exceptions first or find any student.</p></div><form action={`/dashboard/homework/${id}`}><input type="hidden" name="status" value={activeStatus} /><label><span className="sr-only">Search students</span><input name="q" type="search" defaultValue={query.q || ""} placeholder="Search name or admission no." /></label><button className="secondary">Search</button></form></div>
      <nav className="response-filters" aria-label="Submission status">{statusTabs.map(([key, label]) => <Link key={key} href={`/dashboard/homework/${id}?status=${key}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`} className={activeStatus === key ? "active" : ""}>{label}</Link>)}</nav>
      <div className="submission-list">{filtered.map(({ student, submission, status }) => <article key={student.id}><header><div><h3>{student.first_name} {student.last_name || ""}</h3><small>{student.admission_number} · {submission?.submitted_at ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(submission.submitted_at)) : "No response yet"}</small></div><span className={`status ${status === "not_started" || status === "returned" ? "status-warning" : ""}`}>{status.replace("_", " ")}</span></header>{submission?.response && <p>{submission.response}</p>}{submission && <SubmissionReviewForm id={submission.id} homeworkId={id} feedback={submission.feedback} status={submission.status} />}</article>)}{!filtered.length && <div className="empty-state compact-empty"><span>◎</span><h2>No students match this view</h2><p>Change the status filter or search.</p></div>}</div>
    </section>
  </AppShell>;
}
