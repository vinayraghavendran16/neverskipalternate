import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getUserContext } from "@/lib/auth/context";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";

const roles = [
  ["School owner", "Manages the assigned school and branches; grants administrator access; oversees all school workflows."],
  ["Administrator", "Runs school operations, branches, People records, invitations, finance, transport, and access below administrator level."],
  ["Principal", "Leads academics, attendance, assessments, approvals, and school-wide academic visibility."],
  ["Teacher", "Sees allocated classes, timetable, diary, homework, attendance, assessments, and marks."],
  ["Staff", "Uses operational People, attendance, approvals, and other workflows allowed by school policy."],
  ["Parent", "Sees only linked children: learning, notices, leave, fees, transport, attendance, and published results."],
  ["Student", "Sees only their own learning, homework, notices, fees, transport, attendance, and published results."],
];

export default async function AccessPage(){const context=await getUserContext();if(!context)redirect("/login?next=/dashboard/access");const canManage=["owner","administrator"].includes(context.role);return <AppShell context={context} activePath="/dashboard/access" pageTitle="Access & roles"><div className="page-head"><div><span className="eyebrow">IDENTITY & ACCESS</span><h1>One login, the right school context.</h1><p>Understand who creates tenants, how People records become accounts, and where every role signs in.</p></div>{isPlatformOwnerEmail(context.email)&&<Link className="primary compact" href="/platform">Open platform console →</Link>}</div>
  <section className="access-concepts"><article className="card"><b>01 · Platform</b><h2>Platform operator</h2><p>An allowlisted Northstar operator creates a separate tenant, first branch, and school owner. This permission sits outside school roles.</p></article><article className="card"><b>02 · School</b><h2>Tenant owner</h2><p>Each school has isolated data and at least one owner. Owners invite administrators and manage only the school tenants assigned by the platform operator.</p></article><article className="card"><b>03 · Branch</b><h2>Campus scope</h2><p>A school can have multiple branches. Staff access may cover one branch or all branches; family data stays tied to the student.</p></article></section>
  <div className="access-guide-grid"><section className="card"><header className="card-header"><div><h2>Role permissions</h2><p>What each account can do after sign-in.</p></div></header><div className="role-matrix">{roles.map(([name,detail])=><article key={name}><h3>{name}</h3><p>{detail}</p></article>)}</div></section><aside className="card"><header className="card-header"><div><h2>How accounts are created</h2><p>Use the same sequence for reliable access.</p></div></header><ol className="setup-steps"><li><b>Create the People record first.</b><span>Add staff, guardian, or student details in People.</span></li><li><b>Send the invitation.</b><span>{canManage?<>Use <Link href="/dashboard#school-administration">School administration</Link> and select that record.</>:"Your school owner or administrator selects the record and sends the invitation."}</span></li><li><b>Accept and set a password.</b><span>The email link opens a secure account-completion screen.</span></li><li><b>Sign in from one place.</b><span>Everyone uses <Link href="/login">the Northstar login</Link>. Northstar opens the correct workspace from the role.</span></li></ol></aside></div>
  <section className="card access-note"><h2>Current limitation</h2><p>One email has one active role within a school. A person who is both an employee and a parent must currently use separate email accounts. Multi-role switching is a planned identity enhancement.</p></section>
  </AppShell>}
