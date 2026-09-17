# Northstar MVP system UAT and release gate

**Audit date:** 17 September 2026

**Candidate branch:** `codex/formal-academic-records`
**Scope:** all delivered platform, school, teaching, family and operations workflows

## Release decision

**Code and database gate: PASS. Production promotion remains conditional on applying the new database migration and completing the post-deployment signed-in route sweep.**

The candidate passes lint, strict TypeScript, 22 unit tests, the optimized production build and a clean disposable PostgreSQL regression. The database suite exercises platform provisioning, tenant isolation and owner, administrator, principal, teacher, staff, parent and student boundaries. No environment secret is stored in the repository or this report.

## What works

| Area | MVP status | Actionable outcome |
|---|---|---|
| Platform console | Ready | Allowlisted operators create, enrich, pilot, price, archive and restore school tenants; portfolio, branch, owner, commercial and onboarding tabs are separate. |
| School owner and administrator | Ready | Manage assigned school branches, people invitations and school access; tenant creation has been removed from the school dashboard. |
| Principal | Ready | Leads academics, reports, attendance, approvals and publication without gaining platform or owner-only identity powers. |
| Teacher | Ready | Sees allocated classes; records attendance, diary, homework, assessments, feedback and subject report-card contributions. |
| Staff | Ready with policy decision | Supports people, attendance, calendar, approvals and roster generation according to tenant and campus scope; cannot administer tenant access. |
| Student | Ready | Own learning, homework, published results, attendance, notices, fees, transport, report cards and transcript only. |
| Parent | Ready | Linked-child learning, attendance, published results, homework, fees, transport, report cards and transcript only. |
| Command centre | Ready | Role-aware metrics, daily exceptions, filters, linked audit activity, quick actions and release identity. |
| People and academics | Ready | People records, CSV import, classes, rosters, subject ownership and timetable readiness. |
| Attendance | Ready | Present-by-default, exception-only entry, leave-aware defaults, reason shortcuts, undo, atomic save and locked registers. |
| Homework and assessments | Ready | Creation, review, feedback, marks, publish locks and actionable completion coverage. |
| Reports and dashboards | Ready | Role-specific evidence, explicit thresholds, period filters and drill-down to source workflows; missing evidence is not shown as zero performance. |
| Formal records | Ready | Configurable templates, periods, subject registers, leader comments, controlled approval/publication, print/PDF and cumulative transcript. |
| Communication | Ready for in-app MVP | Targeted announcements, acknowledgements, homework feedback, notification inbox and report-publication alerts. |
| Calendar, approvals, finance, transport | Ready for recorded/offline operations | Core records and controlled workflows work; online payments and external transport telemetry are dependencies. |
| Operations | Ready | Health endpoint, redacted incident queue, release identity and audit signals. |

## Verified bugs fixed in this gate

1. School owners could still create separate tenants from the school Command Centre. The form was removed and the legacy authenticated provisioning RPC was revoked; tenant creation is platform-only.
2. Subject teachers could initialize report-card rosters directly. Initialization is now limited to school leaders and staff.
3. Report-card status and workflow timestamps could be altered through direct row updates. A database trigger now enforces identity immutability, allowed transitions and role checks.
4. Overall report comments saved one row at a time and could partially succeed. They now save atomically through a validated RPC.
5. An empty class subject structure could be submitted as complete. Submission now requires at least one subject record and every subject grade.
6. A non-leader could request the hidden template tab and receive an empty screen. The route now falls back to reporting periods.
7. Teachers saw a report-generation control they could not successfully use. They now see a clear awaiting-setup state.
8. The template form exposed raw JSON. It now accepts simple, accessible `grade | description` rows.
9. Published report cards did not notify families. Linked students and guardians now receive a consent-aware in-app notification to the exact record.
10. Formal-record navigation and family access were missing. Dedicated report-card and transcript routes are now in the role-aware shell.

## Role and security evidence

The clean database regression verifies:

- platform provisioning functions are unavailable to authenticated school accounts and executable only through the trusted service role;
- school owners cannot create platform tenants;
- administrators cannot demote owners or grant administrator access beyond their authority;
- principals can approve academic records without gaining platform access;
- assigned teachers can mutate only their teaching registers, cannot enumerate access, and lose access immediately when suspended;
- staff can support school-wide student operations but cannot enumerate or create tenant access;
- parents see one linked learner and never another learner's draft or published data;
- students see only their own published results and records;
- another tenant reads no student, marks, notification or report-card data;
- attendance, marks, comments, payments and formal-record registers are atomic and reject invalid batches;
- published assessments, locked attendance and submitted report cards reject direct edits;
- report publication notifies only the linked family recipients.

## UI and accessibility sweep

- All visible shell navigation points to an implemented route.
- Planned generic module pages state that they are unavailable, list their intended capabilities and provide a return path.
- New formal-record tabs use the same full-width tab, card, status, empty-state and action patterns as Academics, Homework, Assessments and Platform.
- Form controls have programmatic labels; progress and status text do not depend on colour alone.
- Report tables have headings, actions have accessible text and printable output uses A4 print rules.
- Mobile and tablet rules collapse KPI, workflow and editor grids without hiding actions.

## Dependencies and known limits

| Dependency or limit | Current behaviour | Needed for completion |
|---|---|---|
| Email and SMS | Consent and delivery ledgers exist; provider sending is disabled. | Provider selection, credentials, templates, retry worker, cost and retention policy. |
| Direct teacher-family messaging | Announcements and workflow feedback work; conversational threads do not exist. | Moderation, safeguarding, retention, escalation, attachments and read-receipt decisions. |
| Online fee collection | Invoices and controlled manual payments work. | Gateway contract, signed webhooks, reconciliation and refund policy. |
| Offline use | Requires connectivity. | Encrypted local queue, conflict resolution and device/session policy. |
| Formal record corrections | Published cards are immutable. | Amendment, reapproval, version history and reissue policy. |
| Board-specific records | Generic templates work. | Approved CBSE/CISCE/state/IB template packs, GPA/promotion/signature decisions. |
| Backup recovery evidence | Application transactions and constraints are tested. | Supabase backup/PITR verification and a timed restoration drill in the account console. |
| Instrumented performance | Production build and route architecture pass; earlier route observations are documented. | CI browser runner with LCP, INP and CLS budgets and representative tenant data. |
| Multi-role identity | One active role per email per school. | Role-switching policy, combined staff-parent data model and UX. |

## Decisions required before broader pilot

1. Should school owners and administrators continue to create branches, or should every branch change be platform-operated? Tenant creation is already platform-only.
2. Should staff default to all-branch operational access or require a branch on every membership?
3. Which board-specific report formats, grading calculations, promotion rules and signature requirements are mandatory for the first pilot schools?
4. What is the correction policy for an already published report card: amendment, withdrawal and reissue, or versioned replacement?
5. Is direct teacher-parent/student messaging in MVP scope? If yes, approve safeguarding, moderation, retention, attachment and escalation rules first.
6. Which transactional provider should deliver email and SMS, and what consent, retention and monthly cost caps apply?
7. Which payment gateway and reconciliation owner should be used for online fees?
8. What recovery objective and recovery-point objective should be contracted and tested for school data?
9. Which named users will sign off teacher, parent, student, staff, principal and finance acceptance in the pilot tenant?

## Quality gates

| Gate | Result |
|---|---:|
| ESLint | Pass |
| Strict TypeScript | Pass |
| Unit tests | 22/22 pass |
| Production build | Pass; 29 page-data jobs and all dynamic routes compiled |
| Disposable PostgreSQL regression | Pass; all migrations, role matrix, isolation and rollback checks |
| Secret review | Pass; no environment values added or printed |

## Post-deployment checks

1. Apply `202609170003_formal_academic_records.sql` to the linked Supabase project.
2. Verify `/api/health` returns healthy configuration and database state.
3. Sign in as the platform operator and confirm School portfolio, Branches, Owners, Commercials and Onboarding.
4. Sign in as a school owner and confirm no tenant-creation control appears.
5. Open Report cards as owner, teacher and family accounts and verify their distinct surfaces.
6. Generate one test reporting period in a pilot tenant, complete one subject register, submit, approve, publish and verify the linked family notification and printable card.
7. Run responsive checks at 1440 px, 1024 px and 390 px and confirm keyboard focus through tabs, forms and registers.
