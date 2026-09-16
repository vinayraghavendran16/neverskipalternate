"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!email || !password) return { error: "Enter your school email and password." };
  const supabase = await createClient();
  if (!supabase) return { error: "Connect Supabase by copying .env.example to .env.local." };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "We could not sign you in. Check your credentials or ask your school administrator." };
  redirect(isPlatformOwnerEmail(data.user.email) && next === "/dashboard" ? "/platform" : safeNextPath(next));
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
