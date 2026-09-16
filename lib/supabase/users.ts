import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("USER_DIRECTORY_UNAVAILABLE");
    const user = data.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

export async function findOrInviteAuthUser(admin: SupabaseClient, input: { email: string; fullName: string; redirectTo: string }) {
  const existing = await findAuthUserByEmail(admin, input.email);
  if (existing) return { user: existing, invited: false };
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { data: { full_name: input.fullName }, redirectTo: input.redirectTo });
  if (error || !data.user) throw new Error("INVITATION_FAILED");
  return { user: data.user, invited: true };
}
