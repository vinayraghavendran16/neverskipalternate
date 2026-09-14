import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GuardianLinkForm } from "@/components/people/guardian-link-form";
import { RecordForm } from "@/components/people/record-form";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type Kind = "students" | "staff" | "guardians";

export default async function PersonDetailPage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { kind: rawKind, id } = await params;
  if (!["students", "staff", "guardians"].includes(rawKind)) notFound();
  const kind = rawKind as Kind;
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/people/${kind}/${id}`);
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const table = kind === "students" ? "students" : kind === "staff" ? "staff_profiles" : "guardians";
  const { data } = await supabase.from(table).select("*").eq("id", id).eq("organization_id", context.organizationId).maybeSingle();
  if (!data) notFound();
  const record = data as unknown as Record<string, string | null>;
  const { data: campuses } = await supabase.from("campuses").select("id, name").eq("organization_id", context.organizationId).order("name");
  const canEdit = canManagePeople(context.role) && !(kind === "staff" && context.role === "staff");
  const title = [record.first_name, record.last_name].filter(Boolean).join(" ");
  const identifier = kind === "students" ? record.admission_number : kind === "staff" ? record.employee_number : record.phone;
  const saved = (await searchParams).saved === "1";

  let relationships: { id: string; guardian_id: string; relationship: string; is_primary: boolean; can_pick_up: boolean }[] = [];
  let guardianDirectory: { id: string; name: string; phone: string }[] = [];
  let relationshipGuardians = new Map<string, { name: string; phone: string }>();
  if (kind === "students") {
    const [{ data: relationshipData }, { data: guardianData }] = await Promise.all([
      supabase.from("guardian_relationships").select("id, guardian_id, relationship, is_primary, can_pick_up").eq("student_id", id).eq("organization_id", context.organizationId),
      supabase.from("guardians").select("id, first_name, last_name, phone").eq("organization_id", context.organizationId).eq("status", "active").order("first_name"),
    ]);
    relationships = relationshipData || [];
    guardianDirectory = (guardianData || []).map((guardian) => ({ id: guardian.id, name: [guardian.first_name, guardian.last_name].filter(Boolean).join(" "), phone: guardian.phone }));
    relationshipGuardians = new Map(guardianDirectory.map((guardian) => [guardian.id, { name: guardian.name, phone: guardian.phone }]));
  }

  return (
    <AppShell context={context} activePath="/dashboard/people" pageTitle="People">
      <Link className="back-link" href={`/dashboard/people?tab=${kind}`}>← Back to people</Link>
      <div className="profile-head"><div className="profile-avatar">{title.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</div><div><span className="eyebrow">{kind === "staff" ? "STAFF" : kind.slice(0, -1).toUpperCase()} PROFILE</span><h1>{title}</h1><p>{identifier} · <span className={`status status-${record.status}`}>{record.status?.replace("_", " ")}</span></p></div></div>
      {saved && <p className="form-success save-banner">Changes saved and added to the audit trail.</p>}
      <div className={kind === "students" ? "profile-grid" : "profile-single"}>
        <section className="card form-card"><div className="card-header"><div><h2>{canEdit ? "Record details" : "Profile details"}</h2><p>{canEdit ? "Update a field without re-entering the rest." : "You have read-only access to this record."}</p></div></div>{canEdit ? <RecordForm kind={kind} record={record} campuses={campuses || []} /> : <div className="card-body read-only-grid">{Object.entries(record).filter(([key, value]) => value && !["id", "organization_id", "campus_id", "user_id", "created_at", "updated_at"].includes(key)).map(([key, value]) => <div key={key}><small>{key.replaceAll("_", " ")}</small><b>{value}</b></div>)}</div>}</section>
        {kind === "students" && <aside className="guardian-panel">
          <section className="card"><div className="card-header"><div><h2>Family and pickup</h2><p>Contacts connected to this student.</p></div><Link className="text-link" href="/dashboard/people/guardians/new">New guardian</Link></div><div className="card-body relationship-list">{relationships.length ? relationships.map((relationship) => { const guardian = relationshipGuardians.get(relationship.guardian_id); return <div className="relationship-row" key={relationship.id}><div><b>{guardian?.name || "Guardian"}</b><small>{relationship.relationship} · {guardian?.phone || "No phone"}</small></div><span>{relationship.is_primary ? "Primary" : relationship.can_pick_up ? "Pickup" : "Contact"}</span></div>; }) : <p className="empty-copy">No guardians linked yet.</p>}</div></section>
          {canEdit && <section className="card"><div className="card-header"><div><h2>Link guardian</h2><p>Add family context without duplicate entry.</p></div></div><div className="card-body"><GuardianLinkForm studentId={id} guardians={guardianDirectory} /></div></section>}
        </aside>}
      </div>
    </AppShell>
  );
}
