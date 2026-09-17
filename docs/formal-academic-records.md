# Formal academic records

## Purpose

Northstar separates live progress dashboards from formal academic records. Dashboards help people act during a term; report cards are controlled records that become visible to families only after review and publication.

## Workflow

1. A school owner, administrator or principal creates a reusable template and reporting period.
2. An owner, administrator, principal or staff member generates the class roster from active enrolments.
3. Each assigned subject teacher enters grades, an optional percentage and evidence-based feedback in one atomic register save.
4. A school leader adds overall comments. Every subject requires a grade before the class can be submitted.
5. An assigned teacher or school leader submits the class. Registers are locked.
6. An owner, administrator or principal approves and publishes the class.
7. Linked students and guardians receive an in-app notification and can open, print or save the report card. The transcript includes published records only.

## Access boundary

| Role | Access |
|---|---|
| Platform operator | Creates and archives school tenants through the allowlisted platform console; no school record access is inferred from this role. |
| School owner | Configures formats and periods, reviews all classes, approves and publishes. |
| Administrator | Same formal-record management rights as the school owner, except platform tenancy. |
| Principal | Academic configuration, review, approval and publication. |
| Teacher | Assigned classes and assigned subject registers; can submit a completed class but cannot approve, publish or alter leader comments. |
| Staff | May generate class report rosters and view school workflows; cannot configure templates, approve or publish. |
| Parent | Published records for linked children only. |
| Student | Own published records only. |

RLS and workflow triggers enforce the boundary even if a client bypasses the interface. Tenant identity, student identity and template identity cannot be changed after a card is created. Submitted, approved and published rows are locked.

## Reliability

- Class generation uses the active roster and is idempotent.
- Subject registers and overall comments save atomically.
- Invalid or incomplete batches roll back.
- Workflow transitions can move only draft to submitted to approved to published.
- Publication creates recipient-scoped in-app notifications.
- Every application mutation writes an audit event.

## Current limits

- Published records are immutable; a formal amendment and reissue workflow is not yet implemented.
- No regulator-specific CBSE, ICSE, IB or state-board template pack is supplied yet.
- GPA, rank, promotion decisions, signatures and certificates are not calculated.
- Browser print produces the PDF; server-side signed document generation is not implemented.
- Email and SMS publication alerts require an approved provider adapter. In-app alerts work now.
