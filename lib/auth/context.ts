import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export type UserContext = {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  campusName: string | null;
  role: AppRole;
};

export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, campus_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const [{ data: profile }, { data: organization }, { data: campus }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("name").eq("id", membership.organization_id).maybeSingle(),
    membership.campus_id
      ? supabase.from("campuses").select("name").eq("id", membership.campus_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    userId: user.id,
    email: user.email || "",
    fullName: profile?.full_name || user.email?.split("@")[0] || "User",
    organizationId: membership.organization_id,
    organizationName: organization?.name || "School",
    campusName: campus?.name || null,
    role: membership.role as AppRole,
  };
});

export function canManageSchool(role: AppRole) {
  return role === "owner" || role === "administrator";
}
