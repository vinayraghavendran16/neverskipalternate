# Northstar School OS

The production foundation, people directory, academics, attendance and teacher daily workspace for a calmer, faster replacement for legacy school ERP/LMS software.

Phase 1 converts the original clickable prototype into a production-oriented Next.js application backed by Supabase Auth, PostgreSQL, Row Level Security and private file storage.

## Phase 1–5 status

- Next.js App Router with strict TypeScript
- Cookie-backed Supabase authentication
- Protected routes using the Next.js 16 `proxy.ts` convention
- Organization, campus and academic-year tenancy
- Seven application roles with explicit database policies
- Student, guardian, class and enrollment foundation entities
- Row Level Security on every exposed application table
- Explicit PostgreSQL grants for `anon` and `authenticated`
- Private tenant-path file bucket with a 25 MB policy limit
- Append-only audit-event table
- Security headers and environment validation
- Supabase migration, structural seed and pgTAP foundation tests
- CI workflow for lint, type-check and production build
- Original teacher workflow prototype preserved at `/prototype/index.html`
- Functional navigation with clear planned-module states
- Searchable student, staff and guardian directories
- Fast create and edit forms with role-aware controls
- Guardian-to-student relationship and pickup authorization records
- CSV student import with admission-number upserts
- Privacy-aware people RLS and append-only mutation audit events
- Class and section setup against the active academic year
- Subject catalogue and teacher-to-subject allocation
- Class rosters with multi-student enrollment
- Weekly class timetables with conflict-safe period slots
- Present-by-default daily attendance with drafts and submission
- Assigned-class enforcement for teacher attendance changes
- Operational Command Centre with live people, class and attendance metrics
- Teacher Today workspace with personal timetable and open-work indicators
- Reusable class diary entries with draft, publish and previous-entry reuse
- Homework creation across multiple subject-allocated classes
- Assessment setup and spreadsheet-style keyboard marks entry
- One-request batch persistence for attendance and complete class mark registers
- Route loading states, bounded queries and documented performance budgets
- Role-specific family and student portal with linked-learner switching
- Published homework responses, completion tracking and teacher feedback
- Published assessment and attendance progress for families
- Targeted school announcements with expiry and acknowledgement
- Student and staff leave requests with an approval queue
- Fee invoices, balances and atomic offline payment recording

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase Auth
- Supabase PostgreSQL and Storage
- Zod environment validation

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Add the project URL and publishable key from Supabase project settings. Never expose the server secret with a `NEXT_PUBLIC_` prefix.

### 3. Start the local database

Docker Desktop must be running.

```bash
npx supabase start
npx supabase db reset
```

Copy the local API URL and publishable key printed by Supabase into `.env.local`.

### 4. Create the first owner

Sign-up is deliberately disabled. Create or invite a user through Supabase Auth. Then add that user to the seeded organization:

```sql
insert into public.memberships (organization_id, campus_id, user_id, role)
values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '<AUTH_USER_UUID>',
  'owner'
);
```

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`. The original UX MVP remains available at `http://localhost:3000/prototype/index.html`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx supabase test db
```

The extended database transaction and authorization regression suite runs only against an empty disposable PostgreSQL database:

```bash
AUDIT_DATABASE_URL=postgresql://... CONFIRM_DISPOSABLE_DATABASE=yes npm run test:db:isolated
```

## Production setup

1. Create separate Supabase projects for staging and production.
2. Apply migrations with `supabase db push` through CI or an approved release job.
3. Configure the exact production URL in Supabase Auth redirect settings.
4. Store environment variables in the deployment platform; never commit `.env.local`.
5. Create the first owner through a controlled administration workflow.
6. Verify RLS tests, backups, point-in-time recovery and audit access before onboarding a school.

See [Architecture](docs/architecture.md), [Security](docs/security.md), the [Environment runbook](docs/environment-runbook.md), and the [Indian LMS workflow review](docs/india-lms-workflow-review-2026-09-15.md).

## Repository structure

```text
app/                       Next.js routes and server actions
components/                Shared product shell
lib/auth/                  Role and tenant context
lib/supabase/              Browser, server and proxy clients
supabase/migrations/       Reproducible database changes
supabase/tests/            RLS and grant tests
public/prototype/           Original clickable teacher MVP
docs/                      Architecture and operating guidance
```

## Next phase

External notification delivery, payment-gateway settlement, transport, offline queues and production telemetry remain required before a live multi-school pilot.
