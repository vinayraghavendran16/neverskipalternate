"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export type HomeworkActionState = { error?: string; success?: string };
const homeworkRoles = ["owner", "administrator", "principal", "teacher", "staff"];
const homeworkSchema = z.object({ subject_id: z.uuid(), title: z.string().trim().min(1).max(180), instructions: z.string().trim().min(1).max(5000), due_at: z.string().min(10), estimated_minutes: z.coerce.number().int().min(1).max(600).optional(), intent: z.enum(["draft", "publish"]) });

function schoolInstant(value: string) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}:00+05:30`);
}

export async function createHomework(_: HomeworkActionState, formData: FormData): Promise<HomeworkActionState> {
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !homeworkRoles.includes(context.role)) return { error: "You do not have permission to create homework." };
  const parsed = homeworkSchema.safeParse({ subject_id: formData.get("subject_id"), title: formData.get("title"), instructions: formData.get("instructions"), due_at: formData.get("due_at"), estimated_minutes: formData.get("estimated_minutes") || undefined, intent: formData.get("intent") });
  const classIds = [...new Set(formData.getAll("class_ids").map(String).filter(Boolean))];
  if (!parsed.success || !classIds.length) return { error: "Complete the homework and select at least one class." };
  const dueAt = schoolInstant(parsed.data.due_at); if (Number.isNaN(dueAt.getTime())) return { error: "Choose a valid due date and time." };
  const { data: allocations } = await supabase.from("class_subjects").select("class_id, teacher_staff_id").eq("organization_id", context.organizationId).eq("subject_id", parsed.data.subject_id).in("class_id", classIds);
  if ((allocations || []).length !== classIds.length) return { error: "The selected subject must be allocated to every chosen class." };
  if (context.role === "teacher") {
    const { data: staff } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    if (!staff || allocations?.some((allocation) => allocation.teacher_staff_id !== staff.id)) return { error: "You can assign homework only to your allocated classes." };
  }
  const published = parsed.data.intent === "publish";
  const { data: homework, error } = await supabase.from("homework_assignments").insert({ organization_id: context.organizationId, subject_id: parsed.data.subject_id, title: parsed.data.title, instructions: parsed.data.instructions, due_at: dueAt.toISOString(), estimated_minutes: parsed.data.estimated_minutes || null, status: published ? "published" : "draft", created_by: context.userId, published_at: published ? new Date().toISOString() : null }).select("id").single();
  if (error) return { error: error.message };
  const { error: classError } = await supabase.from("homework_classes").insert(classIds.map((classId) => ({ organization_id: context.organizationId, homework_id: homework.id, class_id: classId })));
  if (classError) return { error: `Homework was saved, but class assignment failed: ${classError.message}` };
  await writeAuditEvent({ organizationId: context.organizationId, action: published ? "homework.published" : "homework.draft_created", entityType: "homework", entityId: homework.id, metadata: { classes: classIds.length, subject_id: parsed.data.subject_id } });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/teacher"); revalidatePath("/dashboard/homework");
  return { success: published ? `Homework published to ${classIds.length} class${classIds.length === 1 ? "" : "es"}.` : "Homework draft saved." };
}
