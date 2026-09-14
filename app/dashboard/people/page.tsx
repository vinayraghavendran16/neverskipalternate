import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type Tab = "students" | "staff" | "guardians";
type SearchParams = Promise<{ tab?: string; q?: string; status?: string }>;

function nameOf(record: { first_name: string; last_name: string | null }) {
  return [record.first_name, record.last_name].filter(Boolean).join(" ");
}

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/people");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const params = await searchParams;
  const tab: Tab = params.tab === "staff" || params.tab === "guardians" ? params.tab : "students";
  const query = (params.q || "").trim().toLowerCase();
  const status = params.status || "all";

  const [studentResult, staffResult, guardianResult] = await Promise.all([
    supabase.from("students").select("id, admission_number, first_name, last_name, preferred_name, email, phone, status, campus_id").eq("organization_id", context.organizationId).order("first_name").limit(500),
    supabase.from("staff_profiles").select("id, employee_number, first_name, last_name, email, phone, designation, department, status, campus_id").eq("organization_id", context.organizationId).order("first_name").limit(500),
    supabase.from("guardians").select("id, first_name, last_name, email, phone, occupation, status").eq("organization_id", context.organizationId).order("first_name").limit(500),
  ]);

  const students = studentResult.data || [];
  const staff = staffResult.data || [];
  const guardians = guardianResult.data || [];
  const source = tab === "students" ? students : tab === "staff" ? staff : guardians;
  const filtered = source.filter((record) => {
    const searchable = Object.values(record).filter((entry) => typeof entry === "string").join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (status === "all" || record.status === status);
  });
  const canManage = canManagePeople(context.role);
  const activeStudents = students.filter((student) => student.status === "active").length;
  const activeStaff = staff.filter((person) => person.status === "active").length;
  const activeGuardians = guardians.filter((guardian) => guardian.status === "active").length;
  const labels = { students: "Student", staff: "Staff", guardians: "Guardian" };

  return (
    <AppShell context={context} activePath="/dashboard/people" pageTitle="People">
      <div className="page-head people-head">
        <div><span className="eyebrow">PEOPLE DIRECTORY</span><h1>Everyone in one place.</h1><p>Fast records, fewer repeated fields and a clear family view.</p></div>
        {canManage && <div className="head-actions"><Link className="secondary" href="/dashboard/people/import">Import CSV</Link><Link className="primary compact" href={`/dashboard/people/${tab}/new`}>+ Add {labels[tab].toLowerCase()}</Link></div>}
      </div>

      <section className="people-metrics">
        <Link href="/dashboard/people?tab=students"><span>Students</span><strong>{students.length}</strong><small>{activeStudents} active</small></Link>
        <Link href="/dashboard/people?tab=staff"><span>Staff</span><strong>{staff.length}</strong><small>{activeStaff} active</small></Link>
        <Link href="/dashboard/people?tab=guardians"><span>Guardians</span><strong>{guardians.length}</strong><small>{activeGuardians} active</small></Link>
        <div><span>Data scope</span><strong>{context.campusName ? "1" : "All"}</strong><small>{context.campusName || "All campuses"}</small></div>
      </section>

      <section className="card people-card">
        <div className="people-toolbar">
          <div className="tabs">
            {(["students", "staff", "guardians"] as Tab[]).map((item) => <Link className={tab === item ? "active" : ""} href={`/dashboard/people?tab=${item}`} key={item}>{item[0].toUpperCase() + item.slice(1)}</Link>)}
          </div>
          <form className="people-filters">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={params.q || ""} placeholder={`Search ${tab}…`} aria-label={`Search ${tab}`} />
            <select name="status" defaultValue={status} aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option>{tab === "students" && <><option value="applicant">Applicant</option><option value="withdrawn">Withdrawn</option><option value="alumni">Alumni</option></>}{tab === "staff" && <><option value="on_leave">On leave</option><option value="inactive">Inactive</option></>}{tab === "guardians" && <option value="inactive">Inactive</option>}</select>
            <button className="secondary" type="submit">Filter</button>
          </form>
        </div>

        {filtered.length ? <div className="table-wrap"><table className="people-table">
          <thead><tr><th>Name</th><th>{tab === "students" ? "Admission no." : tab === "staff" ? "Employee no." : "Phone"}</th><th>{tab === "staff" ? "Role" : "Contact"}</th><th>Status</th><th /></tr></thead>
          <tbody>{filtered.map((record) => {
            const personName = nameOf(record);
            const idValue = tab === "students" && "admission_number" in record ? record.admission_number : tab === "staff" && "employee_number" in record ? record.employee_number : "phone" in record ? record.phone : "";
            const detail = tab === "staff" && "designation" in record ? record.designation : "email" in record ? record.email || ("phone" in record ? record.phone : "") || "No contact added" : "";
            return <tr key={record.id}>
              <td><div className="person-cell"><span className="person-avatar">{personName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><span><b>{personName}</b>{tab === "students" && "preferred_name" in record && record.preferred_name && <small>Goes by {record.preferred_name}</small>}</span></div></td>
              <td>{idValue}</td><td>{detail}</td><td><span className={`status status-${record.status}`}>{record.status.replace("_", " ")}</span></td>
              <td><Link className="row-link" href={`/dashboard/people/${tab}/${record.id}`}>View →</Link></td>
            </tr>;
          })}</tbody>
        </table></div> : <div className="empty-state"><span>◎</span><h2>{query || status !== "all" ? "No matching records" : `No ${tab} yet`}</h2><p>{query || status !== "all" ? "Try a broader search or clear the status filter." : `Add the first ${labels[tab].toLowerCase()} record to start the directory.`}</p>{canManage && !query && status === "all" && <Link className="primary compact" href={`/dashboard/people/${tab}/new`}>Add {labels[tab].toLowerCase()} →</Link>}</div>}
      </section>
    </AppShell>
  );
}
