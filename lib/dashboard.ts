export const activityTypes = ["all", "people", "academics", "attendance", "teaching", "communication", "finance", "operations"] as const;
export type ActivityType = (typeof activityTypes)[number];

export function activityHref(action: string, entityType = "") {
  const value = `${action}.${entityType}`.toLowerCase();
  if (value.includes("attendance_correction") || value.includes("leave_request")) return "/dashboard/approvals";
  if (value.includes("attendance")) return "/dashboard/attendance";
  if (value.includes("student") || value.includes("staff") || value.includes("guardian") || value.includes("people")) return "/dashboard/people";
  if (value.includes("class") || value.includes("subject") || value.includes("timetable") || value.includes("academic")) return "/dashboard/academics";
  if (value.includes("diary")) return "/dashboard/teacher/diary";
  if (value.includes("homework")) return "/dashboard/homework";
  if (value.includes("assessment") || value.includes("marks")) return "/dashboard/assessments";
  if (value.includes("announcement") || value.includes("communication")) return "/dashboard/communication";
  if (value.includes("notification")) return "/dashboard/notifications";
  if (value.includes("fee") || value.includes("invoice") || value.includes("payment")) return "/dashboard/finance";
  if (value.includes("transport")) return "/dashboard/transport";
  if (value.includes("event") || value.includes("calendar")) return "/dashboard/calendar";
  if (value.includes("incident")) return "/dashboard/operations";
  if (value.includes("membership") || value.includes("campus") || value.includes("organization")) return "/dashboard#school-administration";
  return "/dashboard";
}

export function activityFilter(value: unknown): ActivityType {
  return activityTypes.includes(value as ActivityType) ? value as ActivityType : "all";
}

export function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? "" : value;
}

export function nextDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

export const activityTypeFilters: Partial<Record<ActivityType, string>> = {
  people: "action.like.people.%,action.like.students.%,action.like.staff_profiles.%,action.like.guardians.%,entity_type.in.(students,staff_profiles,guardians,guardian_relationships)",
  academics: "action.like.academics.%,action.like.classes.%,action.like.subjects.%,action.like.class_%,action.like.timetable_%,entity_type.in.(classes,subjects,class_subjects,class_enrollments,timetable_entries)",
  attendance: "action.like.attendance.%,action.like.attendance_%,entity_type.in.(attendance_sessions,attendance_records,attendance_corrections)",
  teaching: "action.like.teaching.%,action.like.homework.%,action.like.assessment.%,action.like.lesson_%,action.like.homework_%,action.like.assessments.%,entity_type.in.(lesson_diary_entries,homework_assignments,homework_submissions,assessments,assessment_marks)",
  communication: "action.like.communication.%,action.like.announcements.%,action.like.notifications.%,entity_type.in.(announcements,notifications)",
  finance: "action.like.finance.%,action.like.fee_%,entity_type.in.(fee_invoices,fee_payments)",
  operations: "action.like.transport_%,action.like.school_events.%,action.like.operational_%,action.like.campuses.%,action.like.memberships.%,entity_type.in.(transport_routes,transport_vehicles,transport_alerts,school_events,operational_incidents,campuses,memberships)",
};
