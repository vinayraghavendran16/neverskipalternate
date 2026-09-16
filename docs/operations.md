# Production operations

Northstar exposes `GET /api/health` for uptime monitoring. A healthy response confirms that public configuration parses and Supabase accepts a database query. The response never includes credentials, database errors or tenant data. Configure an external monitor to alert after three consecutive non-200 responses rather than on a single transient failure.

Authenticated application error boundaries hash an opaque digest into a one-way fingerprint and send only that fingerprint with a normalized dashboard route to the tenant incident queue. Raw digests, error messages, stack traces, form values, student data and request bodies are deliberately excluded. Owners and administrators can acknowledge and resolve incidents from **System health**.

Resolved incidents older than 90 days can be removed from System health. Audit records remain separate and append-only. Before resolving an incident, reproduce the affected workflow, correlate the incident time with Vercel runtime logs, verify `/api/health`, and confirm the workflow succeeds.

For every production release:

1. Run lint, typecheck, unit tests, database regression tests and the production build.
2. Apply the pending Supabase migration before promoting application code that uses it.
3. Test the Vercel preview with production-equivalent environment variable names.
4. Merge to `main` and confirm Vercel creates a Production deployment.
5. Verify `/api/health`, sign-in, one read workflow and one write workflow.
