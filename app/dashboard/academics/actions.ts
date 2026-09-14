"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export type AcademicActionState = { error?: string; success?: string };

function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }

async function academicManager() {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !["owner", "administrator", "principal"].includes(context.role)) return null;
  return { context, supabase };
}

const classSchema = z.object({ grade: z.string().trim().min(1).max(40), section: z.string().trim().min(1).max(40), academic_year_id: z.uuid(), campus_id: z.uuid() });
const subjectSchema = z.object({ name: z.string().trim().min(1).max(120), code: z.string().trim().min(1).max(24).transform((entry) => entry.toUpperCase()) });

export async function createClass(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  const access = await academicManager();
  if (!access) return { error: "Only owners, administrators and principals can create classes." };
  const { context, supabase } = access;
  const parsed = classSchema.safeParse({ grade: value(formData, "grade"), section: value(formData, "section"), academic_year_id: value(formData, "academic_year_id"), campus_id: value(formData, "campus_id") || context.campusId });
  if (!parsed.success) return { error: "Choose an academic year and complete the grade and section." };
  const { data, error } = await supabase.from("classes").insert({ ...parsed.data, organization_id: context.organizationId }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That grade and section already exist for this academic year." : error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "academics.class_created", entityType: "class", entityId: data.id, metadata: parsed.data });
  revalidatePath("/dashboard/academics");
  redirect(`/dashboard/academics/classes/${data.id}`);
}

export async function createSubject(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  const access = await academicManager();
  if (!access) return { error: "Only academic managers can create subjects." };
  const { context, supabase } = access;
  const parsed = subjectSchema.safeParse({ name: value(formData, "name"), code: value(formData, "code") });
  if (!parsed.success) return { error: "Enter a subject name and short code." };
  const { data, error } = await supabase.from("subjects").insert({ ...parsed.data, organization_id: context.organizationId }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That subject code is already in use." : error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "academics.subject_created", entityType: "subject", entityId: data.id, metadata: parsed.data });
  revalidatePath("/dashboard/academics");
  return { success: `${parsed.data.name} created.` };
}

export async function enrollStudents(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  const access = await academicManager();
  if (!access) return { error: "Only academic managers can change a class roster." };
  const { context, supabase } = access;
  const classId = value(formData, "class_id");
  const studentIds = formData.getAll("student_ids").map(String).filter(Boolean);
  if (!classId || !studentIds.length) return { error: "Select at least one student." };
  const { data: allowedStudents } = await supabase.from("students").select("id").eq("organization_id", context.organizationId).in("id", studentIds);
  if (!allowedStudents?.length) return { error: "No valid students were selected." };
  const { error } = await supabase.from("class_enrollments").upsert(allowedStudents.map((student) => ({ organization_id: context.organizationId, class_id: classId, student_id: student.id, status: "active" })), { onConflict: "class_id,student_id" });
  if (error) return { error: error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "academics.students_enrolled", entityType: "class", entityId: classId, metadata: { count: allowedStudents.length } });
  revalidatePath(`/dashboard/academics/classes/${classId}`);
  return { success: `${allowedStudents.length} student${allowedStudents.length === 1 ? "" : "s"} added to the roster.` };
}

export async function assignSubject(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  const access = await academicManager();
  if (!access) return { error: "Only academic managers can allocate subjects." };
  const { context, supabase } = access;
  const classId = value(formData, "class_id"), subjectId = value(formData, "subject_id"), teacherId = value(formData, "teacher_staff_id") || null;
  if (!classId || !subjectId) return { error: "Select a subject." };
  const { data, error } = await supabase.from("class_subjects").upsert({ organization_id: context.organizationId, class_id: classId, subject_id: subjectId, teacher_staff_id: teacherId }, { onConflict: "class_id,subject_id" }).select("id").single();
  if (error) return { error: error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "academics.subject_allocated", entityType: "class_subject", entityId: data.id, metadata: { class_id: classId, subject_id: subjectId, teacher_staff_id: teacherId } });
  revalidatePath(`/dashboard/academics/classes/${classId}`);
  return { success: "Subject allocation saved." };
}

export async function addTimetableEntry(_: AcademicActionState, formData: FormData): Promise<AcademicActionState> {
  const access = await academicManager();
  if (!access) return { error: "Only academic managers can update timetables." };
  const { context, supabase } = access;
  const classId = value(formData, "class_id");
  const payload = {
    organization_id: context.organizationId, class_id: classId, class_subject_id: value(formData, "class_subject_id"),
    weekday: Number(value(formData, "weekday")), period_number: Number(value(formData, "period_number")),
    starts_at: value(formData, "starts_at"), ends_at: value(formData, "ends_at"), room: value(formData, "room") || null,
  };
  if (!classId || !payload.class_subject_id || !payload.weekday || !payload.period_number || !payload.starts_at || !payload.ends_at) return { error: "Complete the timetable slot." };
  const { data, error } = await supabase.from("timetable_entries").upsert(payload, { onConflict: "class_id,weekday,period_number" }).select("id").single();
  if (error) return { error: error.code === "23505" ? "That period already has a timetable entry." : error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "academics.timetable_updated", entityType: "timetable_entry", entityId: data.id, metadata: { class_id: classId } });
  revalidatePath(`/dashboard/academics/classes/${classId}`);
  return { success: "Timetable slot saved." };
}
