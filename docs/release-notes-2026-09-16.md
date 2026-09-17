# Northstar release notes — 16 September 2026

## Platform portfolio onboarding

- Reorganized Homework into Assignments, Create and Review tabs with live completion, overdue and review signals.
- Added class-prefilled homework and assessment creation, bulk class selection, student search and exception-first homework review.
- Reorganized Assessments into Register, Create and Insights tabs with mark coverage and subject-level performance summaries.
- Added mark-register search and filters, missing-result highlighting, live completeness counts and a guarded publish-and-lock step.
- Replaced raw database errors in teaching actions with safe recovery messages and documented the workflow and current limits.
- Rebuilt Academics as a teacher-first workspace with assigned-class visibility, setup readiness, full-width class tabs, bulk roster search and direct teaching actions.

- Added multi-branch school provisioning with exact addresses, optional map coordinates, and branch contacts.
- Added multi-owner invitation and a platform-only owner directory with activation state and accountable-contact metadata.
- Added school websites, public tenant logos, board/type details, affiliation data, onboarding stage and customer-success ownership.
- Added plan, contract, licensed capacity and annualized recurring revenue reporting.
- Added platform KPIs and school drilldowns for branch, student, staff, teacher, owner and commercial detail.
- Applied school branding in the assigned tenant shell while keeping provisioning controls platform-only.
- Added platform-only management for existing tenants: profile/commercial updates, bulk branch expansion, branch location completion and multi-owner invitations.
- Added fixed-price forecasted ARR at ₹3,00,000 per non-deleted school, separately from contracted ARR.
- Added one-month free pilot enforcement and active/expired pilot portfolio metrics.
- Added a logo-led school portfolio and controlled school deletion with immediate access suspension, retained records and restoration.
- Split the platform console into Existing schools, Commercials, Pipeline and Pilots tabs for focused portfolio operations.
- Reorganized the platform console into full-width School portfolio, Branches, Owners, Commercials and Onboarding tabs. School creation, implementation pipeline and one-month pilots now share the dedicated Onboarding workspace.
- Split each school portfolio into Overview, Metrics, School & commercials, Branches and Owners tabs, with a bounded school-level KPI dashboard.
- Rebuilt attendance around one-tap exception marking, approved-leave defaults, assigned teacher classes, live status counts, exception review, common reasons, undo and rapid date navigation.

## Release-readiness update

This update completes a product-wide audit of the currently delivered Phase 1–8 workflows.

### Fixed

- Calendar publishing controls no longer overflow or clip at narrower desktop and tablet widths.
- Academic setup forms use a readable single-column layout inside their side panel.
- The compact tablet sidebar now renders Sign out as a stable icon instead of vertically wrapped text.
- Announcement and event audiences expose natural plural labels to both visual and assistive-technology users.
- Shared form controls have explicit minimum-width protection, visible keyboard focus and bounded date/time inputs.
- The application shell no longer performs a separate sequential notification query. Unread state is loaded in parallel with the existing user context.

### Added

- Help & releases is available from every role’s navigation.
- The in-product guide links each role to its core workflows and explains school setup, assessment prerequisites, incident recovery, data protection and notification channels.
- Release history and the prioritized Phase 9–12 roadmap are visible in the product.
- A versioned UAT and release-readiness PDF is linked from the product.

### Verification

- Signed-in production owner UAT covered 14 visible module routes.
- Lint, strict TypeScript, 7 unit tests and the optimized production build pass.
- The isolated PostgreSQL regression suite passes across tenant isolation, role access, atomic workflow functions and failure rollback.
- The production dependency audit reports 0 known vulnerabilities.
- The production health endpoint returns HTTP 200 with configuration and database checks healthy.

### Known limits

- Live signed-in UAT used the available owner account. Other roles were verified through role-aware routes, database authorization regression and implementation review; they still require named stakeholder acceptance before a multi-school pilot.
- Instrumented Core Web Vitals were unavailable because the required Chrome DevTools performance connector was not present. Recorded route timings are content-ready navigation observations and are not LCP, INP or CLS measurements.
- Email and SMS delivery providers remain disabled. In-app notifications and channel consent storage are active.
- Payment gateway processing, offline work queues, admissions and report-card generation are planned work.
- Ask Northstar, voice input, ElevenLabs and automated voice announcements remain parked by product decision.
