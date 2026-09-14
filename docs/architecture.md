# Phase 1 architecture

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

Attendance, teaching, assessment, communication, finance and transport will be added as migrations without splitting into services prematurely.

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
