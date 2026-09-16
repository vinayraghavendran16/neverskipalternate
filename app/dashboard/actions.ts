"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function dashboardStatus(kind: "success" | "error", message: string, anchor = "school-administration"): never {
  redirect(`/dashboard?admin_${kind}=${encodeURIComponent(message)}#${anchor}`);
}

const schoolSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  campus_name: z.string().trim().min(2).max(160),
  campus_code: z.string().trim().min(2).max(24),
});

export async function switchOrganization(formData: FormData) {
  const context = await getUserContext();
  const organizationId = value(formData, "organization_id");
  if (!context?.availableOrganizations.some((entry) => entry.id === organizationId)) redirect("/dashboard");
  const cookieStore = await cookies();
  cookieStore.set("northstar_active_organization", organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

export async function createSchool(formData: FormData) {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || context.role !== "owner") dashboardStatus("error", "Only an owner can create another school.");
  const parsed = schoolSchema.safeParse({ name: value(formData, "name"), slug: value(formData, "slug").toLowerCase(), campus_name: value(formData, "campus_name"), campus_code: value(formData, "campus_code").toUpperCase() });
  if (!parsed.success) dashboardStatus("error", "Enter a school name, URL slug, branch name and branch code.");
  const { data, error } = await supabase.rpc("create_owned_school", { p_name: parsed.data.name, p_slug: parsed.data.slug, p_campus_name: parsed.data.campus_name, p_campus_code: parsed.data.campus_code });
  if (error) dashboardStatus("error", error.code === "23505" ? "That school URL or branch code is already in use." : "The school could not be created. Check the details and retry.");
  const cookieStore = await cookies();
  cookieStore.set("northstar_active_organization", data, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/dashboard");
  dashboardStatus("success", `${parsed.data.name} was created. Add an academic year in Academics next.`);
}

const campusSchema = z.object({ name: z.string().trim().min(2).max(160), code: z.string().trim().min(2).max(24) });
export async function createCampus(formData: FormData) {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !["owner", "administrator"].includes(context.role)) dashboardStatus("error", "Only owners and administrators can add branches.");
  const parsed = campusSchema.safeParse({ name: value(formData, "name"), code: value(formData, "code").toUpperCase() });
  if (!parsed.success) dashboardStatus("error", "Enter a branch name and a 2–24 character code.");
  const { error } = await supabase.from("campuses").insert({ organization_id: context.organizationId, name: parsed.data.name, code: parsed.data.code });
  if (error) dashboardStatus("error", error.code === "23505" ? "That branch code is already in use." : "The branch could not be created.");
  revalidatePath("/dashboard");
  dashboardStatus("success", `${parsed.data.name} was added.`);
}

const accessRoles = ["administrator", "principal", "teacher", "staff"] as const;
const accessSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).transform((entry) => entry.toLowerCase()),
  role: z.enum(accessRoles),
  campus_id: z.string().uuid().or(z.literal("")),
});

export async function inviteUser(formData: FormData) {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !["owner", "administrator"].includes(context.role)) dashboardStatus("error", "Only owners and administrators can invite team members.");
  const parsed = accessSchema.safeParse({ full_name: value(formData, "full_name"), email: value(formData, "email"), role: value(formData, "role"), campus_id: value(formData, "campus_id") });
  if (!parsed.success) dashboardStatus("error", "Enter a valid name, email, role and branch.");
  if (context.role !== "owner" && parsed.data.role === "administrator") dashboardStatus("error", "Only the owner can grant administrator rights.");
  const campusId = parsed.data.campus_id || null;
  if (campusId) {
    const { data: campus } = await supabase.from("campuses").select("id").eq("id", campusId).eq("organization_id", context.organizationId).maybeSingle();
    if (!campus) dashboardStatus("error", "Choose a branch in this school.");
  }
  const admin = createAdminClient();
  const env = getPublicEnv();
  if (!admin || !env) dashboardStatus("error", "Invitations are not configured. Add the server-only SUPABASE_SECRET_KEY in Vercel.");

  let page = 1;
  let userId = "";
  while (page <= 10 && !userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) dashboardStatus("error", "The user directory could not be checked.");
    const existing = data.users.find((user) => user.email?.toLowerCase() === parsed.data.email);
    if (existing) userId = existing.id;
    if (data.users.length < 100) break;
    page += 1;
  }
  let invitedUser = false;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
    });
    if (error || !data.user) dashboardStatus("error", "The invitation could not be sent. Check Supabase email settings and retry.");
    userId = data.user.id;
    invitedUser = true;
  }

  const { data: existingMemberships, error: lookupError } = await supabase.from("memberships").select("id, role").eq("organization_id", context.organizationId).eq("user_id", userId).order("created_at");
  if (lookupError) dashboardStatus("error", "Access could not be checked.");
  if (existingMemberships?.some((entry) => entry.role === "owner")) dashboardStatus("error", "Owner access cannot be changed from an invitation.");
  if (context.role !== "owner" && existingMemberships?.some((entry) => entry.role === "administrator")) dashboardStatus("error", "Only the owner can change administrator access.");
  let membershipError;
  if (existingMemberships?.length) {
    const result = await supabase.from("memberships").update({ role: parsed.data.role, campus_id: campusId, status: "active" }).eq("id", existingMemberships[0].id).eq("organization_id", context.organizationId);
    membershipError = result.error;
    if (!membershipError && existingMemberships.length > 1) await supabase.from("memberships").update({ status: "suspended" }).in("id", existingMemberships.slice(1).map((entry) => entry.id));
  } else {
    const result = await supabase.from("memberships").insert({ organization_id: context.organizationId, campus_id: campusId, user_id: userId, role: parsed.data.role, status: "active" });
    membershipError = result.error;
  }
  if (membershipError) {
    if (invitedUser) await admin.auth.admin.deleteUser(userId);
    dashboardStatus("error", "The invitation was rolled back because school access could not be saved.");
  }
  revalidatePath("/dashboard");
  dashboardStatus("success", invitedUser ? `Invitation sent to ${parsed.data.email}.` : `${parsed.data.email} now has ${parsed.data.role} access.`);
}

const updateAccessSchema = z.object({ membership_id: z.string().uuid(), role: z.enum(accessRoles), campus_id: z.string().uuid().or(z.literal("")), status: z.enum(["active", "suspended"]) });
export async function updateAccess(formData: FormData) {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase || !["owner", "administrator"].includes(context.role)) dashboardStatus("error", "You cannot change school access.");
  const parsed = updateAccessSchema.safeParse({ membership_id: value(formData, "membership_id"), role: value(formData, "role"), campus_id: value(formData, "campus_id"), status: value(formData, "status") });
  if (!parsed.success) dashboardStatus("error", "Choose valid access settings.");
  if (context.role !== "owner" && parsed.data.role === "administrator") dashboardStatus("error", "Only the owner can grant administrator rights.");
  const { data: target } = await supabase.from("memberships").select("user_id, role").eq("id", parsed.data.membership_id).eq("organization_id", context.organizationId).maybeSingle();
  if (!target) dashboardStatus("error", "That team member is no longer available.");
  if (target.user_id === context.userId || target.role === "owner") dashboardStatus("error", "Owner access cannot be changed from this panel.");
  if (context.role !== "owner" && target.role === "administrator") dashboardStatus("error", "Only the owner can change administrator access.");
  const { error } = await supabase.from("memberships").update({ role: parsed.data.role as AppRole, campus_id: parsed.data.campus_id || null, status: parsed.data.status }).eq("id", parsed.data.membership_id).eq("organization_id", context.organizationId);
  if (error) dashboardStatus("error", "Access could not be updated.");
  revalidatePath("/dashboard");
  dashboardStatus("success", "Access updated.");
}
