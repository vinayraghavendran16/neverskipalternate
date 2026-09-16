# Platform portfolio and school onboarding

The platform console is restricted to emails in the server-side `PLATFORM_OWNER_EMAILS` allowlist. School owners, administrators, teachers, parents and students cannot open it. They continue to use the shared `/login` page and are routed into only the tenant memberships assigned to their account.

## Data captured

School identity includes display and legal names, tenant slug, website, public brand logo, school type, education board, founding year, affiliation number, school contact details, onboarding stage, target go-live, and customer success owner.

Each branch records a unique code, full postal address, optional latitude and longitude, branch contact details, status and timezone. The onboarding form accepts up to 50 branches in one submission.

Each school can have up to 20 owners in the same onboarding workflow. Every owner receives an individual invitation, gets tenant-wide `owner` access, and has a job title, phone number and primary-contact flag in the service-only owner directory.

Commercial data includes plan, billing cycle, recurring amount, one-time implementation fee, contract dates and status, currency and licensed-student capacity. ARR is calculated from active contracts as monthly × 12, quarterly × 4, or annual recurring value.

## Portfolio reporting

The platform dashboard reports active and live schools, branches, active students, active staff, teachers and ARR. School rows link to a drilldown with exact branch locations, branch-level headcount, school identity, owner accountability and contract detail.

Teachers are counted from active staff records whose designation contains teacher, faculty or educator. This is based on the maintained staff directory rather than login accounts; schools can have teachers before issuing logins.

## Reliability and security

School, branch, owner membership and commercial records are inserted by one service-role-only database function. Validation or uniqueness failure rolls back the whole database transaction. Newly created auth accounts and uploaded logos are cleaned up if the transaction fails. Commercial and owner-profile tables have RLS enabled and no authenticated grants. Brand logos are intentionally public because they render on public asset URLs, while uploads remain service controlled and accept only PNG, JPEG or WebP files up to 2 MB.

Existing tenants remain valid. Their additional profile and commercial fields show as pending until populated.

Open any school row to manage an existing tenant. The platform operator can update its profile, branding, onboarding stage and commercial terms; add up to 50 branches in one batch; complete a legacy branch address; or invite up to 20 additional owners together. These mutations use service-only functions and write tenant audit events.

## Market-informed fields

The model reflects capabilities consistently emphasized by Indian school ERP vendors: multi-campus aggregation, central student information, admissions and enrollment capacity, staff and payroll context, finance, transport, regulatory or board details, role-based dashboards, white-label branding, onboarding support and account ownership. Product work after this phase should add editable onboarding milestones, module entitlements, payment collection and renewal forecasting.
