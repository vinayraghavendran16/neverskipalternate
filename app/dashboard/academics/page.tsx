import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreateClassForm, CreateSubjectForm } from "@/components/academics/setup-forms";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

const tabs = [["classes", "Classes"], ["subjects", "Subjects"], ["setup", "Academic setup"]] as const;

export default async function AcademicsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/academics");
  if (!["owner", "administrator", "principal", "teacher", "staff"].includes(context.role)) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const canManage = ["owner", "administrator", "principal"].includes(context.role);
  const requestedView = (await searchParams).view || "classes";
  const view = tabs.some(([key]) => key === requestedView) && (canManage || requestedView !== "setup") ? requestedView : "classes";
  const [classResult, subjectResult, yearResult, campusResult, enrollmentResult, allocationResult, timetableResult, staffResult] = await Promise.all([
    supabase.from("classes").select("id, grade, section, academic_year_id, campus_id, homeroom_teacher_user_id").eq("organization_id", context.organizationId).order("grade").order("section"),
    supabase.from("subjects").select("id, name, code, status").eq("organization_id", context.organizationId).order("name"),
    supabase.from("academic_years").select("id, name").eq("organization_id", context.organizationId).eq("status", "active").order("starts_on", { ascending: false }),
    supabase.from("campuses").select("id, name").eq("organization_id", context.organizationId).order("name"),
    supabase.from("class_enrollments").select("class_id").eq("organization_id", context.organizationId).eq("status", "active"),
    supabase.from("class_subjects").select("id, class_id, subject_id, teacher_staff_id").eq("organization_id", context.organizationId).limit(2000),
    supabase.from("timetable_entries").select("class_id").eq("organization_id", context.organizationId).limit(5000),
    supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle(),
  ]);
  if ([classResult, subjectResult, yearResult, campusResult, enrollmentResult, allocationResult, timetableResult, staffResult].some((result) => result.error)) throw new Error("Academic workspace could not be loaded.");

  const allocations = allocationResult.data || [];
  const teacherClassIds = new Set(allocations.filter((item) => item.teacher_staff_id === staffResult.data?.id).map((item) => item.class_id));
  const allClasses = classResult.data || [];
  const classes = context.role === "teacher" ? allClasses.filter((item) => item.homeroom_teacher_user_id === context.userId || teacherClassIds.has(item.id)) : allClasses;
  const visibleClassIds = new Set(classes.map((item) => item.id));
  const subjects = subjectResult.data || [];
  const enrollmentCounts = new Map<string, number>();
  const allocationCounts = new Map<string, number>();
  const timetableCounts = new Map<string, number>();
  const subjectClassCounts = new Map<string, number>();
  for (const item of enrollmentResult.data || []) enrollmentCounts.set(item.class_id, (enrollmentCounts.get(item.class_id) || 0) + 1);
  for (const item of allocations) {
    allocationCounts.set(item.class_id, (allocationCounts.get(item.class_id) || 0) + 1);
    if (visibleClassIds.has(item.class_id)) subjectClassCounts.set(item.subject_id, (subjectClassCounts.get(item.subject_id) || 0) + 1);
  }
  for (const item of timetableResult.data || []) timetableCounts.set(item.class_id, (timetableCounts.get(item.class_id) || 0) + 1);

  return <AppShell context={context} activePath="/dashboard/academics" pageTitle="Academics">
    <div className="page-head"><div><span className="eyebrow">ACADEMIC WORKSPACE</span><h1>{context.role === "teacher" ? "Your classes, ready to teach." : "Set up once. Run every class."}</h1><p>{context.role === "teacher" ? "Open an assigned class and move straight into today’s work." : "Keep rosters, subject ownership and timetables clear without mixing daily work with setup."}</p></div><Link className="primary compact" href="/dashboard/attendance"><span>Take attendance</span><span>→</span></Link></div>
    <section className="academic-metrics"><div><span>{context.role === "teacher" ? "My classes" : "Classes"}</span><strong>{classes.length}</strong><small>{context.role === "teacher" ? "Assigned to you" : "Current structure"}</small></div><div><span>Subjects</span><strong>{subjects.length}</strong><small>{subjects.filter((subject) => subject.status === "active").length} active</small></div><div><span>Students</span><strong>{[...enrollmentCounts.entries()].filter(([classId]) => visibleClassIds.has(classId)).reduce((sum, [, count]) => sum + count, 0)}</strong><small>Active roster entries</small></div><div><span>Academic year</span><strong>{yearResult.data?.[0]?.name || "—"}</strong><small>{campusResult.data?.length || 0} campus{campusResult.data?.length === 1 ? "" : "es"}</small></div></section>
    <nav className="platform-tabs academics-tabs" aria-label="Academic workspace sections">{tabs.filter(([key]) => canManage || key !== "setup").map(([key, label]) => <Link key={key} href={`/dashboard/academics?view=${key}`} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""}>{label}</Link>)}</nav>

    {view === "classes" && <section className="card academic-panel"><div className="card-header"><div><h2>{context.role === "teacher" ? "My classes" : "Classes and sections"}</h2><p>Readiness shows what is in place before teaching begins.</p></div><span className="status">{classes.length} class{classes.length === 1 ? "" : "es"}</span></div><div className="class-workspace-grid">{classes.length ? classes.map((item) => {
      const studentCount = enrollmentCounts.get(item.id) || 0, subjectCount = allocationCounts.get(item.id) || 0, periodCount = timetableCounts.get(item.id) || 0;
      const ready = studentCount > 0 && subjectCount > 0;
      return <Link className="class-workspace-card" href={`/dashboard/academics/classes/${item.id}`} key={item.id}><header><span className="class-icon">{item.grade.replace(/[^0-9A-Za-z]/g, "").slice(-2) || "CL"}</span><span className={`status ${ready ? "" : "status-warning"}`}>{ready ? "Ready" : "Needs setup"}</span></header><h3>{item.grade} · Section {item.section}</h3><div className="class-readiness"><span><b>{studentCount}</b> students</span><span><b>{subjectCount}</b> subjects</span><span><b>{periodCount}</b> periods</span></div><footer><span>{context.role === "teacher" ? "Open class workspace" : "Manage class"}</span><b>→</b></footer></Link>;
    }) : <div className="empty-state mini-empty"><span>▦</span><h2>{context.role === "teacher" ? "No classes assigned" : "No classes yet"}</h2><p>{context.role === "teacher" ? "Ask an academic manager to allocate you to a subject or class." : "Open Academic setup to create the first class."}</p>{canManage && <Link className="secondary" href="/dashboard/academics?view=setup">Open setup</Link>}</div>}</div></section>}

    {view === "subjects" && <section className="card academic-panel"><div className="card-header"><div><h2>Subject catalogue</h2><p>One reusable catalogue across classes, teachers, homework and assessments.</p></div><span className="status">{subjects.length} subjects</span></div><div className="subject-directory">{subjects.map((subject) => <div key={subject.id}><span>{subject.code}</span><div><b>{subject.name}</b><small>{subjectClassCounts.get(subject.id) || 0} class allocation{subjectClassCounts.get(subject.id) === 1 ? "" : "s"}</small></div><span className={`status ${subject.status === "active" ? "" : "status-warning"}`}>{subject.status}</span></div>)}{!subjects.length && <p className="empty-copy">No subjects created yet.</p>}</div>{canManage && <div className="card-body bordered-top academic-inline-editor"><h3 className="section-title">Add a reusable subject</h3><CreateSubjectForm /></div>}</section>}

    {view === "setup" && canManage && <div className="academic-setup-stack"><section className="card"><div className="card-header"><div><h2>Create a class</h2><p>Add the grade and section; the roster, subjects and timetable are completed inside its workspace.</p></div></div><div className="card-body academic-inline-editor"><CreateClassForm academicYears={yearResult.data || []} campuses={campusResult.data || []} /></div></section><section className="setup-guidance"><b>Recommended order</b><span>1. Create the class</span><span>2. Add students</span><span>3. Allocate subjects and teachers</span><span>4. Build the timetable</span></section></div>}
  </AppShell>;
}
