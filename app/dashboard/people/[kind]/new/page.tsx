import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordForm } from "@/components/people/record-form";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type Kind = "students" | "staff" | "guardians";

export default async function NewPersonPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind: rawKind } = await params;
  if (!["students", "staff", "guardians"].includes(rawKind)) notFound();
  const kind = rawKind as Kind;
  const context = await getUserContext();
  if (!context) redirect(`/login?next=/dashboard/people/${kind}/new`);
  if (!canManagePeople(context.role) || (kind === "staff" && context.role === "staff")) redirect(`/dashboard/people?tab=${kind}`);
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: campuses } = await supabase.from("campuses").select("id, name").eq("organization_id", context.organizationId).order("name");
  const singular = kind === "students" ? "student" : kind === "staff" ? "staff member" : "guardian";

  return (
    <AppShell context={context} activePath="/dashboard/people" pageTitle="People">
      <Link className="back-link" href={`/dashboard/people?tab=${kind}`}>← Back to people</Link>
      <div className="page-head compact-head"><div><span className="eyebrow">NEW {singular.toUpperCase()}</span><h1>Add {singular}.</h1><p>Capture the essentials now. Add more detail when it becomes useful.</p></div></div>
      <section className="card form-card"><RecordForm kind={kind} campuses={campuses || []} /></section>
    </AppShell>
  );
}
