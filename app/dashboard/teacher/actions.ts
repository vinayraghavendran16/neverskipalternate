"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export type DiaryActionState = { error?: string; success?: string };
const teachingRoles = ["owner", "administrator", "principal", "teacher", "staff"];
const diarySchema = z.object({
  class_subject_id: z.uuid(), timetable_entry_id: z.union([z.uuid(), z.literal("")]), entry_date: z.iso.date(),
  topic: z.string().trim().min(1).max(180), summary: z.string().trim().min(1).max(4000),
  learning_objective: z.string().trim().max(1000), intent: z.enum(["draft", "publish"]),
});

export async function saveDiaryEntry(_: DiaryActionState, formData: FormData): Promise<DiaryActionState> {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !teachingRoles.includes(context.role)) return { error: "You do not have permission to write a class diary." };
  const parsed = diarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Complete the class, date, topic and lesson summary." };
  const payload = parsed.data;
  const { data: allocation } = await supabase.from("class_subjects").select("id, class_id, teacher_staff_id").eq("id", payload.class_subject_id).eq("organization_id", context.organizationId).maybeSingle();
  if (!allocation) return { error: "That class and subject allocation was not found." };
  if (context.role === "teacher") {
    const { data: staff } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    if (!staff || allocation.teacher_staff_id !== staff.id) return { error: "This class and subject is not assigned to your teacher profile." };
  }
  if (payload.timetable_entry_id) {
    const { data: timetable } = await supabase.from("timetable_entries").select("id").eq("id", payload.timetable_entry_id).eq("class_subject_id", allocation.id).maybeSingle();
    if (!timetable) return { error: "The selected timetable period does not match this class." };
  }
  let existingQuery = supabase.from("lesson_diary_entries").select("id").eq("organization_id", context.organizationId).eq("class_subject_id", allocation.id).eq("entry_date", payload.entry_date);
  existingQuery = payload.timetable_entry_id ? existingQuery.eq("timetable_entry_id", payload.timetable_entry_id) : existingQuery.is("timetable_entry_id", null);
  const { data: existing } = await existingQuery.limit(1).maybeSingle();
  const entry = {
    organization_id: context.organizationId, class_subject_id: allocation.id,
    timetable_entry_id: payload.timetable_entry_id || null, entry_date: payload.entry_date,
    topic: payload.topic, summary: payload.summary, learning_objective: payload.learning_objective || null,
    status: payload.intent === "publish" ? "published" : "draft", created_by: context.userId,
    published_at: payload.intent === "publish" ? new Date().toISOString() : null,
  };
  const update = {
    topic: entry.topic, summary: entry.summary, learning_objective: entry.learning_objective,
    status: entry.status, published_at: entry.published_at,
  };
  const result = existing
    ? await supabase.from("lesson_diary_entries").update(update).eq("id", existing.id).select("id").single()
    : await supabase.from("lesson_diary_entries").insert(entry).select("id").single();
  if (result.error) return { error: result.error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: payload.intent === "publish" ? "teaching.diary_published" : "teaching.diary_saved", entityType: "lesson_diary", entityId: result.data.id, metadata: { class_id: allocation.class_id, entry_date: payload.entry_date } });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/teacher"); revalidatePath("/dashboard/teacher/diary");
  return { success: payload.intent === "publish" ? "Class diary published." : "Class diary draft saved." };
}
