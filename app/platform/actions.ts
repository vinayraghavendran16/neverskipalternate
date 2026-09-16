"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findOrInviteAuthUser } from "@/lib/supabase/users";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  campus_name: z.string().trim().min(2).max(160),
  campus_code: z.string().trim().min(2).max(24),
  owner_name: z.string().trim().min(2).max(160),
  owner_email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

function status(kind: "success" | "error", message: string): never {
  redirect(`/platform?${kind}=${encodeURIComponent(message)}`);
}

export async function createPlatformSchool(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user || !isPlatformOwnerEmail(user.email)) redirect("/login?next=/platform");
  const parsed = schema.safeParse(Object.fromEntries([...formData].map(([key, value]) => [key, String(value).trim()])));
  if (!parsed.success) status("error", "Enter valid school, branch, and owner details.");
  const admin = createAdminClient(), env = getPublicEnv();
  if (!admin || !env) status("error", "Trusted provisioning is not configured.");
  let created = false, invitationSent = false, ownerId = "";
  try {
    const account = await findOrInviteAuthUser(admin, {
      email: parsed.data.owner_email,
      fullName: parsed.data.owner_name,
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/complete`,
    });
    created = account.created;
    invitationSent = account.invitationSent;
    ownerId = account.user.id;
    const { error } = await admin.rpc("platform_create_school", {
      p_name: parsed.data.name, p_slug: parsed.data.slug.toLowerCase(), p_campus_name: parsed.data.campus_name,
      p_campus_code: parsed.data.campus_code.toUpperCase(), p_owner_user: ownerId, p_actor_user: user.id,
    });
    if (error) throw error;
  } catch (error) {
    if (created && ownerId) await admin.auth.admin.deleteUser(ownerId);
    const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === "23505";
    status("error", duplicate ? "That school URL or branch code is already in use." : "The school could not be provisioned. No partial tenant was kept.");
  }
  revalidatePath("/platform");
  status("success", `${parsed.data.name} is ready and ${invitationSent ? "the owner invitation was sent" : "the existing account was granted owner access"}.`);
}

export async function resendOwnerInvitation(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user || !isPlatformOwnerEmail(user.email)) redirect("/login?next=/platform");
  const organizationId = String(formData.get("organization_id") || "");
  if (!z.string().uuid().safeParse(organizationId).success) status("error", "Choose a valid school tenant.");
  const admin = createAdminClient(), env = getPublicEnv();
  if (!admin || !env) status("error", "Trusted provisioning is not configured.");
  const { data: owner } = await admin.from("memberships").select("user_id").eq("organization_id", organizationId).eq("role", "owner").eq("status", "active").order("created_at").limit(1).maybeSingle();
  if (!owner) status("error", "This school does not have an active owner account.");
  const { data, error } = await admin.auth.admin.getUserById(owner.user_id);
  if (error || !data.user?.email) status("error", "The owner account could not be loaded.");
  if (data.user.email_confirmed_at) status("success", `${data.user.email} has already activated their account.`);
  const result = await admin.auth.admin.inviteUserByEmail(data.user.email, { data: data.user.user_metadata, redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/complete` });
  if (result.error) status("error", "A fresh invitation could not be sent. Wait one minute and retry.");
  status("success", `A fresh owner invitation was sent to ${data.user.email}.`);
}
