"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type CommunicationState = { error?: string; success?: string };
const roles = ["owner","administrator","principal","teacher","parent","student","staff"] as const;
const schema = z.object({ title: z.string().trim().min(1).max(180), body: z.string().trim().min(1).max(5000), priority: z.enum(["normal","important","urgent"]), audience: z.array(z.enum(roles)).min(1), campus_id: z.union([databaseId, z.literal("")]), expires_at: z.string().optional() });

export async function createAnnouncement(_: CommunicationState, formData: FormData): Promise<CommunicationState> {
  const context = await getUserContext(); const supabase = await createClient();
  if (!context || !supabase || !["owner","administrator","principal","staff"].includes(context.role)) return { error: "You do not have permission to publish announcements." };
  const parsed = schema.safeParse({ title: formData.get("title"), body: formData.get("body"), priority: formData.get("priority"), audience: formData.getAll("audience"), campus_id: formData.get("campus_id") || "", expires_at: String(formData.get("expires_at") || "") || undefined });
  if (!parsed.success) return { error: "Add a title, message, and at least one audience." };
  const expires = parsed.data.expires_at ? new Date(`${parsed.data.expires_at}T23:59:59+05:30`) : null;
  if (expires && (Number.isNaN(expires.getTime()) || expires <= new Date())) return { error: "Expiry must be a future date." };
  const { error } = await supabase.rpc("create_announcement_with_notifications", { p_org: context.organizationId, p_campus: parsed.data.campus_id || null, p_title: parsed.data.title, p_body: parsed.data.body, p_priority: parsed.data.priority, p_audience: parsed.data.audience, p_requires_acknowledgement: formData.get("requires_acknowledgement") === "on", p_expires_at: expires?.toISOString() || null });
  if (error) return { error: error.message };
  revalidatePath("/dashboard"); revalidatePath("/dashboard/communication"); revalidatePath("/dashboard/notifications");
  return { success: "Announcement published and notifications prepared." };
}

export async function acknowledgeAnnouncement(formData: FormData) {
  const context = await getUserContext(); const supabase = await createClient(); const announcementId = String(formData.get("announcement_id") || "");
  if (!context || !supabase || !databaseId.safeParse(announcementId).success) return;
  await supabase.from("announcement_receipts").upsert({ organization_id: context.organizationId, announcement_id: announcementId, user_id: context.userId, read_at: new Date().toISOString(), acknowledged_at: new Date().toISOString() }, { onConflict: "announcement_id,user_id" });
  revalidatePath("/dashboard"); revalidatePath("/dashboard/communication");
}
