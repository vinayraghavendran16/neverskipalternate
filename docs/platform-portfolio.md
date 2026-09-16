# Platform portfolio and school onboarding

The platform console is restricted to emails in the server-side `PLATFORM_OWNER_EMAILS` allowlist. School owners, administrators, teachers, parents and students cannot open it. They continue to use the shared `/login` page and are routed into only the tenant memberships assigned to their account.

## Data captured

School identity includes display and legal names, tenant slug, website, public brand logo, school type, education board, founding year, affiliation number, school contact details, onboarding stage, target go-live, and customer success owner.

Each branch records a unique code, full postal address, optional latitude and longitude, branch contact details, status and timezone. The onboarding form accepts up to 50 branches in one submission.

Each school can have up to 20 owners in the same onboarding workflow. Every owner receives an individual invitation, gets tenant-wide `owner` access, and has a job title, phone number and primary-contact flag in the service-only owner directory.

Commercial data includes plan, billing cycle, recurring amount, one-time implementation fee, contract dates and status, currency and licensed-student capacity. ARR is calculated from active contracts as monthly × 12, quarterly × 4, or annual recurring value.

## Portfolio reporting

The platform dashboard reports active and live schools, branches, active students, active staff, teachers and ARR. Its full-width School portfolio, Branches, Owners, Commercials and Onboarding tabs separate the portfolio directories and setup workflow. School, branch, owner and commercial rows link directly to the relevant school drilldown tab.

Teachers are counted from active staff records whose designation contains teacher, faculty or educator. This is based on the maintained staff directory rather than login accounts; schools can have teachers before issuing logins.

## Reliability and security

School, branch, owner membership and commercial records are inserted by one service-role-only database function. Validation or uniqueness failure rolls back the whole database transaction. Newly created auth accounts and uploaded logos are cleaned up if the transaction fails. Commercial and owner-profile tables have RLS enabled and no authenticated grants. Brand logos are intentionally public because they render on public asset URLs, while uploads remain service controlled and accept only PNG, JPEG or WebP files up to 2 MB.

Existing tenants remain valid. Their additional profile and commercial fields show as pending until populated.

Open any school row to manage an existing tenant. The platform operator can update its profile, branding, onboarding stage and commercial terms; add up to 50 branches in one batch; complete a legacy branch address; or invite up to 20 additional owners together. These mutations use service-only functions and write tenant audit events.

## Market-informed fields

The model reflects capabilities consistently emphasized by Indian school ERP vendors: multi-campus aggregation, central student information, admissions and enrollment capacity, staff and payroll context, finance, transport, regulatory or board details, role-based dashboards, white-label branding, onboarding support and account ownership. Product work after this phase should add editable onboarding milestones, module entitlements, payment collection and renewal forecasting.

## Commercial lifecycle and portfolio controls

Forecasted ARR uses the current commercial assumption of ₹3,00,000 per non-deleted school per year, regardless of branch or student count. It stays separate from current ARR so pipeline value is never presented as contracted revenue.

`trial` is the one-month free pilot state. The database sets recurring revenue to zero and calculates the end date as one calendar month after the start date. The dashboard separates active and expired pilots.

The School portfolio tab includes a logo-led school gallery and deleted-school recovery. The Branches tab shows every campus and location, Owners shows access activation and invitation controls, Commercials shows revenue and renewal terms, and Onboarding contains the full-width school creation form, implementation pipeline and pilots. Deleting a school is a controlled archive: it removes the tenant from live metrics and immediately blocks school access while retaining academic, finance and audit history. A platform owner can restore the school and its prior membership assignments.

Each school portfolio has dedicated Overview, Metrics, School & commercials, Branches and Owners tabs. The Metrics tab uses one service-only database aggregate to report people, activated accounts, communications, delivery engagement, academic activity, attendance, fee collection, pending approvals, transport, incidents and audited workflow events without exposing the underlying cross-tenant tables.

## What established systems capture at this stage

The next useful portfolio fields, based on official Indian school ERP material, are:

- sales lifecycle: lead source, opportunity owner, expected close, probability, proposal and loss reason;
- legal and compliance: trust or society, GSTIN, billing address, board affiliation expiry, required documents and data-processing agreement;
- implementation: data-migration status, training sessions, module activation, launch checklist, risks and accountable customer-success manager;
- commercial operations: quote, discount approval, invoice cadence, renewal date, collections status, payment history and expansion value;
- product adoption: enabled modules, active users, login frequency, attendance, fees and communication usage, and support cases;
- group governance: parent group, central office contacts, cross-school permissions and consolidated MIS.

Fedena packages onboarding, data configuration, training, support, backups, modules and white-label options around a trial and subscription. Entab emphasizes multi-branch dashboards, centralized governance, finance, admissions CRM, implementation support and dedicated account management. MyClassboard spans admissions, academics, finance, HR, documents, safety, inventory and communication. Northstar should manage these as progressive onboarding sections with owners, due dates and completeness indicators rather than one oversized form.

Sources: [Fedena pricing and onboarding](https://fedena.com/pricing-and-plans), [Fedena feature tour](https://fedena.com/feature-tour), [Entab One](https://www.entab.in/entab-one.html), [Entab multi-school case study](https://entab.in/entab_adityabirla_casestudy.html), and [MyClassboard school management](https://www.myclassboard.com/school-management-software/).
