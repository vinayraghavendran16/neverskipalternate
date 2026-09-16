# Attendance workflow

Northstar treats attendance as an exception workflow. Every enrolled student starts as present, so the teacher taps only Absent, Late or Excused. The register shows live totals, supports student search and an exception-only review, offers common reason shortcuts, and keeps submission actions visible at the bottom of long rosters. One-step undo and “Everyone present” make mistakes cheap to recover from.

Approved student leave is applied automatically as Excused with its recorded reason unless an attendance record already exists. Teachers see only their homeroom and subject allocations; school leaders retain the whole-school register. Due classes sort ahead of completed classes and the next due register is available from the page header. Previous day, next day and Today navigation make corrections faster.

The database remains the authority. A complete roster is saved atomically, incomplete or changed rosters are rejected, drafts remain recoverable, submitted edits are audited, and locked registers cannot be changed. Attendance corrections continue through the approval queue.

## Reversible demo fixture

`scripts/attendance-demo.mjs` creates 24 clearly labelled demo students, 12 guardians, three staff profiles, four subjects, two Grade 6 classes and their enrollments. Every synthetic record uses the `DEMO-ATT-` marker or a visible `[Demo]` name. It creates no login account and sends no invitation or message.

Create the fixture for a school slug:

```bash
node --env-file=.env.local scripts/attendance-demo.mjs create northstar-academy
```

Delete only the marked fixture:

```bash
node --env-file=.env.local scripts/attendance-demo.mjs delete northstar-academy
```

The deletion path is intentionally explicit and is not exposed as an in-product button. This prevents a school user from accidentally deleting shared test data. Before cleanup, remove any non-demo records manually attached to the demo classes.

## Market patterns adopted

Fedena documents present-by-default rapid attendance, day or subject-wise registers, half-day attendance, reasons, leave handling, reports, mobile capture, parent alerts, and optional biometric/RFID input. Entab describes one-tap attendance, instant parent notifications, and real-time leadership reporting. MyClassboard describes automatic attendance for ERP-integrated online classes.

Northstar adopts the low-friction patterns that fit the current product: present-by-default exception capture, one-tap status changes, approved-leave context, rapid review, assigned-class scoping, live counts, reasons, drafts, auditability and reporting-ready records. Subject-wise sessions, half-day policy, automated family notifications, offline sync, biometrics, RFID and online-class auto attendance require school policy, hardware or conflict-resolution work and remain later phases rather than being simulated in this release.

Sources: [Fedena attendance management](https://fedena.com/feature-tour/student-attendance-management-system), [Fedena rapid attendance documentation](https://support.fedena.com/support/solutions/articles/211470-what-is-marking-and-tracking-student-attendance-), [Entab One](https://www.entab.in/entab-one.html), [MyClassboard SyncUp](https://cdn-mcb.myclassboard.com/gcscdnimages/product_updates/syncUp-mcb-online-classes.pdf).
