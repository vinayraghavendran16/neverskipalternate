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
  let invited = false, ownerId = "";
  try {
    const account = await findOrInviteAuthUser(admin, {
      email: parsed.data.owner_email,
      fullName: parsed.data.owner_name,
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/complete`,
    });
    invited = account.invited;
    ownerId = account.user.id;
    const { error } = await admin.rpc("platform_create_school", {
      p_name: parsed.data.name, p_slug: parsed.data.slug.toLowerCase(), p_campus_name: parsed.data.campus_name,
      p_campus_code: parsed.data.campus_code.toUpperCase(), p_owner_user: ownerId, p_actor_user: user.id,
    });
    if (error) throw error;
  } catch (error) {
    if (invited && ownerId) await admin.auth.admin.deleteUser(ownerId);
    const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === "23505";
    status("error", duplicate ? "That school URL or branch code is already in use." : "The school could not be provisioned. No partial tenant was kept.");
  }
  revalidatePath("/platform");
  status("success", `${parsed.data.name} is ready and ${invited ? "the owner invitation was sent" : "the existing account was granted owner access"}.`);
}
