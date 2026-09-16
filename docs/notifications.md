# Notification delivery

Northstar stores one deduplicated notification for each active member whose role and campus match a published announcement. Announcement creation, recipient fan-out, in-app delivery receipts and the audit event run in one PostgreSQL transaction.

## Consent and channels

- In-app alerts default to enabled. A user may disable them for future messages.
- Email and SMS default to disabled and require an explicit preference change with a consent timestamp.
- Preference changes affect future notifications. Existing delivery records remain unchanged as an audit trail.
- The notification inbox and delivery tables are protected by Row Level Security. A recipient can read only their own inbox. Owners, administrators and principals can read delivery status, without contact details or message duplication.

## Provider boundary

No email or SMS provider is configured in this phase. Opted-in external deliveries are recorded as `awaiting_provider`; Northstar does not send contact or message data outside Supabase. A future provider adapter must claim rows idempotently, increment attempts, store only the provider message identifier and a safe error code, and cap retries at 20.

Provider credentials must live in the deployment secret store. They must never use a `NEXT_PUBLIC_` name, appear in logs, or be committed to Git.

## Operations

The Communication page shows recent in-app delivery, awaiting-provider and failure counts. The recipient inbox is bounded to 100 active notifications, and unread lookups use a partial index. Delivery rows use stable idempotency keys so retry workers cannot create a second receipt for the same notification and channel.
