"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type ApprovalState = { error?: string; success?: string };
const leaveSchema = z.object({ person_id: databaseId, person_type: z.enum(["student","staff"]), leave_type: z.enum(["sick","personal","family","official","other"]), starts_on: z.iso.date(), ends_on: z.iso.date(), reason: z.string().trim().min(3).max(1000) });

export async function createLeaveRequest(_: ApprovalState, formData: FormData): Promise<ApprovalState> {
  const context = await getUserContext(); const supabase = await createClient(); if (!context || !supabase) return { error: "Sign in again to continue." };
  const parsed = leaveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.ends_on < parsed.data.starts_on) return { error: "Complete the leave dates and reason." };
  const { error } = await supabase.from("leave_requests").insert({ organization_id: context.organizationId, student_id: parsed.data.person_type === "student" ? parsed.data.person_id : null, staff_id: parsed.data.person_type === "staff" ? parsed.data.person_id : null, leave_type: parsed.data.leave_type, starts_on: parsed.data.starts_on, ends_on: parsed.data.ends_on, reason: parsed.data.reason, requested_by: context.userId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/approvals"); return { success: "Leave request submitted for review." };
}

export async function reviewLeaveRequest(formData: FormData) {
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !["owner","administrator","principal","staff"].includes(context.role)) return;
  const id = String(formData.get("request_id") || ""), decision = String(formData.get("decision") || ""), note = String(formData.get("review_note") || "").trim();
  if (!databaseId.safeParse(id).success || !["approved","rejected"].includes(decision) || note.length > 500) return;
  await supabase.from("leave_requests").update({ status: decision, review_note: note || null, reviewed_by: context.userId, reviewed_at: new Date().toISOString() }).eq("id", id).eq("organization_id", context.organizationId).eq("status", "pending");
  revalidatePath("/dashboard/approvals");
}

export async function reviewAttendanceCorrection(formData:FormData){const context=await getUserContext(),supabase=await createClient();if(!context||!supabase||!["owner","administrator","principal","staff"].includes(context.role))return;const id=String(formData.get("correction_id")||""),decision=String(formData.get("decision")||"");if(!databaseId.safeParse(id).success||!["approved","rejected"].includes(decision))return;await supabase.rpc("review_attendance_correction",{p_id:id,p_decision:decision});revalidatePath("/dashboard/approvals");revalidatePath("/dashboard/attendance")}
