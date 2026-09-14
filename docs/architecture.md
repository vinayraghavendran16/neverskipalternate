# Northstar architecture

## Decision

Northstar starts as a modular Next.js application with Supabase providing authentication, PostgreSQL and object storage. This keeps deployment and operations simple while preserving clear domain boundaries.

## Request path

1. `proxy.ts` refreshes the Supabase session and performs only an optimistic protected-route check.
2. Server Components verify the user with `supabase.auth.getUser()`.
3. `getUserContext()` resolves the user's active organization, campus and application role.
4. Database Row Level Security independently constrains every request to permitted organization rows.
5. Mutations append audit events with actor, organization, action, entity and metadata.

Authorization is never delegated to navigation visibility or Proxy alone.

## Tenant model

- An organization represents one school group or independent school.
- Campuses always belong to an organization.
- Academic years are organization-scoped.
- A user can hold multiple organization memberships and roles.
- Operational records carry `organization_id` directly.
- Composite foreign keys prevent a record from pointing across organizations.
- RLS filters organization records using caller-scoped membership helpers.

## Domain boundaries

Phase 1 establishes:

- Identity: profiles and sessions
- Organization: schools, campuses and academic years
- Authorization: memberships and roles
- People: students and guardians
- Academics: classes and enrollment
- Files: governed metadata and private objects
- Governance: audit events

Phase 2 extends People into operational directories:

- Student records with school identifiers, contact and care details
- Staff and teacher records that may be created before an Auth account exists
- Guardian contacts that may be created before portal access is invited
- Guardian-student relationships, primary-contact and pickup authorization flags
- CSV student import with admission number as the tenant-scoped upsert key

People mutations remain server actions backed by Zod validation, RLS and audit events. Records are archived through status changes instead of hard deletion.

Phase 3 makes Academics and Attendance operational:

- Academic-year classes and sections
- Reusable subject catalogue and teacher allocations
- Active class rosters backed by student enrollments
- Weekly timetable periods with class/day/period collision protection
- One daily attendance session per class with present-by-default student records
- Draft, submitted and locked register states
- Teacher writes restricted to homeroom or allocated classes at both server-action and RLS boundaries
- Attendance correction records designed for a later approval inbox
- Live Command Centre metrics and audited recent activity

Teaching, assessment, communication, finance and transport will be added as migrations without splitting into services prematurely.

Phase 4 adds the teacher execution layer:

- Teacher Today composes assigned timetable periods and open work into one server-rendered view
- Lesson diary entries are tied to class-subject allocations and optional timetable periods
- Homework content is created once and mapped to multiple eligible classes
- Assessments own a single active roster marks grid
- Marks stay in browser-local state while typing and persist in one batch
- Database triggers reject marks above the assessment maximum and students outside the active roster
- Teacher policies resolve the authenticated staff profile against explicit subject allocation

The performance decisions and pilot budgets are recorded in [Performance guardrails](performance.md).

## File model

All object paths begin with the organization UUID:

```text
<organization-id>/<domain>/<entity-id>/<random-id>-<safe-filename>
```

The `file_objects` record carries ownership, classification, MIME type, byte size and malware-scan state. A file should not be exposed to end users until `scan_status = 'clean'`.

## Environment boundaries

- Development: local Supabase and synthetic school data
- Staging: separate Supabase project with production-like policies
- Production: isolated Supabase project, controlled migrations and no demo data

Never share database projects, storage buckets or service secrets across these environments.
