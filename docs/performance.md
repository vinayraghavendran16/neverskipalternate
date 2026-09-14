# Performance guardrails

Northstar treats interaction latency as a product requirement, especially for repetitive teacher data entry.

## Interaction design

- Marks are edited in local React state. Typing does not call the server.
- A full class register is persisted with one batched PostgreSQL upsert.
- Enter moves directly to the next student's marks field.
- Attendance uses the same present-by-default, batched-save pattern.
- Route-level loading skeletons prevent blank navigation states.
- Server Components avoid shipping directory and dashboard query logic to the browser.

## Data access

- Dashboard queries run concurrently where there is no dependency.
- High-frequency date, class, assessment and student lookups have dedicated indexes.
- List queries have explicit upper bounds to avoid accidental unbounded payloads.
- Pages select only fields needed for their view.
- RLS helpers use stable, security-definer SQL functions with pinned search paths.

## Performance budgets

These are release targets to verify with production telemetry during the pilot:

- Input response: under 50 ms
- Route interaction response at p75: under 200 ms
- Warm page navigation at p75: under 1 second
- Typical 40-student batch save at p75: under 1.5 seconds
- No per-keystroke database requests

## Scale checkpoints

Before onboarding more than one school, add production Web Vitals, server-action duration logging and slow-query monitoring. Move list filtering and pagination into PostgreSQL when any tenant approaches the current bounded list limits.
