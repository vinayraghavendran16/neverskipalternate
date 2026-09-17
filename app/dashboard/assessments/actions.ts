"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type AssessmentActionState = { error?: string; success?: string; saved?: number };
const teachingRoles = ["owner", "administrator", "principal", "teacher", "staff"];
const assessmentSchema = z.object({ class_subject_id: databaseId, title: z.string().trim().min(1).max(180), assessment_date: z.iso.date(), max_marks: z.coerce.number().positive().max(10000), weight_percent: z.coerce.number().min(0).max(100).optional() });
const rowSchema = z.array(z.object({ studentId: databaseId, status: z.enum(["scored", "absent", "not_applicable"]), marks: z.number().nullable(), note: z.string().max(500) })).max(1000);

async function teacherAccess(classSubjectId: string) {
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !teachingRoles.includes(context.role)) return null;
  const { data: allocation } = await supabase.from("class_subjects").select("id, class_id, teacher_staff_id").eq("id", classSubjectId).eq("organization_id", context.organizationId).maybeSingle();
  if (!allocation) return null;
  if (context.role === "teacher") {
    const { data: staff } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    if (!staff || allocation.teacher_staff_id !== staff.id) return null;
  }
  return { context, supabase, allocation };
}

export async function createAssessment(_: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const parsed = assessmentSchema.safeParse({ class_subject_id: formData.get("class_subject_id"), title: formData.get("title"), assessment_date: formData.get("assessment_date"), max_marks: formData.get("max_marks"), weight_percent: formData.get("weight_percent") || undefined });
  if (!parsed.success) return { error: "Complete the assessment title, class, date and maximum marks." };
  const access = await teacherAccess(parsed.data.class_subject_id); if (!access) return { error: "This class and subject is not assigned to you." };
  const { context, supabase } = access;
  const { data, error } = await supabase.from("assessments").insert({ organization_id: context.organizationId, ...parsed.data, weight_percent: parsed.data.weight_percent ?? null, status: "marks_open", created_by: context.userId }).select("id").single();
  if (error) return { error: "The assessment could not be created. Refresh and try again." };
  await writeAuditEvent({ organizationId: context.organizationId, action: "assessment.created", entityType: "assessment", entityId: data.id, metadata: { class_subject_id: parsed.data.class_subject_id, max_marks: parsed.data.max_marks } });
  revalidatePath("/dashboard/assessments"); redirect(`/dashboard/assessments/${data.id}/marks`);
}

export async function saveAssessmentMarks(_: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const assessmentId = String(formData.get("assessment_id") || ""); const intent = String(formData.get("intent") || "save");
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !databaseId.safeParse(assessmentId).success) return { error: "Assessment not found." };
  const { data: assessment } = await supabase.from("assessments").select("id, class_subject_id, max_marks, status").eq("id", assessmentId).eq("organization_id", context.organizationId).maybeSingle();
  if (!assessment) return { error: "Assessment not found." };
  if (["published", "archived"].includes(assessment.status)) return { error: "Published or archived marks are locked. Contact your school administrator." };
  const access = await teacherAccess(assessment.class_subject_id); if (!access) return { error: "You cannot enter marks for this assessment." };
  let raw: unknown; try { raw = JSON.parse(String(formData.get("rows_json") || "[]")); } catch { return { error: "The marks payload could not be read." }; }
  const parsed = rowSchema.safeParse(raw); if (!parsed.success) return { error: "One or more mark rows are invalid." };
  const { data: enrollments } = await supabase.from("class_enrollments").select("student_id").eq("class_id", access.allocation.class_id).eq("organization_id", context.organizationId).eq("status", "active");
  const enrolled = new Set((enrollments || []).map((item) => item.student_id));
  if (new Set(parsed.data.map((row) => row.studentId)).size !== parsed.data.length || !parsed.data.length || parsed.data.some((row) => !enrolled.has(row.studentId))) return { error: "The class roster changed. Refresh before saving marks." };
  if (parsed.data.some((row) => row.status === "scored" && (row.marks === null || row.marks < 0 || row.marks > Number(assessment.max_marks)))) return { error: `Marks must be between 0 and ${assessment.max_marks}.` };
  if (intent === "publish" && parsed.data.length !== enrolled.size) return { error: "Enter a result for every active student before publishing." };
  const published = intent === "publish";
  const rows = parsed.data.map((row) => ({ student_id: row.studentId, marks: row.status === "scored" ? row.marks : null, status: row.status, note: row.note }));
  const { error } = await supabase.rpc("save_marks_register", { p_assessment: assessmentId, p_publish: published, p_rows: rows });
  if (error) return { error: "Marks could not be saved. Refresh the register and try again." };
  await writeAuditEvent({ organizationId: context.organizationId, action: published ? "assessment.marks_published" : "assessment.marks_saved", entityType: "assessment", entityId: assessmentId, metadata: { students: rows.length } });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/teacher"); revalidatePath("/dashboard/assessments"); revalidatePath(`/dashboard/assessments/${assessmentId}/marks`);
  return { success: published ? `Marks published for ${rows.length} students.` : `Saved ${rows.length} mark rows in one batch.`, saved: rows.length };
}
