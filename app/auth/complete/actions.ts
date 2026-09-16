"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ full_name: z.string().trim().min(2).max(160), password: z.string().min(10).max(128) });

export async function completeAccount(_state: { error: string }, formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const parsed = schema.safeParse({ full_name: String(formData.get("full_name") || "").trim(), password: String(formData.get("password") || "") });
  if (!parsed.success) return { error: "Enter your name and a password of at least 10 characters." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password, data: { ...user.user_metadata, full_name: parsed.data.full_name } });
  if (error) return { error: "Your account could not be completed. Request a fresh invitation if the link expired." };
  await supabase.from("profiles").upsert({ id: user.id, full_name: parsed.data.full_name });
  const context = await getUserContext();
  redirect(context ? "/dashboard" : isPlatformOwnerEmail(user.email) ? "/platform" : "/login?status=inactive");
}
