import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupDashboard } from "@/components/setup-dashboard";
import { getUserContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/env";

const foundations = [
  ["Tenant data model", "Schools, campuses and academic years"],
  ["Authentication boundary", "Cookie-backed sessions with server verification"],
  ["Role permissions", "Owner, admin, principal, teacher, parent, student and staff"],
  ["Row-level security", "Organization isolation enforced inside PostgreSQL"],
  ["File governance", "Private bucket, tenant paths and metadata records"],
  ["Audit events", "Append-only security and operational event trail"],
];

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <SetupDashboard />;
  const context = await getUserContext();
  if (!context) redirect("/login");

  return (
    <AppShell context={context}>
      <div className="page-head"><div><span className="eyebrow">PRODUCTION FOUNDATION</span><h1>The school core is ready.</h1><p>Authenticated as {context.role} inside an isolated organization tenant.</p></div><span className="release">Release {process.env.NEXT_PUBLIC_RELEASE_SHA || "local"}</span></div>
      <section className="metrics"><div className="metric"><span>Organization</span><strong>1</strong><small>Tenant active</small></div><div className="metric"><span>Campuses</span><strong>1</strong><small>Scoped access</small></div><div className="metric"><span>Security controls</span><strong>6</strong><small>Foundation enabled</small></div><div className="metric"><span>Audit state</span><strong>Live</strong><small>Append-only events</small></div></section>
      <div className="grid">
        <section className="card"><header className="card-header"><div><h2>Foundation readiness</h2><p>Production controls implemented in this phase</p></div><span className="status">READY</span></header><div className="card-body foundation-list">{foundations.map(([title, description]) => <div className="foundation-item" key={title}><span className="check">✓</span><span><b>{title}</b><small>{description}</small></span><span className="status">Built</span></div>)}</div></section>
        <section className="card security-card"><header className="card-header"><div><h2>Security posture</h2><p>Defense in depth by default</p></div><span>✦</span></header><div className="card-body"><div className="security-row"><span><b>Database isolation</b><small>RLS on exposed tables</small></span><i className="security-dot" /></div><div className="security-row"><span><b>Least privilege</b><small>Explicit grants by role</small></span><i className="security-dot" /></div><div className="security-row"><span><b>Server sessions</b><small>Verified on protected requests</small></span><i className="security-dot" /></div><div className="security-row"><span><b>Secrets discipline</b><small>Server keys never reach clients</small></span><i className="security-dot" /></div></div></section>
      </div>
      <div className="prototype-link"><span><b>Product workflow prototype preserved</b><small>Review the teacher Today, attendance, diary and marks experience while the backend is connected.</small></span><a href="/prototype/index.html">Open prototype →</a></div>
    </AppShell>
  );
}
