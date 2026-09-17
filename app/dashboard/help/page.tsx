import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext } from "@/lib/auth/context";

const workflows = [
  { title: "School setup", detail: "Create people, classes, subjects, rosters and timetables in that order.", href: "/dashboard/academics", roles: "Owners · administrators · principals" },
  { title: "Daily teaching", detail: "Open today’s timetable, publish the diary, assign homework and record assessments.", href: "/dashboard/teacher", roles: "Teachers · school leaders" },
  { title: "Attendance", detail: "Open the next due class, tap only exceptions, review the exception list, then save a draft or submit.", href: "/dashboard/attendance", roles: "Teachers · school leaders" },
  { title: "Reports", detail: "Start with a role-specific overview, change the evidence period, then drill into a class, student or source workflow.", href: "/dashboard/reports", roles: "All users · permission scoped" },
  { title: "Formal records", detail: "Configure a period, complete assigned subject registers, submit for leader approval, then publish printable family records.", href: "/dashboard/report-cards", roles: "Leaders · teachers · families after publication" },
  { title: "Family experience", detail: "Review learning, notices, leave requests, fees, transport and the school calendar.", href: "/dashboard/learning", roles: "Students · parents" },
  { title: "School operations", detail: "Manage approvals, invoices, transport exceptions, incidents and release health.", href: "/dashboard/operations", roles: "Owners · administrators" },
  { title: "Notifications", detail: "Read platform notices and choose the channels you consent to receive.", href: "/dashboard/notifications", roles: "All users" },
];

const releases = [
  ["MVP formal academic records", "Configurable templates and periods, atomic teacher registers, leader approval and publication, family-safe print/PDF cards, transcripts and recipient-scoped notifications."],
  ["MVP access correction", "School users can no longer create platform tenants. Tenant provisioning and deletion remain exclusive to the allowlisted platform console."],
  ["Role-specific reporting", "Separate student, parent, teacher and school-leader dashboards with period filters, class-to-student drill-down, attendance and learning evidence, transparent attention rules and source-workflow links."],
  ["Homework and assessment workspace", "Focused assignment, creation, review and insight tabs; class-prefilled actions; completion signals; searchable review queues; safer bulk marks entry and publish readiness."],
  ["Teacher-first academics", "Role-aware class workspaces, class readiness, focused roster, subject and timetable tabs, bulk roster search, and one-click teaching actions."],
  ["School portfolio operations", "Dedicated overview, metrics, school and commercials, branches and owners tabs, with school-level people, communication, academic, finance and operations KPIs."],
  ["Platform portfolio onboarding", "Multi-branch provisioning, multi-owner invitations, school branding, exact locations, portfolio metrics, ARR and school-level drilldowns."],
  ["Owner invitation routing", "Invitation fragments are safely established in-browser, expired links show a recovery path, invitations can be resent, and school owners land in their assigned tenant."],
  ["Identity & access", "Platform tenant provisioning, guided owner setup, invitation password completion, People-record linking, family accounts, and an in-product role guide."],
  ["Release readiness", "Full workflow UAT, responsive fixes, faster shared navigation, accessible labels, in-product guidance and verified release evidence."],
  ["Phase 8", "Persistent notification inbox, unread counts, consent preferences and reliable announcement delivery records."],
  ["Phase 7", "Health checks, redacted incident capture, administrator triage and release identity."],
  ["Phase 6", "Shared calendar, transport operations, attendance corrections and guided assessment setup."],
  ["Phase 5", "Family learning, announcements, leave approvals, homework responses and fee visibility."],
  ["Phases 1–4", "Secure tenancy, people, academics, attendance, Teacher Today, diary, homework and assessments."],
];

const nextPhases = [
  ["09", "Payments and reconciliation", "Gateway orders, signed webhooks, idempotent settlement, refunds and finance reconciliation."],
  ["10", "Reliable offline work", "Offline attendance and teacher queues with safe retries and conflict resolution."],
  ["11", "Admissions", "Applications, document verification, decisions and conversion into enrolled students."],
  ["12", "Formal-record amendments", "Versioned corrections, withdrawal and reissue, board-specific formats, promotion rules and signed documents."],
];

export default async function HelpPage() {
  const context = await getUserContext();
  if (!context) redirect("/login?next=/dashboard/help");
  const release = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_RELEASE_SHA || "local";
  return <AppShell context={context} activePath="/dashboard/help" pageTitle="Help & releases">
    <div className="page-head"><div><span className="eyebrow">HELP & RELEASES</span><h1>Use Northstar with confidence.</h1><p>Workflow guidance, release evidence and the next product priorities in one place.</p></div><span className="release">Release {release.slice(0, 12)}</span></div>

    <section className="help-callout card" aria-labelledby="release-evidence-title"><div><span className="status">VERIFIED</span><h2 id="release-evidence-title">Release-readiness evidence</h2><p>The MVP release gate records role boundaries, routes, security and database checks, verified fixes, dependencies, known limits and the decisions needed before a broader pilot.</p></div><a className="primary compact" href="/reports/northstar-mvp-uat-release-gate-2026-09-17.pdf" target="_blank" rel="noreferrer"><span>Open UAT report</span><span>↗</span></a></section>

    <div className="help-grid">
      <section className="card"><header className="card-header"><div><h2>Workflow guide</h2><p>Start from the workflow that matches your role.</p></div></header><div className="guide-list">{workflows.map(item=><Link href={item.href} key={item.title}><div><h3>{item.title}</h3><p>{item.detail}</p><small>{item.roles}</small></div><span aria-hidden="true">→</span></Link>)}</div></section>
      <aside className="card"><header className="card-header"><div><h2>Operating guidance</h2><p>Short answers for common decisions.</p></div></header><div className="help-details">
        <details><summary>How should a new school be set up?</summary><ol><li>Add the campus and active academic year.</li><li>Add staff, students and guardians.</li><li>Create classes and subjects.</li><li>Enroll students and allocate teachers.</li><li>Publish the timetable before daily work begins.</li></ol></details>
        <details><summary>When can an assessment be created?</summary><p>The class needs an active subject allocation with a teacher. Open Academics, select the class, then choose Create assessment. The class context is carried into the assessment workspace.</p></details>
        <details><summary>How should homework be reviewed?</summary><p>Open Homework and choose Review. New submissions appear before returned work. Filter by status or search for a student, add feedback, then accept the work or return it for revision.</p></details>
        <details><summary>How do formal report cards work?</summary><p>School leaders create a template and period. Assigned teachers complete subject registers, a leader adds overall comments, and the class moves through submit, approve and publish. Students and guardians see only published records and receive an in-app link to the exact card.</p></details><details><summary>How are reporting signals calculated?</summary><p>Reports use submitted attendance, published assessment results and assigned work in the selected period. A “Needs review” label means attendance is below 75%, a published average is below 50%, or at least two assignments are overdue. It prompts a human review and is never a prediction of learner potential.</p></details>
        <details><summary>What happens when a workflow fails?</summary><p>Retry once. Administrators can check System health for a safe incident fingerprint and use the timestamp to find the matching Vercel log.</p></details>
        <details><summary>How is school data protected?</summary><p>Every exposed table uses tenant-aware row-level security. Private records stay behind authentication, role checks and audited server actions.</p></details>
        <details><summary>Which messaging channels are active?</summary><p>In-app notifications are active. Email and SMS preferences are stored, while external sending remains disabled until a provider is configured.</p></details>
      </div></aside>
    </div>

    <section className="card help-section" id="release-notes"><header className="card-header"><div><h2>Release notes</h2><p>What changed across the delivered product.</p></div></header><div className="release-list">{releases.map(([title, detail])=><article key={title}><span className="check" aria-hidden="true">✓</span><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div></section>

    <section className="card help-section"><header className="card-header"><div><h2>Prioritized next phases</h2><p>Sequenced by operational value and risk reduction.</p></div><span className="status status-warning">PLANNED</span></header><div className="roadmap-list">{nextPhases.map(([number,title,detail])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div><p className="parked-note"><b>Parked:</b> Ask Northstar, voice input, ElevenLabs and automated voice announcements remain outside the active roadmap until privacy, consent, retention, provider and cost decisions are approved.</p></section>
  </AppShell>;
}
