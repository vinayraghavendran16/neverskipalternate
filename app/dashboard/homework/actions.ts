"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type HomeworkActionState = { error?: string; success?: string };
const homeworkRoles = ["owner", "administrator", "principal", "teacher", "staff"];
const homeworkSchema = z.object({ subject_id: databaseId, title: z.string().trim().min(1).max(180), instructions: z.string().trim().min(1).max(5000), due_at: z.string().min(10), estimated_minutes: z.coerce.number().int().min(1).max(600).optional(), intent: z.enum(["draft", "publish"]) });

function schoolInstant(value: string) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}:00+05:30`);
}

export async function createHomework(_: HomeworkActionState, formData: FormData): Promise<HomeworkActionState> {
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !homeworkRoles.includes(context.role)) return { error: "You do not have permission to create homework." };
  const parsed = homeworkSchema.safeParse({ subject_id: formData.get("subject_id"), title: formData.get("title"), instructions: formData.get("instructions"), due_at: formData.get("due_at"), estimated_minutes: formData.get("estimated_minutes") || undefined, intent: formData.get("intent") });
  const classIds = [...new Set(formData.getAll("class_ids").map(String).filter(Boolean))];
  if (!parsed.success || !classIds.length || classIds.length > 100 || classIds.some((id) => !databaseId.safeParse(id).success)) return { error: "Complete the homework and select at least one class." };
  const dueAt = schoolInstant(parsed.data.due_at); if (Number.isNaN(dueAt.getTime())) return { error: "Choose a valid due date and time." };
  const { data: allocations } = await supabase.from("class_subjects").select("class_id, teacher_staff_id").eq("organization_id", context.organizationId).eq("subject_id", parsed.data.subject_id).in("class_id", classIds);
  if ((allocations || []).length !== classIds.length) return { error: "The selected subject must be allocated to every chosen class." };
  if (context.role === "teacher") {
    const { data: staff } = await supabase.from("staff_profiles").select("id").eq("organization_id", context.organizationId).eq("user_id", context.userId).maybeSingle();
    if (!staff || allocations?.some((allocation) => allocation.teacher_staff_id !== staff.id)) return { error: "You can assign homework only to your allocated classes." };
  }
  const published = parsed.data.intent === "publish";
  const { data: homeworkId, error } = await supabase.rpc("create_homework_with_classes", {
    p_org: context.organizationId, p_subject: parsed.data.subject_id, p_title: parsed.data.title,
    p_instructions: parsed.data.instructions, p_due: dueAt.toISOString(),
    p_minutes: parsed.data.estimated_minutes ?? null, p_publish: published, p_classes: classIds,
  });
  if (error) return { error: error.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: published ? "homework.published" : "homework.draft_created", entityType: "homework", entityId: homeworkId!, metadata: { classes: classIds.length, subject_id: parsed.data.subject_id } });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/teacher"); revalidatePath("/dashboard/homework");
  return { success: published ? `Homework published to ${classIds.length} class${classIds.length === 1 ? "" : "es"}.` : "Homework draft saved." };
}
