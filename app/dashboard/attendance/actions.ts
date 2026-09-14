"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export type AttendanceActionState = { error?: string; success?: string; exceptions?: number };
const attendanceRoles = ["owner", "administrator", "principal", "teacher", "staff"];
function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }

export async function saveAttendance(_: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !attendanceRoles.includes(context.role)) return { error: "You do not have permission to mark attendance." };
  const classId = value(formData, "class_id");
  const attendanceDate = value(formData, "attendance_date");
  const submit = value(formData, "intent") === "submit";
  if (!classId || !/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) return { error: "Choose a class and valid attendance date." };
  const { data: classRecord } = await supabase.from("classes").select("id, campus_id, homeroom_teacher_user_id").eq("id", classId).eq("organization_id", context.organizationId).maybeSingle();
  if (!classRecord) return { error: "Class not found." };

  if (context.role === "teacher" && classRecord.homeroom_teacher_user_id !== context.userId) {
    const { data: staff } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    const { data: allocation } = staff ? await supabase.from("class_subjects").select("id").eq("class_id", classId).eq("teacher_staff_id", staff.id).limit(1).maybeSingle() : { data: null };
    if (!allocation) return { error: "This class is not assigned to your teacher profile." };
  }

  const { data: enrollments } = await supabase.from("class_enrollments").select("student_id").eq("class_id", classId).eq("organization_id", context.organizationId).eq("status", "active");
  if (!enrollments?.length) return { error: "Add students to this class before taking attendance." };
  const { data: session, error: sessionError } = await supabase.from("attendance_sessions").upsert({
    organization_id: context.organizationId, campus_id: classRecord.campus_id, class_id: classId,
    attendance_date: attendanceDate, status: submit ? "submitted" : "draft", marked_by: context.userId,
    submitted_at: submit ? new Date().toISOString() : null,
  }, { onConflict: "class_id,attendance_date" }).select("id").single();
  if (sessionError) return { error: sessionError.message };

  const validStatuses = new Set(["present", "absent", "late", "excused"]);
  const records = enrollments.map(({ student_id }) => {
    const chosen = value(formData, `status_${student_id}`);
    const status = validStatuses.has(chosen) ? chosen : "present";
    return { organization_id: context.organizationId, session_id: session.id, student_id, status, reason: value(formData, `reason_${student_id}`) || null, marked_at: new Date().toISOString() };
  });
  const { error: recordError } = await supabase.from("attendance_records").upsert(records, { onConflict: "session_id,student_id" });
  if (recordError) return { error: recordError.message };
  const exceptions = records.filter((record) => record.status !== "present").length;
  await writeAuditEvent({ organizationId: context.organizationId, action: submit ? "attendance.submitted" : "attendance.draft_saved", entityType: "attendance_session", entityId: session.id, metadata: { class_id: classId, attendance_date: attendanceDate, students: records.length, exceptions } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/attendance");
  revalidatePath(`/dashboard/attendance/${classId}`);
  return { success: submit ? `Attendance submitted for ${records.length} students.` : "Draft attendance saved.", exceptions };
}
