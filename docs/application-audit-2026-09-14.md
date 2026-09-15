# Application audit — 14 September 2026

## Scope

The audit covered every Next.js route and server action, the retained `/prototype` experience, shared navigation and forms, the Supabase schema and row-level policies, environment handling, dependency health, CI checks, and production compilation.

## Verified issues fixed

- Closed open redirects in password and callback sign-in flows, preserved query strings through authentication, and removed the inactive-membership redirect loop.
- Repaired broken dashboard links and filters, added stable server-side people search and pagination, and made planned modules visibly unavailable.
- Added role-specific family navigation and an honest family landing page; teachers now start in their daily workspace.
- Restored usable mobile navigation, keyboard focus, skip navigation, reduced-motion behavior, readable control sizes, accessible table/action labels, and live form feedback.
- Marked unsupported controls in the retained prototype unavailable and removed its remote font dependency.
- Preserved class-diary drafts when revisiting an entry and made class switching update the form context.
- Replaced partial attendance, marks, and homework writes with atomic database functions. Added roster checks, register locks, timetable relationship and overlap constraints, bounded notes, and consolidated batch audit events.
- Restricted unpublished marks, enrollment enumeration, attendance sessions, and private files from family accounts. Suspended members and inactive organizations now lose tenant data access.
- Added explicit query-failure states so database errors cannot appear as zero metrics, an empty roster, or a fresh editable register.
- Added error and not-found recovery pages, hardened response headers, broadened environment-file ignores, and confirmed no environment file is tracked.
- Aligned application identifier validation with PostgreSQL UUID syntax so deterministic seed IDs work across class, attendance, diary, homework, and assessment forms.
- Moved directory filtering and pagination into PostgreSQL and removed the prototype’s third-party font requests.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — passed (redirect security cases)
- `npm run build` — passed
- `npm audit --omit=dev --audit-level=moderate` — passed, zero vulnerabilities
- The existing migrations and the initial hardening migration applied successfully to a fresh disposable PostgreSQL database. The final batch-audit additions were syntax-reviewed but could not be rerun after the local approval service blocked further database access.
- The extended rollback-based database regression suite is checked in at `tests/database/regression.sql`. Its execution was blocked by the local approval service; run `npm run test:db:isolated` with the documented disposable-database safeguards or `npm run db:test` with Supabase running.

## Operational follow-up

Before production rollout, apply the migration to staging, run the full Supabase pgTAP and isolated regression suites, inspect any migration failure for pre-existing duplicate diary entries or overlapping timetable periods, and confirm backup and point-in-time recovery settings in the hosted project.
