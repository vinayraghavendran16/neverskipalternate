import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPlatformSchool, resendOwnerInvitation } from "./actions";

export default async function PlatformPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login?next=/platform");
  if (!isPlatformOwnerEmail(user.email)) redirect("/dashboard");
  const admin = createAdminClient();
  if (!admin) throw new Error("Platform administration is not configured.");
  const [{ data: organizations, error }, { data: campuses }, { data: memberships }, usersResult] = await Promise.all([
    admin.from("organizations").select("id,name,slug,status,created_at").order("created_at", { ascending: false }),
    admin.from("campuses").select("id,organization_id"),
    admin.from("memberships").select("organization_id,user_id,role,status"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (error) throw new Error("The school directory could not be loaded.");
  const query = await searchParams, users = new Map((usersResult.data?.users || []).map((entry) => [entry.id, entry]));
  return <main className="platform-page"><header className="platform-topbar"><Link className="brand" href="/platform"><span className="brand-mark"><i/><i/><i/></span><span>Northstar Platform</span></Link><div><Link className="secondary compact" href="/dashboard">Open my school</Link><form action={logout}><button className="signout">Sign out</button></form></div></header><div className="platform-content">
    <div className="page-head"><div><span className="eyebrow">PLATFORM OWNER</span><h1>Provision schools safely.</h1><p>Create a separate tenant, its first branch, and its accountable school owner in one transaction.</p></div><span className="status">{organizations?.length || 0} SCHOOLS</span></div>
    {(query.success || query.error) && <p className={query.error ? "form-error admin-message" : "form-success admin-message"} role="status">{query.error || query.success}</p>}
    <div className="platform-grid"><section className="card"><header className="card-header"><div><h2>New school tenant</h2><p>The owner receives an invitation and completes their password before signing in.</p></div></header><form action={createPlatformSchool} className="platform-form"><label className="field">School name<input name="name" required maxLength={160}/></label><label className="field">URL slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="greenfield-school"/></label><div className="split-fields"><label className="field">First branch<input name="campus_name" required/></label><label className="field">Branch code<input name="campus_code" required maxLength={24} placeholder="MAIN"/></label></div><div className="split-fields"><label className="field">Owner name<input name="owner_name" required/></label><label className="field">Owner email<input name="owner_email" type="email" required/></label></div><button className="primary">Create school and invite owner</button></form></section>
      <section className="card"><header className="card-header"><div><h2>School directory</h2><p>Tenant status, branch count, and owner activation.</p></div></header><div className="tenant-list">{(organizations || []).map((school) => { const schoolMemberships = (memberships || []).filter((m) => m.organization_id === school.id && m.status === "active"), ownerMembership = schoolMemberships.find((entry)=>entry.role === "owner"), owner = ownerMembership ? users.get(ownerMembership.user_id) : null; return <article key={school.id}><div><h3>{school.name}</h3><p>{school.slug}{owner?.email ? ` · ${owner.email}` : ""}</p></div><span>{(campuses || []).filter((c) => c.organization_id === school.id).length} branches</span><span>{schoolMemberships.length} users</span>{owner?.email_confirmed_at ? <span className="status">Owner active</span> : <form action={resendOwnerInvitation}><input type="hidden" name="organization_id" value={school.id}/><button className="secondary compact">Resend owner invite</button></form>}</article>; })}{!organizations?.length && <p className="empty-copy">No school tenants yet.</p>}</div></section></div>
  </div></main>;
}
