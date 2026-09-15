"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type LearningState = { error?: string; success?: string };
const submissionSchema = z.object({ homework_id: databaseId, student_id: databaseId, response: z.string().trim().max(5000), intent: z.enum(["submitted","completed"]) });

export async function saveHomeworkSubmission(_: LearningState, formData: FormData): Promise<LearningState> {
  const context = await getUserContext(); const supabase = await createClient(); if (!context || !supabase || !["parent","student"].includes(context.role)) return { error: "This action is available to families and students." };
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Check the homework response." };
  const now = new Date().toISOString();
  const { error } = await supabase.from("homework_submissions").upsert({ organization_id: context.organizationId, homework_id: parsed.data.homework_id, student_id: parsed.data.student_id, response: parsed.data.response || null, status: parsed.data.intent, submitted_by: context.userId, submitted_at: now }, { onConflict: "homework_id,student_id" });
  if (error) return { error: error.message };
  revalidatePath("/dashboard"); revalidatePath("/dashboard/learning"); return { success: parsed.data.intent === "submitted" ? "Homework response submitted." : "Homework marked complete." };
}
