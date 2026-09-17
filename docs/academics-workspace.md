# Academics workspace

## Product decision

Academics separates daily teaching from structural setup. Teachers see their assigned classes and direct actions. Owners, administrators and principals also see academic setup controls.

Each class uses four focused views:

1. **Overview** shows attendance, homework, assessment and class-diary actions plus setup readiness.
2. **Roster** keeps the current class list visible and lets academic managers search, select and add students in one batch.
3. **Subjects & teachers** makes ownership gaps visible and lets managers allocate or update a teacher without duplicating a subject.
4. **Timetable** gives the weekly schedule the full page width and keeps period editing in the same view.

Teachers are limited in the application to homeroom classes and classes where they have a subject allocation. Database row-level security remains the underlying tenant boundary.

## Market patterns used

- Fedena connects subject allocation, teacher ownership, attendance and timetables, and gives teachers their assigned timetable in a dedicated login.
- Teachmint emphasizes clash prevention, resource allocation and rapid timetable changes.
- Entab emphasizes one-tap attendance, lesson planning, substitution alerts and reducing teacher paperwork.
- MyClassboard groups class-teacher, subject-teacher and timetable setup within Academics.

The useful common pattern is a single class context with role-specific actions. Northstar keeps that pattern while avoiding large mixed setup pages and repeated navigation.

## Current limits

- Timetable creation is manual. Automated generation, faculty-load balancing, room conflict resolution and substitute allocation are future work.
- Homework and assessment quick actions open their module workspace; class and subject preselection can be added once those forms accept stable URL state.
- Homeroom assignment exists in the data model but does not yet have a dedicated editor.
- Academic-year rollover, promotion and section transfer need guided bulk workflows before a live year-end operation.
