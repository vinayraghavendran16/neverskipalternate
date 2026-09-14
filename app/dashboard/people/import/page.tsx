import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CsvImportForm } from "@/components/people/csv-import-form";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPeoplePage() {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/people/import");
  if (!canManagePeople(context.role)) redirect("/dashboard/people");
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  let campusId = context.campusId;
  if (!campusId) {
    const { data: campus } = await supabase.from("campuses").select("id").eq("organization_id", context.organizationId).order("created_at").limit(1).maybeSingle();
    campusId = campus?.id || null;
  }
  if (!campusId) redirect("/dashboard/people?setup=campus");

  return (
    <AppShell context={context} activePath="/dashboard/people" pageTitle="People import">
      <Link className="back-link" href="/dashboard/people">← Back to people</Link>
      <div className="page-head compact-head"><div><span className="eyebrow">BULK IMPORT</span><h1>Bring your student list.</h1><p>Upload a clean CSV once instead of entering every student manually.</p></div><a className="secondary" download="northstar-student-import.csv" href="data:text/csv;charset=utf-8,admission_number%2Cfirst_name%2Clast_name%2Cpreferred_name%2Cdate_of_birth%2Cgender%2Cemail%2Cphone%2Cjoined_on%2Cstatus%0ANS-2026-001%2CAsha%2CRao%2C%2C2015-08-12%2Cfemale%2C%2C%2C2026-06-01%2Cactive">Download template</a></div>
      <div className="import-grid">
        <section className="card"><div className="card-header"><div><h2>Student CSV</h2><p>New admission numbers are created; matching numbers are updated.</p></div></div><div className="card-body"><CsvImportForm campusId={campusId} /></div></section>
        <aside className="card import-guide"><div className="card-header"><div><h2>Required columns</h2><p>Use UTF-8 CSV format.</p></div></div><div className="card-body"><code>admission_number</code><code>first_name</code><h3>Optional columns</h3><p>last_name, preferred_name, date_of_birth, gender, email, phone, joined_on and status.</p><h3>Accepted statuses</h3><p>applicant, active, withdrawn or alumni.</p></div></aside>
      </div>
    </AppShell>
  );
}
