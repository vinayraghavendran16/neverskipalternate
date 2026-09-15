import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type Tab = "students" | "staff" | "guardians";
type SearchParams = Promise<{ tab?: string; q?: string; status?: string; page?: string }>;

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

  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || "1", 10) || 1));
  const pageSize = 50;
  const table = tab === "staff" ? "staff_profiles" : tab;
  let directoryQuery = supabase.from(table).select("*", { count: "exact" }).eq("organization_id", context.organizationId);
  // Quote the PostgREST value and strip its escape/wildcard characters.
  const search = query.slice(0, 160).replace(/["\\%_]/g, "");
  const searchColumns = ["first_name", "last_name", "email", "phone", ...(tab === "students" ? ["admission_number", "preferred_name"] : tab === "staff" ? ["employee_number", "designation", "department"] : [])];
  if (search) directoryQuery = directoryQuery.or(searchColumns.map((column) => `${column}.ilike."%${search}%"`).join(","));
  if (status !== "all") directoryQuery = directoryQuery.eq("status", status);
  const [directory, studentResult, staffResult, guardianResult] = await Promise.all([
    directoryQuery.order("first_name").order("id").range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
    supabase.from("guardians").select("id", { count: "exact", head: true }).eq("organization_id", context.organizationId),
  ]);
  if ([directory, studentResult, staffResult, guardianResult].some((result) => result.error)) throw new Error("The people directory could not be loaded.");
  const filtered = directory.data || [];
  const canManage = canManagePeople(context.role) && !(tab === "staff" && context.role === "staff");
  const pageLink = (target: number) => `/dashboard/people?${new URLSearchParams({ tab, q: query, status, page: String(target) })}`;
  const labels = { students: "Student", staff: "Staff", guardians: "Guardian" };

  return (
    <AppShell context={context} activePath="/dashboard/people" pageTitle="People">
      <div className="page-head people-head">
        <div><span className="eyebrow">PEOPLE DIRECTORY</span><h1>Everyone in one place.</h1><p>Fast records, fewer repeated fields and a clear family view.</p></div>
        {canManage && <div className="head-actions"><Link className="secondary" href="/dashboard/people/import">Import CSV</Link><Link className="primary compact" href={`/dashboard/people/${tab}/new`}>+ Add {labels[tab].toLowerCase()}</Link></div>}
      </div>

      <section className="people-metrics">
        <Link href="/dashboard/people?tab=students"><span>Students</span><strong>{studentResult.count || 0}</strong><small>Visible student records</small></Link>
        <Link href="/dashboard/people?tab=staff"><span>Staff</span><strong>{staffResult.count || 0}</strong><small>Visible staff records</small></Link>
        <Link href="/dashboard/people?tab=guardians"><span>Guardians</span><strong>{guardianResult.count || 0}</strong><small>Visible guardian records</small></Link>
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
          <thead><tr><th>Name</th><th>{tab === "students" ? "Admission no." : tab === "staff" ? "Employee no." : "Phone"}</th><th>{tab === "staff" ? "Role" : "Contact"}</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
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
        <nav className="card-body head-actions" aria-label="Directory pages">{page > 1 && <Link className="secondary" href={pageLink(page - 1)}>Previous</Link>}<span>Page {page} · {directory.count || 0} matching records</span>{page * pageSize < (directory.count || 0) && <Link className="secondary" href={pageLink(page + 1)}>Next</Link>}<Link className="secondary" href={`/dashboard/people?tab=${tab}`}>Clear filters</Link></nav>
      </section>
    </AppShell>
  );
}
