# Northstar School OS — MVP

An interaction-first school operating system prototype based on the Neverskip product teardown and replacement blueprint.

## What is included

- Role-based login preview for Teacher, Administrator, and Parent
- Teacher **Today** workspace organized around the school day
- Fast attendance entry with present-by-default, exception marking, reasons, and offline-safe state messaging
- Class diary authoring with reuse, multi-section publishing, parent preview, and digest delivery controls
- Spreadsheet-style marks entry with autosave, validation, and moderation state
- Global command search and responsive desktop/mobile navigation
- Local persistence through `localStorage`

The Teacher experience is the first deep vertical slice. Administrator and Parent shells establish the role-based information architecture for the next iteration.

## Run locally

No build step or package installation is required.

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Demo login

The form is prefilled. Choose a role and select **Sign in**. All data is fictional.

## MVP principles

- Today before modules
- Bulk before single-record entry
- Autosave and visible system state
- Keyboard and spreadsheet-friendly workflows
- Recoverable work and explicit delivery status
- One shared information model across roles

## Next build sequence

1. Connect authentication and tenancy
2. Add a persistence API and audit events
3. Complete roster/timetable import
4. Add parent child timeline and communication search
5. Build administrator exception queues
6. Add fee ledger/reconciliation and transport freshness

