import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext, type UserContext } from "@/lib/auth/context";
import { attendanceSummary, average, dateLabel, percentage, periodStart, reportingBand, scorePercent } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";

type Search = { view?: string; period?: string; student?: string };
type StudentRow = { id: string; first_name: string; last_name: string | null; preferred_name?: string | null; admission_number: string };
type StudentMetric = { id: string; name: string; admission: string; classId: string; classLabel: string; attendance: ReturnType<typeof attendanceSummary>; average: number | null; assessed: number; missing: number; completed: number; assigned: number; band: ReturnType<typeof reportingBand> };

const roleTitles: Record<string, [string, string]> = {
  owner: ["School performance, with the evidence behind it.", "Move from school signals to the class and student records that explain them."],
  administrator: ["See the school clearly. Act where it matters.", "Academic, attendance, work and operational reporting in one traceable view."],
  principal: ["Teaching and learning, from school to student.", "Find incomplete records and learners who may need a closer look."],
  staff: ["Operational reporting you can act on.", "See the records available to your role and open the source workflow directly."],
  teacher: ["Every class signal, without a spreadsheet.", "Track attendance, learning evidence and incomplete work across your assigned classes."],
};

function fmt(value: number | null, suffix = "%") { return value === null ? "—" : `${value}${suffix}`; }
function name(student: StudentRow) { return `${student.preferred_name || student.first_name} ${student.last_name || ""}`.trim(); }
function currentTime() { return Date.now(); }
function ReportTabs({ tabs, active, period, student }: { tabs: [string, string][]; active: string; period: string; student?: string }) {
  return <nav className="platform-tabs report-tabs" aria-label="Report sections">{tabs.map(([key, label]) => <Link key={key} href={`/dashboard/reports?view=${key}&period=${period}${student ? `&student=${student}` : ""}`} className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined}>{label}</Link>)}</nav>;
}
function PeriodFilter({ period, view, student }: { period: string; view: string; student?: string }) {
  return <form className="report-period"><input type="hidden" name="view" value={view}/>{student && <input type="hidden" name="student" value={student}/>}<label htmlFor="period">Reporting period</label><select id="period" name="period" defaultValue={period}><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="all">All records</option></select><button className="secondary compact">Apply</button></form>;
}
function EmptyEvidence({ children }: { children: string }) { return <div className="report-empty"><span>◎</span><b>No evidence yet</b><p>{children}</p></div>; }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/reports");
  const query = await searchParams;
  const period = ["30", "90", "180", "all"].includes(query.period || "") ? query.period! : "90";
  if (context.role === "parent" || context.role === "student") return <FamilyReport context={context} query={query} period={period}/>;
  return <SchoolReport context={context} query={query} period={period}/>;
}

async function SchoolReport({ context, query, period }: { context: UserContext; query: Search; period: string }) {
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const teacher = context.role === "teacher", start = periodStart(period);
  let classesQuery = supabase.from("classes").select("id,grade,section,campus_id").eq("organization_id", context.organizationId).order("grade").limit(500);
  let studentsQuery = supabase.from("students").select("id,first_name,last_name,preferred_name,admission_number,campus_id").eq("organization_id", context.organizationId).eq("status", "active").order("first_name").limit(5000);
  if (context.campusId) { classesQuery = classesQuery.eq("campus_id", context.campusId); studentsQuery = studentsQuery.eq("campus_id", context.campusId); }
  const [staffResult, classesResult, studentsResult, enrollmentsResult, allocationsResult, subjectsResult] = await Promise.all([
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(), classesQuery, studentsQuery,
    supabase.from("class_enrollments").select("class_id,student_id").eq("organization_id", context.organizationId).eq("status", "active").limit(20000),
    supabase.from("class_subjects").select("id,class_id,subject_id,teacher_staff_id").eq("organization_id", context.organizationId).limit(5000),
    supabase.from("subjects").select("id,name,code").eq("organization_id", context.organizationId).eq("status", "active").limit(1000),
  ]);
  if ([staffResult, classesResult, studentsResult, enrollmentsResult, allocationsResult, subjectsResult].some((result) => result.error)) throw new Error("Reporting data could not be loaded.");
  const allClasses = classesResult.data || [], allAllocations = allocationsResult.data || [];
  const allocations = teacher ? allAllocations.filter((row) => row.teacher_staff_id === staffResult.data?.id) : allAllocations;
  const allowedClassIds = new Set(teacher ? allocations.map((row) => row.class_id) : allClasses.map((row) => row.id));
  const classes = allClasses.filter((row) => allowedClassIds.has(row.id));
  const classIds = classes.map((row) => row.id), allocationIds = allocations.map((row) => row.id);
  const enrollments = (enrollmentsResult.data || []).filter((row) => allowedClassIds.has(row.class_id));
  const scopedStudentIds = new Set(enrollments.map((row) => row.student_id));
  const students = (studentsResult.data || []).filter((row) => scopedStudentIds.has(row.id));
  let sessions: { id: string; class_id: string; attendance_date: string; status: string }[] = [], assessments: { id: string; class_subject_id: string; title: string; assessment_date: string; max_marks: number; status: string }[] = [], homeworkMappings: { homework_id: string; class_id: string }[] = [];
  if (classIds.length) {
    let sessionQuery = supabase.from("attendance_sessions").select("id,class_id,attendance_date,status").in("class_id", classIds).order("attendance_date", { ascending: false }).limit(10000);
    if (start) sessionQuery = sessionQuery.gte("attendance_date", start);
    let assessmentQuery = allocationIds.length ? supabase.from("assessments").select("id,class_subject_id,title,assessment_date,max_marks,status").in("class_subject_id", allocationIds).eq("status", "published").order("assessment_date", { ascending: false }).limit(5000) : null;
    if (assessmentQuery && start) assessmentQuery = assessmentQuery.gte("assessment_date", start);
    const [sessionResult, assessmentResult, mappingResult] = await Promise.all([sessionQuery, assessmentQuery || Promise.resolve({ data: [], error: null }), supabase.from("homework_classes").select("homework_id,class_id").in("class_id", classIds).limit(10000)]);
    if (sessionResult.error || assessmentResult.error || mappingResult.error) throw new Error("Reporting evidence could not be loaded.");
    sessions = sessionResult.data || []; assessments = assessmentResult.data || []; homeworkMappings = mappingResult.data || [];
  }
  const homeworkIds = [...new Set(homeworkMappings.map((row) => row.homework_id))];
  let homework: { id: string; title: string; subject_id: string; due_at: string; status: string }[] = [];
  if (homeworkIds.length) {
    let homeworkQuery = supabase.from("homework_assignments").select("id,title,subject_id,due_at,status").in("id", homeworkIds).in("status", ["published", "closed"]).order("due_at", { ascending: false }).limit(5000);
    if (start) homeworkQuery = homeworkQuery.gte("due_at", `${start}T00:00:00+05:30`);
    const result = await homeworkQuery; if (result.error) throw new Error("Homework reporting data could not be loaded."); homework = result.data || [];
  }
  const sessionIds = sessions.map((row) => row.id), assessmentIds = assessments.map((row) => row.id), scopedHomeworkIds = homework.map((row) => row.id);
  const [recordsResult, marksResult, submissionsResult, invoicesResult] = await Promise.all([
    sessionIds.length ? supabase.from("attendance_records").select("session_id,student_id,status").in("session_id", sessionIds).limit(50000) : Promise.resolve({ data: [], error: null }),
    assessmentIds.length ? supabase.from("assessment_marks").select("assessment_id,student_id,marks,result_status").in("assessment_id", assessmentIds).limit(50000) : Promise.resolve({ data: [], error: null }),
    scopedHomeworkIds.length ? supabase.from("homework_submissions").select("homework_id,student_id,status").in("homework_id", scopedHomeworkIds).limit(50000) : Promise.resolve({ data: [], error: null }),
    teacher ? Promise.resolve({ data: [], error: null }) : supabase.from("fee_invoices").select("amount,paid_amount,status").eq("organization_id", context.organizationId).not("status", "in", "(waived,cancelled)").limit(20000),
  ]);
  if ([recordsResult, marksResult, submissionsResult, invoicesResult].some((result) => result.error)) throw new Error("Report calculations could not be loaded.");
  const classMap = new Map(classes.map((row) => [row.id, row])), allocationMap = new Map(allocations.map((row) => [row.id, row]));
  const assessmentMap = new Map(assessments.map((row) => [row.id, row])), homeworkMap = new Map(homework.map((row) => [row.id, row]));
  const enrollmentByStudent = new Map(enrollments.map((row) => [row.student_id, row.class_id]));
  const homeworkClasses = new Map<string, Set<string>>(); for (const row of homeworkMappings) if (homeworkMap.has(row.homework_id)) homeworkClasses.set(row.homework_id, new Set([...(homeworkClasses.get(row.homework_id) || []), row.class_id]));
  const submissionKey = new Map((submissionsResult.data || []).map((row) => [`${row.homework_id}:${row.student_id}`, row.status]));
  const attendanceByStudent = new Map<string, string[]>();
  for (const row of recordsResult.data || []) attendanceByStudent.set(row.student_id, [...(attendanceByStudent.get(row.student_id) || []), row.status]);
  const scoresByStudent = new Map<string, number[]>();
  for (const row of marksResult.data || []) { const item = assessmentMap.get(row.assessment_id), value = row.result_status === "scored" && item ? scorePercent(Number(row.marks), Number(item.max_marks)) : null; if (value !== null) scoresByStudent.set(row.student_id, [...(scoresByStudent.get(row.student_id) || []), value]); }
  const homeworkByClass = new Map<string, typeof homework>();
  for (const item of homework) for (const classId of homeworkClasses.get(item.id) || []) homeworkByClass.set(classId, [...(homeworkByClass.get(classId) || []), item]);
  const rosterCount = new Map<string, number>(); for (const row of enrollments) rosterCount.set(row.class_id, (rosterCount.get(row.class_id) || 0) + 1);
  const now = currentTime();
  const studentMetrics: StudentMetric[] = students.map((student) => {
    const classId = enrollmentByStudent.get(student.id) || "", schoolClass = classMap.get(classId);
    const statuses = attendanceByStudent.get(student.id) || [];
    const scores = scoresByStudent.get(student.id) || [];
    const assignedWork = homeworkByClass.get(classId) || [];
    const missing = assignedWork.filter((item) => new Date(item.due_at).getTime() < now && !["submitted", "completed"].includes(submissionKey.get(`${item.id}:${student.id}`) || "")).length;
    const completed = assignedWork.filter((item) => ["submitted", "completed"].includes(submissionKey.get(`${item.id}:${student.id}`) || "")).length;
    const attendance = attendanceSummary(statuses), averageScore = average(scores);
    return { id: student.id, name: name(student), admission: student.admission_number, classId, classLabel: schoolClass ? `${schoolClass.grade} ${schoolClass.section}` : "No active class", attendance, average: averageScore, assessed: scores.length, missing, completed, assigned: assignedWork.length, band: reportingBand({ attendanceRate: attendance.rate, averageScore, missingWork: missing }) };
  }).sort((a, b) => (a.band.key === "review" ? 0 : a.band.key === "watch" ? 1 : 2) - (b.band.key === "review" ? 0 : b.band.key === "watch" ? 1 : 2) || a.name.localeCompare(b.name));
  const metricsByClass = new Map<string, StudentMetric[]>(); for (const row of studentMetrics) metricsByClass.set(row.classId, [...(metricsByClass.get(row.classId) || []), row]);
  const classMetrics = classes.map((schoolClass) => { const rows = metricsByClass.get(schoolClass.id) || []; return { id: schoolClass.id, label: `${schoolClass.grade} · Section ${schoolClass.section}`, students: rows.length, attendance: average(rows.map((row) => row.attendance.rate).filter((value): value is number => value !== null)), score: average(rows.map((row) => row.average).filter((value): value is number => value !== null)), review: rows.filter((row) => row.band.key === "review").length, missing: rows.reduce((sum, row) => sum + row.missing, 0) }; });
  const attendance = attendanceSummary((recordsResult.data || []).map((row) => row.status));
  const scoredMarks = (marksResult.data || []).filter((row) => row.result_status === "scored").map((row) => { const assessment = assessmentMap.get(row.assessment_id); return assessment ? scorePercent(Number(row.marks), Number(assessment.max_marks)) : null; }).filter((value): value is number => value !== null);
  const expectedMarks = assessments.reduce((sum, item) => { const allocation = allocationMap.get(item.class_subject_id); return sum + (rosterCount.get(allocation?.class_id || "") || 0); }, 0);
  const completedWork = (submissionsResult.data || []).filter((row) => ["submitted", "completed"].includes(row.status)).length;
  const expectedWork = homework.reduce((sum, item) => [...(homeworkClasses.get(item.id) || [])].reduce((count, classId) => count + (rosterCount.get(classId) || 0), sum), 0);
  const invoices = invoicesResult.data || [], billed = invoices.reduce((sum, row) => sum + Number(row.amount), 0), paid = invoices.reduce((sum, row) => sum + Number(row.paid_amount), 0);
  const validViews = teacher ? ["overview", "classes", "students"] : ["overview", "classes", "students", "operations"];
  const view = validViews.includes(query.view || "") ? query.view! : "overview";
  const titles = roleTitles[context.role] || roleTitles.staff;
  const tabs: [string, string][] = teacher ? [["overview", "Overview"], ["classes", "My classes"], ["students", "Student signals"]] : [["overview", "Overview"], ["classes", "Classes"], ["students", "Student signals"], ["operations", "Operations"]];
  const submittedRegisters = sessions.filter((row) => ["submitted", "locked"].includes(row.status)).length;
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  return <AppShell context={context} activePath="/dashboard/reports" pageTitle="Reports">
    <div className="page-head report-head"><div><span className="eyebrow">{teacher ? "TEACHER REPORTING" : "SCHOOL REPORTING"}</span><h1>{titles[0]}</h1><p>{titles[1]}</p></div><PeriodFilter period={period} view={view}/></div>
    <section className="report-trust-note"><b>Evidence, not an opaque score.</b><span>Signals use recorded attendance, published assessments and assigned work in the selected period. Open any row to verify the source workflow.</span></section>
    <section className="report-kpis"><Link href="/dashboard/attendance"><span>Attendance</span><strong>{fmt(attendance.rate)}</strong><small>{attendance.total} learner records →</small></Link><Link href="/dashboard/assessments?view=insights"><span>Published average</span><strong>{fmt(average(scoredMarks))}</strong><small>{scoredMarks.length} scored results →</small></Link><Link href="/dashboard/homework?view=review"><span>Work completion</span><strong>{fmt(percentage(completedWork, expectedWork))}</strong><small>{completedWork} of {expectedWork} responses →</small></Link><a href="#needs-review"><span>Needs review</span><strong>{studentMetrics.filter((row) => row.band.key === "review").length}</strong><small>Deterministic exceptions ↓</small></a></section>
    <ReportTabs tabs={tabs} active={view} period={period}/>
    {view === "overview" && <div className="report-overview"><section className="card"><header className="card-header"><div><h2>Class snapshot</h2><p>Compare classes, then open the workflow behind each signal.</p></div><Link className="text-link" href={`/dashboard/reports?view=classes&period=${period}`}>All classes →</Link></header><ClassTable rows={classMetrics.slice(0, 6)}/></section><section className="card" id="needs-review"><header className="card-header"><div><h2>Needs a closer look</h2><p>Visible rules: attendance below 75%, average below 50%, or two overdue tasks.</p></div><span className="status status-warning">{studentMetrics.filter((row) => row.band.key === "review").length}</span></header><StudentTable rows={studentMetrics.filter((row) => row.band.key !== "on_track").slice(0, 8)}/></section></div>}
    {view === "classes" && <section className="card tab-panel"><header className="card-header"><div><h2>{teacher ? "My class reporting" : "Class reporting"}</h2><p>Attendance, published results, incomplete work and student exceptions.</p></div><span className="status">{classMetrics.length}</span></header><ClassTable rows={classMetrics}/></section>}
    {view === "students" && <section className="card tab-panel" id="needs-review"><header className="card-header"><div><h2>Student signals</h2><p>Prioritised from recorded evidence. “Needs review” is a prompt for a human conversation, not a prediction.</p></div><span className="status">{studentMetrics.length}</span></header><StudentTable rows={studentMetrics}/></section>}
    {view === "operations" && <div className="operations-report"><section className="report-kpis operations-kpis"><Link href="/dashboard/attendance"><span>Submitted registers</span><strong>{submittedRegisters}/{sessions.length}</strong><small>{sessions.length - submittedRegisters} drafts →</small></Link><Link href="/dashboard/assessments"><span>Marks coverage</span><strong>{fmt(percentage((marksResult.data || []).length, expectedMarks))}</strong><small>{(marksResult.data || []).length} of {expectedMarks} rows →</small></Link><Link href="/dashboard/academics?view=allocations"><span>Unstaffed allocations</span><strong>{allocations.filter((row) => !row.teacher_staff_id).length}</strong><small>Assign teachers →</small></Link><Link href="/dashboard/finance"><span>Fee collection</span><strong>{fmt(percentage(paid, billed))}</strong><small>{money.format(Math.max(0, billed - paid))} outstanding →</small></Link></section><section className="card report-method"><h2>How to read this report</h2><div><article><b>Attendance</b><p>Present and late count as attended. Excused absence remains visible but is not counted as attended.</p></article><article><b>Assessment average</b><p>Each scored, published result is converted to a percentage before averaging. Draft assessments are excluded.</p></article><article><b>Work completion</b><p>Submitted and teacher-completed responses count as complete. Published and closed assignments in the selected period form the denominator.</p></article><article><b>Scope</b><p>{context.campusName ? `Restricted to ${context.campusName}.` : "Includes every branch available to this account."} The period applies to attendance dates, assessment dates and homework due dates.</p></article></div></section></div>}
  </AppShell>;
}

function ClassTable({ rows }: { rows: { id: string; label: string; students: number; attendance: number | null; score: number | null; review: number; missing: number }[] }) {
  if (!rows.length) return <EmptyEvidence>Classes and active rosters will appear here after academic setup.</EmptyEvidence>;
  return <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Class</th><th>Students</th><th>Attendance</th><th>Published avg.</th><th>Overdue work</th><th>Review</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.label}</b></td><td>{row.students}</td><td>{fmt(row.attendance)}</td><td>{fmt(row.score)}</td><td>{row.missing}</td><td><span className={`signal-pill ${row.review ? "review" : "on-track"}`}>{row.review ? `${row.review} review` : "On track"}</span></td><td><Link aria-label={`Open ${row.label}`} href={`/dashboard/academics/classes/${row.id}`}>→</Link></td></tr>)}</tbody></table></div>;
}

function StudentTable({ rows }: { rows: StudentMetric[] }) {
  if (!rows.length) return <EmptyEvidence>No student exceptions are visible in this period.</EmptyEvidence>;
  return <div className="report-table-wrap"><table className="report-table student-report-table"><thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Published avg.</th><th>Work</th><th>Signal</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.name}</b><small>{row.admission}</small></td><td>{row.classLabel}</td><td>{fmt(row.attendance.rate)}<small>{row.attendance.total} records</small></td><td>{fmt(row.average)}<small>{row.assessed} scores</small></td><td>{row.completed}/{row.assigned}<small>{row.missing} overdue</small></td><td><span className={`signal-pill ${row.band.key.replace("_", "-")}`}>{row.band.label}</span>{row.band.reasons.length > 0 && <small>{row.band.reasons.join(" · ")}</small>}</td><td><Link aria-label={`Open ${row.name}`} href={`/dashboard/people/students/${row.id}`}>→</Link></td></tr>)}</tbody></table></div>;
}

async function FamilyReport({ context, query, period }: { context: UserContext; query: Search; period: string }) {
  const supabase = await createClient(); if (!supabase) redirect("/login");
  const studentsResult = await supabase.from("students").select("id,first_name,last_name,preferred_name,admission_number").eq("organization_id", context.organizationId).eq("status", "active").order("first_name");
  if (studentsResult.error) throw new Error("Linked students could not be loaded.");
  const students = studentsResult.data || [], student = students.find((row) => row.id === query.student) || students[0];
  if (!student) return <AppShell context={context} activePath="/dashboard/reports" pageTitle="Reports"><section className="card card-body"><h1>No student is linked yet</h1><p>Ask the school office to connect this account to a student record.</p></section></AppShell>;
  const start = periodStart(period);
  const enrollmentsResult = await supabase.from("class_enrollments").select("class_id").eq("organization_id", context.organizationId).eq("student_id", student.id).eq("status", "active");
  if (enrollmentsResult.error) throw new Error("Student class could not be loaded.");
  const classIds = (enrollmentsResult.data || []).map((row) => row.class_id);
  const [classesResult, allocationsResult, subjectsResult, mappingsResult] = await Promise.all([
    classIds.length ? supabase.from("classes").select("id,grade,section").in("id", classIds) : Promise.resolve({ data: [], error: null }),
    classIds.length ? supabase.from("class_subjects").select("id,class_id,subject_id").in("class_id", classIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("subjects").select("id,name,code").eq("organization_id", context.organizationId),
    classIds.length ? supabase.from("homework_classes").select("homework_id,class_id").in("class_id", classIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if ([classesResult, allocationsResult, subjectsResult, mappingsResult].some((result) => result.error)) throw new Error("Student reporting context could not be loaded.");
  const allocationIds = (allocationsResult.data || []).map((row) => row.id), homeworkIds = [...new Set((mappingsResult.data || []).map((row) => row.homework_id))];
  let sessionsQuery = classIds.length ? supabase.from("attendance_sessions").select("id,attendance_date,status").in("class_id", classIds).in("status", ["submitted", "locked"]).order("attendance_date", { ascending: false }).limit(1000) : null;
  if (sessionsQuery && start) sessionsQuery = sessionsQuery.gte("attendance_date", start);
  let assessmentsQuery = allocationIds.length ? supabase.from("assessments").select("id,class_subject_id,title,assessment_date,max_marks").in("class_subject_id", allocationIds).eq("status", "published").order("assessment_date", { ascending: false }).limit(1000) : null;
  if (assessmentsQuery && start) assessmentsQuery = assessmentsQuery.gte("assessment_date", start);
  let homeworkQuery = homeworkIds.length ? supabase.from("homework_assignments").select("id,subject_id,title,due_at,status").in("id", homeworkIds).in("status", ["published", "closed"]).order("due_at", { ascending: false }).limit(1000) : null;
  if (homeworkQuery && start) homeworkQuery = homeworkQuery.gte("due_at", `${start}T00:00:00+05:30`);
  const [sessionsResult, assessmentsResult, homeworkResult] = await Promise.all([sessionsQuery || Promise.resolve({ data: [], error: null }), assessmentsQuery || Promise.resolve({ data: [], error: null }), homeworkQuery || Promise.resolve({ data: [], error: null })]);
  if (sessionsResult.error || assessmentsResult.error || homeworkResult.error) throw new Error("Published report evidence could not be loaded.");
  const sessions = sessionsResult.data || [], assessments = assessmentsResult.data || [], homework = homeworkResult.data || [];
  const [recordsResult, marksResult, submissionsResult] = await Promise.all([
    sessions.length ? supabase.from("attendance_records").select("session_id,status").eq("student_id", student.id).in("session_id", sessions.map((row) => row.id)) : Promise.resolve({ data: [], error: null }),
    assessments.length ? supabase.from("assessment_marks").select("assessment_id,marks,result_status,note").eq("student_id", student.id).in("assessment_id", assessments.map((row) => row.id)) : Promise.resolve({ data: [], error: null }),
    homework.length ? supabase.from("homework_submissions").select("homework_id,status,feedback").eq("student_id", student.id).in("homework_id", homework.map((row) => row.id)) : Promise.resolve({ data: [], error: null }),
  ]);
  if (recordsResult.error || marksResult.error || submissionsResult.error) throw new Error("Student report could not be calculated.");
  const view = ["overview", "subjects", "attendance", "work"].includes(query.view || "") ? query.view! : "overview";
  const subjectMap = new Map((subjectsResult.data || []).map((row) => [row.id, row])), allocationMap = new Map((allocationsResult.data || []).map((row) => [row.id, row]));
  const markMap = new Map((marksResult.data || []).map((row) => [row.assessment_id, row])), submissionMap = new Map((submissionsResult.data || []).map((row) => [row.homework_id, row]));
  const attendance = attendanceSummary((recordsResult.data || []).map((row) => row.status));
  const scored = assessments.map((item) => { const mark = markMap.get(item.id), allocation = allocationMap.get(item.class_subject_id), subject = allocation ? subjectMap.get(allocation.subject_id) : null; return { ...item, mark, subject, percent: mark?.result_status === "scored" ? scorePercent(Number(mark.marks), Number(item.max_marks)) : null }; });
  const scoreAverage = average(scored.map((row) => row.percent).filter((value): value is number => value !== null));
  const work = homework.map((item) => ({ ...item, submission: submissionMap.get(item.id), subject: subjectMap.get(item.subject_id) }));
  const now = currentTime();
  const overdueWork = work.filter((item) => new Date(item.due_at).getTime() < now && !["submitted", "completed"].includes(item.submission?.status || ""));
  const missing = overdueWork.length;
  const complete = work.filter((item) => ["submitted", "completed"].includes(item.submission?.status || "")).length;
  const bySubject = new Map<string, { name: string; scores: number[]; latest: string | null }>();
  for (const item of scored) { const key = item.subject?.id || "unknown", current = bySubject.get(key) || { name: item.subject?.name || "Subject", scores: [], latest: null }; if (item.percent !== null) current.scores.push(item.percent); if (!current.latest) current.latest = item.assessment_date; bySubject.set(key, current); }
  const displayName = student.preferred_name || student.first_name, possessive = context.role === "student" ? "Your" : `${displayName}’s`;
  const band = reportingBand({ attendanceRate: attendance.rate, averageScore: scoreAverage, missingWork: missing });
  const schoolClass = classesResult.data?.[0];
  const tabs: [string, string][] = [["overview", "Overview"], ["subjects", "Subjects"], ["attendance", "Attendance"], ["work", "Work"]];
  return <AppShell context={context} activePath="/dashboard/reports" pageTitle={context.role === "student" ? "My progress" : "Child reports"}>
    <div className="page-head report-head"><div><span className="eyebrow">{context.role === "student" ? "MY PROGRESS" : "FAMILY REPORT"}</span><h1>{possessive} progress, clearly explained.</h1><p>{schoolClass ? `${schoolClass.grade} · Section ${schoolClass.section}. ` : ""}Published school records, upcoming actions and teacher feedback in one view.</p></div><PeriodFilter period={period} view={view} student={student.id}/></div>
    {students.length > 1 && <nav className="student-switcher report-student-switcher" aria-label="Select student">{students.map((row) => <Link key={row.id} className={row.id === student.id ? "active" : ""} href={`/dashboard/reports?student=${row.id}&period=${period}&view=${view}`}>{row.preferred_name || row.first_name}</Link>)}</nav>}
    <section className="report-kpis"><a href="#report-detail"><span>Attendance</span><strong>{fmt(attendance.rate)}</strong><small>{attendance.total} recorded sessions ↓</small></a><a href="#report-detail"><span>Published average</span><strong>{fmt(scoreAverage)}</strong><small>{scored.filter((row) => row.percent !== null).length} scored results ↓</small></a><a href="#report-detail"><span>Work completed</span><strong>{fmt(percentage(complete, work.length))}</strong><small>{complete} of {work.length} assignments ↓</small></a><a href="#actions"><span>Next actions</span><strong>{missing}</strong><small>overdue assignments ↓</small></a></section>
    <ReportTabs tabs={tabs} active={view} period={period} student={student.id}/>
    {view === "overview" && <div className="report-overview" id="report-detail"><section className="card family-signal"><header className="card-header"><div><h2>Progress snapshot</h2><p>A starting point for a conversation with the school.</p></div><span className={`signal-pill ${band.key.replace("_", "-")}`}>{band.label}</span></header><div className="family-signal-body"><div className="attendance-ring" style={{ "--value": `${attendance.rate || 0}%` } as React.CSSProperties}><b>{fmt(attendance.rate)}</b><small>attendance</small></div><div><h3>{band.key === "review" ? "A closer look may help" : band.key === "watch" ? "Keep an eye on the current pattern" : "Current records look on track"}</h3><p>{band.reasons.length ? band.reasons.join(" · ") : "No threshold-based exceptions are visible in this period."}</p><small>These rules use attendance below 75%, a published average below 50%, or two overdue tasks. They do not predict a learner’s potential.</small></div></div></section><section className="card" id="actions"><header className="card-header"><div><h2>What needs attention</h2><p>Specific records you can open and resolve.</p></div></header><div className="family-actions">{overdueWork.slice(0, 5).map((item) => <Link href="/dashboard/learning#homework" key={item.id}><span>↗</span><div><b>{item.title}</b><small>{item.subject?.name || "Subject"} · due {dateLabel(item.due_at)}</small></div><strong>Open →</strong></Link>)}{!missing && <div className="report-empty compact"><span>✓</span><b>No overdue work</b><p>Published assignments in this period are up to date.</p></div>}</div></section></div>}
    {view === "subjects" && <section className="card tab-panel" id="report-detail"><header className="card-header"><div><h2>Subject progress</h2><p>Only published, scored assessments appear here.</p></div><span className="status">{bySubject.size}</span></header><div className="subject-report-grid">{[...bySubject.entries()].map(([id, item]) => <article key={id}><span className="subject-token">{item.name.slice(0, 3).toUpperCase()}</span><div><b>{item.name}</b><small>{item.scores.length} scored result{item.scores.length === 1 ? "" : "s"}</small></div><strong>{fmt(average(item.scores))}</strong><small>{item.latest ? `Latest ${dateLabel(item.latest)}` : "No score"}</small></article>)}{!bySubject.size && <EmptyEvidence>Published assessment results will appear by subject.</EmptyEvidence>}</div></section>}
    {view === "attendance" && <section className="card tab-panel" id="report-detail"><header className="card-header"><div><h2>Attendance breakdown</h2><p>Late counts as attended in the headline rate; every status remains visible.</p></div></header><div className="attendance-breakdown"><article><span>Present</span><strong>{attendance.present}</strong></article><article><span>Late</span><strong>{attendance.late}</strong></article><article><span>Excused</span><strong>{attendance.excused}</strong></article><article><span>Absent</span><strong>{attendance.absent}</strong></article></div>{!attendance.total && <EmptyEvidence>Submitted attendance records will appear here.</EmptyEvidence>}<div className="report-source-link"><Link href="/dashboard/learning">Return to the daily learning view →</Link></div></section>}
    {view === "work" && <section className="card tab-panel" id="report-detail"><header className="card-header"><div><h2>Assignment record</h2><p>Due dates, response status and teacher feedback.</p></div><span className="status">{work.length}</span></header><div className="work-report-list">{work.map((item) => <article key={item.id}><span className="subject-token">{item.subject?.code?.slice(0, 4) || "HW"}</span><div><b>{item.title}</b><small>{item.subject?.name || "Subject"} · due {dateLabel(item.due_at)}</small>{item.submission?.feedback && <p>Teacher: {item.submission.feedback}</p>}</div><span className={`status ${!["submitted", "completed"].includes(item.submission?.status || "") ? "status-warning" : ""}`}>{item.submission?.status || "not started"}</span></article>)}{!work.length && <EmptyEvidence>Published assignments in this period will appear here.</EmptyEvidence>}</div></section>}
    <p className="report-footnote">Reporting period: {period === "all" ? "all available records" : `last ${period} days`}. Draft assessments and draft homework are excluded.</p>
  </AppShell>;
}
