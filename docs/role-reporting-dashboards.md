# Role reporting and dashboards

Northstar reporting is designed around the decision each role needs to make next. It does not use page views, clicks, or an opaque engagement score to label learners.

## Delivered experiences

- **Students:** attendance, published assessment averages, subject results, assignment status, feedback, overdue work and clear next actions.
- **Parents:** the same verified school evidence, with child switching and family-oriented language.
- **Teachers:** assigned-class comparisons, marks coverage, work completion and a prioritised list of students whose recorded evidence merits review.
- **Owners, administrators and principals:** school or branch reporting across classes, students, attendance, published learning evidence, homework operations, staffing gaps and fee collection.

The selected reporting period applies to attendance dates, assessment dates and homework due dates. Draft assessments and draft homework are excluded. Every headline links to its operational source.

## Calculation rules

- Attendance rate = present plus late records divided by all submitted learner attendance records.
- Published average = the mean of each scored result converted to a percentage of that assessment's maximum marks.
- Work completion = submitted plus teacher-completed responses divided by assigned work in the selected period.
- “Needs review” appears when attendance is below 75%, a published average is below 50%, or there are two or more overdue assignments.
- “Watch” appears when attendance is below 85%, a published average is below 60%, or there is one overdue assignment.

These thresholds are visible prompts for human review. They are not predictions, diagnoses or measures of learner potential. Empty denominators remain blank instead of being presented as zero performance.

## Product benchmark

The implementation adopts useful patterns from official product documentation:

- [Canvas New Analytics](https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf): grade, activity, communication and submission drill-downs; Northstar follows Canvas's warning that page-view activity is not reliable evidence for high-stakes decisions.
- [Google Classroom guardian summaries](https://support.google.com/edu/classroom/answer/6386354?hl=en): concise missing and upcoming work; Northstar adds permission-safe published grades, which guardian summaries omit.
- [Google Classroom analytics](https://support.google.com/edu/classroom/answer/14221372?hl=en): organization-to-class-to-student drill-down and clear scope limits.
- [ManageBac academic analytics](https://help.managebac.com/hc/en-us/articles/51047822331673-Academic-Overview-and-Analytics): programme, subject, class and student drill-down with visible achievement thresholds.
- [ManageBac parent dashboard](https://help.managebac.com/hc/en-us/articles/51164464166809-Navigating-ManageBac-as-a-Parent): child switching, academic progress, deadlines and attendance in one family view.
- [PowerSchool Student Analytics](https://uc.powerschool-docs.com/unified-insights/latest/student-analytics): school-to-student analysis spanning academics and attendance. Northstar keeps the first view smaller to avoid dashboard overload.
- [Toddle student navigation](https://support.toddleapp.com/en/articles/8612262-how-to-navigate-toddle-on-the-web-as-a-student): one learner space for reports, attendance and deadlines.
- [Teachmint online assessment](https://www.teachmint.com/en-us/online-assessment): individual and classroom performance visibility.

## Current limits and next reporting work

- Trends currently cover only records already stored in Northstar; external SIS and historical imports are not joined.
- Attendance coverage cannot yet distinguish teaching days from holidays because an academic calendar model is not available.
- Subject averages are descriptive and are not adjusted for assessment difficulty or curriculum outcomes.
- Formal report-card templates, comments, approvals, PDF exports and transcripts remain the next reporting phase.
- Large-school scale should move aggregate calculations into bounded database functions or a reporting store once real pilot volumes establish the required dimensions.
