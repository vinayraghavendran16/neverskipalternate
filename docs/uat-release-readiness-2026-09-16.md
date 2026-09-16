# Northstar UAT and release-readiness findings

**Test date:** 16 September 2026

**Release candidate:** `codex/release-readiness-uat`

**Production baseline:** `d7458922cc42`
**Production:** <https://northstar-school-os-nu.vercel.app>

## Decision

**GO for deployment with documented pilot controls.** The delivered Phase 1–8 scope passed its automated quality gates, isolated database regression and signed-in owner route sweep. Five verified UX, accessibility and performance defects were fixed in the release candidate. No unresolved release-blocking defect remains in the audited scope.

Before a multi-school pilot, named teacher, parent, student and finance users should complete role-specific acceptance, and backup/point-in-time recovery settings should be verified in the Supabase console.

## Scope and method

The review covered visible navigation, setup, people, academics, attendance, teacher work, homework, assessments, family learning, calendar, communication, notifications, approvals, finance, transport and operations. It combined:

- a signed-in production owner route sweep;
- semantic and keyboard-accessibility inspection;
- responsive layout inspection at desktop and tablet widths;
- implementation and security-header review;
- lint, strict TypeScript, unit tests and the optimized production build;
- a clean disposable PostgreSQL migration and authorization regression;
- a production dependency vulnerability audit;
- a production health and response-header check.

The available environment did not expose the required Chrome DevTools performance connector. No Lighthouse or Core Web Vitals values are claimed. Navigation observations below measure wall-clock time until visible route content during browser automation and include network and tool overhead.

## UAT matrix

| Workflow | Route | Result | Evidence |
|---|---|---:|---|
| Command centre | `/dashboard` | Pass | Live metrics, quick actions, attention state and release identity rendered. |
| Teacher Today | `/dashboard/teacher` | Pass | Timetable and task entry points rendered without console errors. |
| People | `/dashboard/people` | Pass | Directory, filters, tab navigation and create/import actions rendered. |
| Academics | `/dashboard/academics` | Pass after fix | Classes, subjects and setup rendered; side-panel form layout fixed. |
| Attendance | `/dashboard/attendance` | Pass | Class register entry points and current status rendered. |
| Homework | `/dashboard/homework` | Pass | Creation prerequisites, assignments and response paths rendered. |
| Assessments | `/dashboard/assessments` | Pass | Guided setup and assessment register rendered; prerequisite message is actionable. |
| Calendar | `/dashboard/calendar` | Pass after fix | Upcoming events and publishing form rendered; date/time overflow fixed. |
| Communication | `/dashboard/communication` | Pass after fix | Audience-targeted announcements and acknowledgement controls rendered; labels fixed. |
| Notifications | `/dashboard/notifications` | Pass | Inbox, unread state and consent preferences rendered. |
| Approvals | `/dashboard/approvals` | Pass | Leave and attendance-correction queues rendered. |
| Finance | `/dashboard/finance` | Pass | Invoices, balances and controlled offline payment workflow rendered. |
| Transport | `/dashboard/transport` | Pass | Vehicle, route, stop, rider and alert workflows rendered. |
| System health | `/dashboard/operations` | Pass | Release, schema readiness, incident queue and audit signals rendered. |

Every audited page exposed one main landmark and one page heading. No unnamed links or buttons were found. No console error or warning appeared during the route sweep.

## Verified defects and fixes

1. **Calendar form overflow:** two-column date/time controls could exceed the publishing card and clip its right side. Grid children and controls now permit shrinking within their card.
2. **Academic setup compression:** the create-class form became difficult to scan in its narrow side card. Side-panel setup now uses one clear column.
3. **Tablet sign-out rendering:** text wrapped vertically inside the compact sidebar. The compact sidebar now presents a stable icon while retaining the button’s accessible name.
4. **Audience wording:** generated plural text produced unnatural accessible output such as “Teacher s”. Event and announcement forms now use explicit labels: Teachers, Parents, Students and Staff.
5. **Shared navigation waterfall:** the shell opened a separate unread-notification request after route data. The unread count now loads in parallel with profile, school and campus context.

## Performance observations

| Route | Content-ready observation |
|---|---:|
| Attendance | 2.394 s |
| Teacher Today | 2.424 s |
| Notifications | 2.540 s |
| People | 2.526 s |
| Finance | 2.582 s |
| Academics | 2.607 s |
| System health | 2.737 s |
| Command centre | 2.982 s |
| Assessments | 2.950 s |
| Approvals | 3.004 s |
| Calendar | 3.063 s |
| Transport | 3.096 s |
| Homework | 3.121 s |
| Communication | 3.689 s |

Observed range: **2.394–3.689 seconds**. These are qualitative navigation observations, not Core Web Vitals. The release removes one shared database request from every authenticated page. A future performance phase should add trace-based LCP, INP and CLS budgets through a browser-performance runner in CI.

The production health endpoint returned HTTP 200, `configuration: ok`, `database: ok`, an internal database latency of **732 ms**, and `cache-control: no-store`. The external request completed in 2.021 seconds from the audit environment.

## Security and database reliability

- Production dependency audit: 0 info, low, moderate, high or critical vulnerabilities across 27 production dependencies.
- Security headers: HSTS, frame denial, MIME-sniffing protection, restrictive referrer policy, cross-origin opener isolation and camera/microphone/geolocation denial were present.
- CSP blocks objects, framing and non-self defaults. Inline script/style allowances remain because the current Next.js delivery has no nonce architecture; tightening this requires a tested nonce rollout.
- The clean database run applied all 10 migrations and passed the full rollback-based regression.
- Verified database behaviours include tenant isolation, linked-family visibility, assigned-teacher access, locked attendance protection, atomic attendance/marks/payment/correction functions, rollback on invalid batches, transport capacity, timetable overlap rejection, incident redaction, notification consent and idempotent fan-out.
- No environment value or secret is included in the report or committed files.

## Quality gates

| Gate | Result |
|---|---:|
| ESLint | Pass |
| Strict TypeScript | Pass |
| Unit tests | 7/7 pass |
| Production build | Pass; all route entries compiled and 24 page-data jobs completed |
| Isolated PostgreSQL regression | Pass |
| Production dependency audit | 0 vulnerabilities |
| Production health | HTTP 200; configuration and database healthy |

## Limitations and pilot controls

- The live signed-in session represented the owner role. Teacher, parent, student, staff and finance access was covered through database authorization regression and role-aware implementation review, but named stakeholder UAT remains required.
- UAT did not create or alter production school records. Destructive and outbound communication actions were excluded from the live route sweep.
- The environment lacked Chrome DevTools performance tracing, so no instrumented Core Web Vitals are reported.
- pgTAP files are present but the local disposable runner validates equivalent high-risk authorization and transaction paths through its regression SQL. Hosted pgTAP should remain part of the staging release procedure.
- Email and SMS providers are intentionally disabled; only in-app delivery is operational.

## Prioritized roadmap

1. **Phase 9 — payments and reconciliation:** gateway orders, signed webhooks, idempotent settlement, refunds and reconciliation.
2. **Phase 10 — reliable offline work:** attendance and teacher queues with safe retry and conflict handling.
3. **Phase 11 — admissions:** applications, document verification, decisions and enrolled-student conversion.
4. **Phase 12 — academic reporting:** report cards, transcripts, progress analysis and exportable reports.

Ask Northstar, voice input, ElevenLabs and automated voice announcements remain parked until privacy, consent, retention, provider and cost decisions are approved.
