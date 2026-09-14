# Environment and release runbook

## Provision an environment

1. Create a new Supabase project in the correct organization.
2. Record the project reference and environment owner.
3. Configure Auth site URL and the exact `/auth/callback` redirect URL.
4. Add the application URL and publishable key to the deployment platform.
5. Store the Supabase secret only in server-side release or administration contexts.
6. Link the Supabase CLI and apply migrations.
7. Run database tests.
8. Invite the initial owner and create their membership.
9. Verify login, tenant context, audit insert and cross-tenant denial.

## Release gate

A release may proceed only when:

- Lint passes
- TypeScript passes
- Production build passes
- Database migration applies cleanly on staging
- RLS tests pass
- Rollback or forward-fix plan is documented
- No secrets appear in the diff

## Migration discipline

- Never edit a migration already applied to a shared environment.
- Add a new timestamped migration for every schema or policy change.
- Apply production migrations from CI or a designated release workstation.
- Back up before destructive migrations.
- Treat policy changes as security changes and require review.

## Incident basics

For suspected tenant leakage, disable the affected API path, preserve audit evidence, rotate compromised credentials, identify exposed record scope and notify the incident owner. Do not delete audit records during investigation.
