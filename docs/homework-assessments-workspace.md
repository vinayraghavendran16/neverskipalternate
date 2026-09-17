# Homework and assessments workspace

## Product decisions

This phase keeps the existing secure teaching model and removes repeated context selection. Teachers can start Homework or Assessments from a class workspace, where the class and first allocated subject are preselected. Dedicated tabs separate creation from registers, review, and analysis.

The workflow follows patterns documented by established Indian school platforms:

- Fedena supports daily assignments, submission tracking, bulk marks entry, result reports, and alerts.
- Teachmint supports graded or ungraded homework, feedback, flexible submission modes, assessment scheduling, and class or student performance analysis.
- Entab emphasizes digital submission, feedback, smart assessment, and shared visibility for students and parents.

Northstar applies the useful parts without copying their dense navigation. Teachers see only their allocations; leaders see the tenant-wide register permitted by the existing role and row-level security rules.

## Homework

1. Open a class and choose **Assign homework**, or open **Homework → Create**.
2. Select a subject, due time, and one or more eligible classes. Use **Select all** for the same subject across sections.
3. Save a draft or publish deliberately.
4. The Assignments tab shows completion, review count, due state, and assigned roster size.
5. The Review tab ranks new submissions first. Inside an assignment, filter by review state or search by student name or admission number.
6. Add feedback and either accept the work or return it for revision.

## Assessments

1. Open a class and choose **Create assessment**, or open **Assessments → Create**.
2. Enter a title, date, maximum marks, and optional weight. The class roster loads automatically.
3. Search or filter the register to focus on missing, scored, or absent students.
4. Press Enter to move through mark cells. Save a partial register at any time.
5. Publishing stays disabled until each student has a score or an explicit absence/not-applicable status. A final confirmation explains that publishing locks the register.
6. The Register tab shows entry coverage and average. Insights roll up coverage and average by subject.

## Current limits and next extensions

- File attachments, rubrics, question banks, online quiz delivery, plagiarism checks, and automatic grading are not yet implemented.
- Parent and student homework views remain available through the existing family learning experience; outbound provider notifications remain disabled until configured.
- Assessment insight is descriptive. Grade boundaries, report cards, longitudinal mastery, moderation, and transcript exports belong in the academic reporting phase.
- Published marks remain intentionally locked. A future controlled correction workflow should require a reason and preserve the original value in the audit trail.

## Security and reliability

- Existing tenant-aware row-level security remains the source of truth.
- Teachers are restricted to allocated class-subject records; authorized school leaders can access school-wide teaching records.
- Server actions validate IDs, active rosters, mark ranges, class allocations, and publish completeness.
- Database errors are not sent to the browser. Users receive a safe recovery message while server logs retain operational detail.
