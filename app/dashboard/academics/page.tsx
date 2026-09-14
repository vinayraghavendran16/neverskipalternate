import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CreateClassForm, CreateSubjectForm } from "@/components/academics/setup-forms";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function AcademicsPage() {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/academics");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const canManage = ["owner", "administrator", "principal"].includes(context.role);
  const [classResult, subjectResult, yearResult, campusResult, enrollmentResult] = await Promise.all([
    supabase.from("classes").select("id, grade, section, academic_year_id, campus_id").eq("organization_id", context.organizationId).order("grade"),
    supabase.from("subjects").select("id, name, code, status").eq("organization_id", context.organizationId).order("name"),
    supabase.from("academic_years").select("id, name").eq("organization_id", context.organizationId).eq("status", "active").order("starts_on", { ascending: false }),
    supabase.from("campuses").select("id, name").eq("organization_id", context.organizationId).order("name"),
    supabase.from("class_enrollments").select("class_id").eq("organization_id", context.organizationId).eq("status", "active"),
  ]);
  const classes = classResult.data || [], subjects = subjectResult.data || [];
  const enrollmentCounts = new Map<string, number>();
  for (const enrollment of enrollmentResult.data || []) enrollmentCounts.set(enrollment.class_id, (enrollmentCounts.get(enrollment.class_id) || 0) + 1);

  return <AppShell context={context} activePath="/dashboard/academics" pageTitle="Academics">
    <div className="page-head"><div><span className="eyebrow">ACADEMIC OPERATIONS</span><h1>Structure once. Teach daily.</h1><p>Classes, subjects, rosters and timetables share one source of truth.</p></div><Link className="primary compact" href="/dashboard/attendance"><span>Take attendance</span><span>→</span></Link></div>
    <section className="academic-metrics"><div><span>Classes</span><strong>{classes.length}</strong><small>Current structure</small></div><div><span>Subjects</span><strong>{subjects.length}</strong><small>{subjects.filter((subject) => subject.status === "active").length} active</small></div><div><span>Enrollments</span><strong>{enrollmentResult.data?.length || 0}</strong><small>Active roster entries</small></div><div><span>Academic year</span><strong>{yearResult.data?.[0]?.name || "—"}</strong><small>{campusResult.data?.length || 0} campus</small></div></section>
    <div className="academic-layout">
      <section className="card"><div className="card-header"><div><h2>Classes and sections</h2><p>Open a class to manage its roster, subjects and timetable.</p></div></div><div className="class-grid">{classes.length ? classes.map((item) => <Link className="class-tile" href={`/dashboard/academics/classes/${item.id}`} key={item.id}><span className="class-icon">{item.grade.replace(/[^0-9A-Za-z]/g, "").slice(-2) || "CL"}</span><div><b>{item.grade} · Section {item.section}</b><small>{enrollmentCounts.get(item.id) || 0} students</small></div><span>→</span></Link>) : <div className="empty-state mini-empty"><span>▦</span><h2>No classes yet</h2><p>Create the first class using the setup panel.</p></div>}</div></section>
      <aside className="academic-side">
        {canManage && <section className="card"><div className="card-header"><div><h2>Create class</h2><p>Uses the active academic year.</p></div></div><div className="card-body"><CreateClassForm academicYears={yearResult.data || []} campuses={campusResult.data || []} /></div></section>}
        <section className="card"><div className="card-header"><div><h2>Subject catalogue</h2><p>Reusable across every class.</p></div></div><div className="card-body subject-list">{subjects.map((subject) => <div key={subject.id}><span>{subject.code}</span><b>{subject.name}</b></div>)}{!subjects.length && <p className="empty-copy">No subjects created yet.</p>}</div>{canManage && <div className="card-body bordered-top"><CreateSubjectForm /></div>}</section>
      </aside>
    </div>
  </AppShell>;
}
