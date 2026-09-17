import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

function schoolDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ view?: string; class?: string }> }) {
  const query = await searchParams;
  const view = ["register", "create", "insights"].includes(query.view || "") ? query.view! : "register";
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/assessments");
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const [staffResult, classResult, subjectResult, allocationsResult, assessmentsResult, enrollmentsResult, marksResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
    supabase.from("classes").select("id, grade, section").eq("organization_id", context.organizationId),
    supabase.from("subjects").select("id, name, code").eq("organization_id", context.organizationId),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(1000),
    supabase.from("assessments").select("id, class_subject_id, title, assessment_date, max_marks, status, created_by").eq("organization_id", context.organizationId).order("assessment_date", { ascending: false }).limit(100),
    supabase.from("class_enrollments").select("class_id, student_id").eq("organization_id", context.organizationId).eq("status", "active").limit(10000),
    supabase.from("assessment_marks").select("assessment_id, student_id, marks, result_status").eq("organization_id", context.organizationId).limit(20000),
  ]);
  if ([staffResult, classResult, subjectResult, allocationsResult, assessmentsResult, enrollmentsResult, marksResult].some((result) => result.error)) throw new Error("Assessments could not be loaded.");
  const manager = ["owner", "administrator", "principal", "staff"].includes(context.role);
  const allocations = (allocationsResult.data || []).filter((item) => manager || item.teacher_staff_id === staffResult.data?.id);
  const allowed = new Set(allocations.map((item) => item.id));
  const classMap = new Map((classResult.data || []).map((item) => [item.id, item]));
  const subjectMap = new Map((subjectResult.data || []).map((item) => [item.id, item]));
  const allocationMap = new Map(allocations.map((item) => [item.id, item]));
  const options = allocations.map((item) => ({ id: item.id, label: `${classMap.get(item.class_id)?.grade || "Class"} ${classMap.get(item.class_id)?.section || ""} · ${subjectMap.get(item.subject_id)?.name || "Subject"}` }));
  const rosterByClass = new Map<string, Set<string>>();
  for (const row of enrollmentsResult.data || []) rosterByClass.set(row.class_id, new Set([...(rosterByClass.get(row.class_id) || []), row.student_id]));
  const marksByAssessment = new Map<string, { studentId: string; marks: number | null; result_status: string }[]>();
  for (const row of marksResult.data || []) marksByAssessment.set(row.assessment_id, [...(marksByAssessment.get(row.assessment_id) || []), { studentId: row.student_id, marks: row.marks, result_status: row.result_status }]);
  const assessments = (assessmentsResult.data || []).filter((item) => allowed.has(item.class_subject_id) && (manager || item.created_by === context.userId)).map((item) => {
    const allocation = allocationMap.get(item.class_subject_id);
    const activeRoster = allocation ? rosterByClass.get(allocation.class_id) || new Set<string>() : new Set<string>();
    const marks = (marksByAssessment.get(item.id) || []).filter((mark) => activeRoster.has(mark.studentId));
    const scored = marks.filter((mark) => mark.result_status === "scored" && mark.marks !== null);
    const expected = activeRoster.size;
    return { ...item, allocation, entered: marks.length, expected, averagePercent: scored.length ? scored.reduce((sum, mark) => sum + (Number(mark.marks) / Number(item.max_marks)) * 100, 0) / scored.length : null };
  });
  const totalExpected = assessments.reduce((sum, item) => sum + item.expected, 0);
  const totalEntered = assessments.reduce((sum, item) => sum + item.entered, 0);
  const averageValues = assessments.map((item) => item.averagePercent).filter((value): value is number => value !== null);
  const overallAverage = averageValues.length ? averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length : null;
  const requestedAllocation = allocations.find((item) => item.class_id === query.class)?.id;
  const setup = [{ label: "Create a class", done: Boolean(classResult.data?.length), href: "/dashboard/academics" }, { label: "Create a subject", done: Boolean(subjectResult.data?.length), href: "/dashboard/academics" }, { label: "Allocate the subject to a class", done: Boolean(allocationsResult.data?.length), href: classResult.data?.[0] ? `/dashboard/academics/classes/${classResult.data[0].id}` : "/dashboard/academics" }, { label: "Add students to the class roster", done: Boolean(enrollmentsResult.data?.length), href: classResult.data?.[0] ? `/dashboard/academics/classes/${classResult.data[0].id}` : "/dashboard/academics" }];
  const insights = new Map<string, { label: string; assessments: number; entered: number; expected: number; averages: number[] }>();
  for (const item of assessments) { const subject = item.allocation ? subjectMap.get(item.allocation.subject_id) : null; const key = item.allocation?.subject_id || "unknown"; const current = insights.get(key) || { label: subject?.name || "Subject", assessments: 0, entered: 0, expected: 0, averages: [] }; current.assessments += 1; current.entered += item.entered; current.expected += item.expected; if (item.averagePercent !== null) current.averages.push(item.averagePercent); insights.set(key, current); }

  return <AppShell context={context} activePath="/dashboard/assessments" pageTitle="Assessments">
    <div className="page-head"><div><span className="eyebrow">ASSESSMENTS</span><h1>Assess once. Act on the result.</h1><p>Create from the class context, enter marks rapidly, and see where support is needed.</p></div>{view !== "create" && <Link className="primary compact" href="/dashboard/assessments?view=create"><span>Create assessment</span><span>→</span></Link>}</div>
    <div className="teaching-metrics" aria-label="Assessment overview"><article><small>Open registers</small><strong>{assessments.filter((item) => item.status === "marks_open").length}</strong><span>ready for marks</span></article><article><small>Published</small><strong>{assessments.filter((item) => item.status === "published").length}</strong><span>locked results</span></article><article><small>Marks coverage</small><strong>{totalExpected ? `${Math.round((totalEntered / totalExpected) * 100)}%` : "—"}</strong><span>{totalEntered} of {totalExpected} rows</span></article><article><small>Average score</small><strong>{overallAverage === null ? "—" : `${overallAverage.toFixed(1)}%`}</strong><span>across scored work</span></article></div>
    <nav className="platform-tabs teaching-tabs" aria-label="Assessment workspace sections">{[["register", "Register"], ["create", "Create"], ["insights", "Insights"]].map(([key, label]) => <Link key={key} href={`/dashboard/assessments?view=${key}`} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}</Link>)}</nav>
    {view === "create" && <section className="card tab-panel teaching-form-card"><div className="card-header"><div><h2>New assessment</h2><p>Choose the teaching allocation once; the active roster loads automatically.</p></div></div><div className="card-body">{options.length ? <AssessmentForm allocations={options} today={schoolDate()} initialAllocationId={requestedAllocation} /> : <div className="setup-checklist"><p>Complete academic setup to unlock assessments:</p>{setup.map((step, index) => <Link href={step.href} key={step.label} className={step.done ? "done" : ""}><span>{step.done ? "✓" : index + 1}</span><b>{step.label}</b><small>{step.done ? "Complete" : "Open setup →"}</small></Link>)}</div>}</div></section>}
    {view === "register" && <section className="card tab-panel"><div className="card-header"><div><h2>Assessment register</h2><p>Continue mark entry or inspect a published result.</p></div><span className="status">{assessments.length}</span></div><div className="teaching-register">{assessments.map((item) => { const schoolClass = item.allocation ? classMap.get(item.allocation.class_id) : null; const subject = item.allocation ? subjectMap.get(item.allocation.subject_id) : null; const progress = item.expected ? Math.round((item.entered / item.expected) * 100) : 0; return <Link href={`/dashboard/assessments/${item.id}/marks`} key={item.id} className="teaching-register-row"><span className="subject-token">{subject?.code.slice(0, 4) || "ASM"}</span><div className="register-main"><div><b>{item.title}</b><span className={`status ${item.status === "published" ? "" : "status-warning"}`}>{item.status.replace("_", " ")}</span></div><small>{schoolClass ? `${schoolClass.grade} · Section ${schoolClass.section}` : "Class"} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(`${item.assessment_date}T12:00:00+05:30`))}</small><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="register-stat"><b>{item.entered}/{item.expected}</b><small>entered</small></div><div className="register-stat"><b>{item.averagePercent === null ? "—" : `${item.averagePercent.toFixed(0)}%`}</b><small>average</small></div><span className="row-arrow">→</span></Link>})}{!assessments.length && <div className="empty-state compact-empty"><span>▤</span><h2>No assessments yet</h2><p>Create one and the class roster will be ready for marks.</p><Link className="primary compact" href="/dashboard/assessments?view=create"><span>Create assessment</span><span>→</span></Link></div>}</div></section>}
    {view === "insights" && <section className="card tab-panel"><div className="card-header"><div><h2>Subject insights</h2><p>Coverage and average performance across the assessments you can access.</p></div></div><div className="insight-grid">{[...insights.entries()].map(([key, item]) => { const coverage = item.expected ? Math.round((item.entered / item.expected) * 100) : 0; const average = item.averages.length ? item.averages.reduce((sum, value) => sum + value, 0) / item.averages.length : null; return <article key={key}><span className="subject-token">{item.label.slice(0, 3).toUpperCase()}</span><div><h3>{item.label}</h3><p>{item.assessments} assessment{item.assessments === 1 ? "" : "s"}</p></div><dl><div><dt>Marks coverage</dt><dd>{coverage}%</dd></div><div><dt>Average</dt><dd>{average === null ? "—" : `${average.toFixed(1)}%`}</dd></div></dl></article>})}{!insights.size && <div className="empty-state compact-empty"><span>◎</span><h2>Insights begin after the first assessment</h2><p>Saved marks will roll up here automatically.</p></div>}</div></section>}
  </AppShell>;
}
