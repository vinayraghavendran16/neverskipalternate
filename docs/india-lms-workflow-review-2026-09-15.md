# Indian school LMS workflow review

Reviewed on 15 September 2026. This review uses public product and support material, not vendor access or claims of feature parity.

## Reference products

- [Teachmint LMS](https://www.teachmint.com/en-us/learning-management-system) groups live classes, homework, tests, classroom communication, attendance and performance analytics around daily teaching.
- [MyClassBoard school management software](https://www.myclassboard.com/school-management-software/) provides separate parent, student, teacher and management experiences, with attendance, assignments, grades, communication, fees and reporting.
- [MyClassBoard automated alerts](https://www.myclassboard.com/erp/automated-alerts/) emphasizes targeted notices, scheduled reminders, app notifications and delivery or engagement visibility.
- [Fedena process flow](https://support.fedena.com/support/solutions/articles/266503-process-flow-start-using-fedena) gives parents one place for child profiles, attendance, examination reports, notices, fees and transport information.
- [Fedena feature tour](https://fedena.com/feature-tour) covers role dashboards, gradebooks, parent access, fees, calendars, transport, HR and other school operations.

## Product decisions

The shared pattern is a role-specific home with a small number of complete workflows. Northstar now adds:

1. A family and student home for each linked learner, showing open homework, attendance rate, published results and fee dues.
2. Homework responses and completion state, plus a teacher review screen with feedback.
3. Role- and campus-targeted announcements with priority, expiry and acknowledgements.
4. Student and staff leave requests with a visible approval history.
5. Student fee invoices, balances and atomic recording of verified offline payments.

The implementation keeps the useful Northstar principle of present-by-default attendance, batched registers and a calm task-oriented interface. Each new table uses tenant keys, Row Level Security, active-membership restrictions, bounded fields, indexes and mutation auditing.

## Explicit boundaries

- Online fee payment is labelled unavailable. Enabling it requires a selected gateway, server-side order creation, signed webhook verification, idempotency, settlement reconciliation and refunds.
- SMS, WhatsApp and push delivery are not implied by an in-app announcement. External delivery needs approved providers, consent and delivery callbacks.
- Transport remains labelled unavailable until routes, stops, vehicles, authorized pickup and location-retention rules are designed together.
- Live classes, admissions, payroll, library and hostel operations remain later modules. Adding all vendor modules at once would create shallow, unsafe workflows and make the core harder to operate.

## Release checks

Apply `202609150001_family_communication_operations.sql` before deploying the application. Test at least one owner, teacher, parent and student account against linked records. Verify that unpublished assessments, unrelated learners, unrelated invoices and non-targeted notices are invisible to family accounts.
