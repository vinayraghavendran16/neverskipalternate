# Command Centre audit — 16 September 2026

## Market evidence used

- Entab positions a real-time, multi-branch dashboard spanning admissions, finance, academics, attendance and operations. This phase adopts the branch selector and concise operational pulse, without copying its interface: <https://www.entab.in/entab-one.html>
- Fedena documents role- and privilege-specific dashboards with live status cards, attendance, finance and approval shortcuts. This phase uses that pattern to tailor actions and visibility by role: <https://fedena.com/feature-tour/customizable-dashboard>
- LEAD describes a centralized dashboard with role-based access, attendance, staff and reporting controls. This phase adds the owner access panel and role boundaries: <https://leadschool.in/school-owner/solutions/school-erp-software>
- Current user-review signals favour all-in-one daily administration and reduced manual work, while warning about crowded navigation, setup complexity, bugs and slow pages. The resulting design keeps a short daily-attention list, four role-aware shortcuts and three operational signals: <https://www.g2.com/products/fedena/reviews> and <https://www.capterra.com/p/163105/Teachmint/reviews/>

## Verified fixes

- Management content and quick actions now differ for owner, administrator, principal and staff roles. Teacher and family roles retain their dedicated destinations.
- Owners can create another school tenant, switch between their schools, add branches, invite users and grant administrator rights from the Command Centre.
- Administrators can add branches and invite operational users, but cannot grant administrator rights or change owner access.
- The release identifier links to the in-product release notes and UAT evidence.
- Recent audit activity links to the affected module and can be filtered by type, start date and end date.
- Branch scope filters the headline student, staff, class and attendance measures.
- An operational pulse adds pending approvals, outstanding fees and upcoming events without crowding the primary daily-work panel.
- The access directory is tenant-scoped and excludes owner mutation. Parent and student access remains attached to People records.

## Security and reliability checks

- School creation runs in a single database transaction and requires an existing active owner membership.
- User invitations require a server-only Supabase secret. The secret is never exposed to the browser or stored in source.
- If an invited user's membership cannot be saved, the newly created Auth user is removed to prevent an orphan account.
- Access changes validate the target tenant and prevent self-demotion and owner mutation.
- Activity filters use a fixed allow-list; user input cannot inject arbitrary PostgREST filters.

## Remaining gaps

- Schools are separate tenants linked through the owner's memberships. A group-level entity for cross-school comparisons and consolidated reporting does not exist yet.
- Dashboard cards cannot yet be rearranged or personalized per user.
- Trend charts need a reporting aggregate and enough retained history; this phase shows current operational state only.
- Supabase invitation delivery depends on production SMTP configuration. The UI reports configuration or delivery failures without exposing provider details.
- The current Auth directory lookup supports the first 1,000 accounts. It should move to a dedicated tenant invitation service before larger deployments.
- School archival, ownership transfer and user deletion are intentionally absent because they require recovery, legal retention and dual-control decisions.
