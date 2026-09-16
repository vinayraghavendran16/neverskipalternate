import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export type UserContext = {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  campusId: string | null;
  campusName: string | null;
  role: AppRole;
  unreadNotifications: number;
  availableOrganizations: { id: string; name: string; role: AppRole; campusId: string | null }[];
};

export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, campus_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at")
    .order("id");

  if (!memberships?.length) return null;
  const cookieStore = await cookies();
  const requestedOrganization = cookieStore.get("northstar_active_organization")?.value;
  const membership = memberships.find((entry) => entry.organization_id === requestedOrganization) || memberships[0];
  const organizationIds = [...new Set(memberships.map((entry) => entry.organization_id))];

  const [{ data: profile }, { data: organizations }, { data: campus }, unreadResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("id, name, logo_url").in("id", organizationIds),
    membership.campus_id
      ? supabase.from("campuses").select("name").eq("id", membership.campus_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("user_id", user.id)
      .eq("in_app_enabled", true)
      .is("read_at", null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
  ]);
  const organizationNames = new Map((organizations || []).map((entry) => [entry.id, entry.name]));
  const organizationLogos = new Map((organizations || []).map((entry) => [entry.id, entry.logo_url]));

  return {
    userId: user.id,
    email: user.email || "",
    fullName: profile?.full_name || user.email?.split("@")[0] || "User",
    organizationId: membership.organization_id,
    organizationName: organizationNames.get(membership.organization_id) || "School",
    organizationLogoUrl: organizationLogos.get(membership.organization_id) || null,
    campusId: membership.campus_id,
    campusName: campus?.name || null,
    role: membership.role as AppRole,
    unreadNotifications: unreadResult.count || 0,
    availableOrganizations: memberships.map((entry) => ({
      id: entry.organization_id,
      name: organizationNames.get(entry.organization_id) || "School",
      role: entry.role as AppRole,
      campusId: entry.campus_id,
    })),
  };
});

export function canManageSchool(role: AppRole) {
  return role === "owner" || role === "administrator";
}

export function canManagePeople(role: AppRole) {
  return role === "owner" || role === "administrator" || role === "principal" || role === "staff";
}
