# Security baseline

Northstar stores information about children. Security and privacy are product architecture, not a later compliance exercise.

## Implemented controls

- Invite-only authentication
- Server-verified sessions on protected pages
- Organization-scoped role memberships
- Row Level Security on every exposed application table
- Explicit client grants after revoking schema defaults
- Authorization helpers in a non-exposed `private` schema
- Pinned `search_path` on security-definer functions
- Composite tenant foreign keys
- Private object storage with organization-prefixed paths
- Append-only audit events
- No committed secrets
- Baseline browser security headers

## Required before a real-school pilot

- MFA for owner and administrator roles
- Rate limiting and abuse detection on login and recovery
- Email-domain and invitation governance
- Antivirus/malware scanning for every upload
- Field-level encryption strategy for health and safeguarding data
- Tested backup restoration and point-in-time recovery
- Retention and deletion policy by data category
- Security event alerting and incident runbooks
- Dependency, secret and static-analysis scanning
- External penetration test
- Documented privacy impact assessment

## Secrets

The publishable Supabase key is designed for browser use and is constrained by RLS. The secret/service key bypasses RLS and must remain server-only. It must never appear in browser bundles, screenshots, logs or support exports.

## Authorization rule

Every operation must pass both checks:

1. The application determines whether the action belongs in the user's role workflow.
2. PostgreSQL RLS verifies the caller may access the target tenant row.

The database check is mandatory even when the application check exists.
