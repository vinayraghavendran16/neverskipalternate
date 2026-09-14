"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManagePeople, getUserContext } from "@/lib/auth/context";
import { writeAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export type PeopleActionState = { error?: string; success?: string; imported?: number };

const optionalText = z.string().trim().max(500).transform((value) => value || null);
const requiredText = z.string().trim().min(1, "Complete all required fields.").max(160);
const email = z.string().trim().max(254).refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email.").transform((value) => value || null);
const date = z.string().trim().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date.").transform((value) => value || null);

async function manager() {
  const context = await getUserContext();
  const supabase = await createClient();
  if (!context || !supabase) return null;
  if (!canManagePeople(context.role)) return null;
  return { context, supabase };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

const studentSchema = z.object({
  admission_number: requiredText,
  first_name: requiredText,
  last_name: optionalText,
  preferred_name: optionalText,
  date_of_birth: date,
  gender: z.enum(["", "female", "male", "non_binary", "prefer_not_to_say"]).transform((entry) => entry || null),
  email,
  phone: optionalText,
  address: optionalText,
  emergency_notes: optionalText,
  joined_on: date,
  status: z.enum(["applicant", "active", "withdrawn", "alumni"]),
});

const staffSchema = z.object({
  employee_number: requiredText,
  first_name: requiredText,
  last_name: optionalText,
  email,
  phone: optionalText,
  designation: requiredText,
  department: optionalText,
  employment_type: z.enum(["full_time", "part_time", "contract", "visiting"]),
  joined_on: date,
  status: z.enum(["active", "on_leave", "inactive"]),
});

const guardianSchema = z.object({
  first_name: requiredText,
  last_name: optionalText,
  email,
  phone: requiredText,
  occupation: optionalText,
  address: optionalText,
  status: z.enum(["active", "inactive"]),
});

export async function savePerson(_: PeopleActionState, formData: FormData): Promise<PeopleActionState> {
  const access = await manager();
  if (!access) return { error: "You do not have permission to manage people." };
  const { context, supabase } = access;
  const kind = value(formData, "kind");
  const id = value(formData, "id");
  const campusId = context.campusId || value(formData, "campus_id");
  let recordId = id;

  if (kind === "students") {
    if (!campusId) return { error: "Select a campus before adding a student." };
    const parsed = studentSchema.safeParse({
      admission_number: value(formData, "admission_number"), first_name: value(formData, "first_name"),
      last_name: value(formData, "last_name"), preferred_name: value(formData, "preferred_name"),
      date_of_birth: value(formData, "date_of_birth"), gender: value(formData, "gender"),
      email: value(formData, "email"), phone: value(formData, "phone"), address: value(formData, "address"),
      emergency_notes: value(formData, "emergency_notes"), joined_on: value(formData, "joined_on"), status: value(formData, "status") || "active",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the student details." };
    const payload = { ...parsed.data, organization_id: context.organizationId, campus_id: campusId };
    const result = id
      ? await supabase.from("students").update(parsed.data).eq("id", id).eq("organization_id", context.organizationId).select("id").single()
      : await supabase.from("students").insert(payload).select("id").single();
    if (result.error) return { error: result.error.code === "23505" ? "That admission number is already in use." : result.error.message };
    recordId = result.data.id;
  } else if (kind === "staff") {
    if (!campusId) return { error: "Select a campus before adding staff." };
    if (context.role === "staff") return { error: "Only owners, administrators and principals can manage staff records." };
    const parsed = staffSchema.safeParse({
      employee_number: value(formData, "employee_number"), first_name: value(formData, "first_name"), last_name: value(formData, "last_name"),
      email: value(formData, "email"), phone: value(formData, "phone"), designation: value(formData, "designation"),
      department: value(formData, "department"), employment_type: value(formData, "employment_type") || "full_time",
      joined_on: value(formData, "joined_on"), status: value(formData, "status") || "active",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the staff details." };
    const payload = { ...parsed.data, organization_id: context.organizationId, campus_id: campusId };
    const result = id
      ? await supabase.from("staff_profiles").update(parsed.data).eq("id", id).eq("organization_id", context.organizationId).select("id").single()
      : await supabase.from("staff_profiles").insert(payload).select("id").single();
    if (result.error) return { error: result.error.code === "23505" ? "That employee number is already in use." : result.error.message };
    recordId = result.data.id;
  } else if (kind === "guardians") {
    const parsed = guardianSchema.safeParse({
      first_name: value(formData, "first_name"), last_name: value(formData, "last_name"), email: value(formData, "email"),
      phone: value(formData, "phone"), occupation: value(formData, "occupation"), address: value(formData, "address"),
      status: value(formData, "status") || "active",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the guardian details." };
    const payload = { ...parsed.data, organization_id: context.organizationId };
    const result = id
      ? await supabase.from("guardians").update(parsed.data).eq("id", id).eq("organization_id", context.organizationId).select("id").single()
      : await supabase.from("guardians").insert(payload).select("id").single();
    if (result.error) return { error: result.error.message };
    recordId = result.data.id;
  } else {
    return { error: "Unsupported people record." };
  }

  await writeAuditEvent({ organizationId: context.organizationId, action: id ? "people.record_updated" : "people.record_created", entityType: kind, entityId: recordId });
  revalidatePath("/dashboard/people");
  redirect(`/dashboard/people/${kind}/${recordId}?saved=1`);
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export async function importStudents(_: PeopleActionState, formData: FormData): Promise<PeopleActionState> {
  const access = await manager();
  if (!access) return { error: "You do not have permission to import students." };
  const { context, supabase } = access;
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Choose a CSV file." };
  if (file.size > 1_000_000) return { error: "CSV files must be smaller than 1 MB." };
  const campusId = context.campusId || value(formData, "campus_id");
  if (!campusId) return { error: "Select a campus." };
  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "The CSV does not contain student rows." };
  if (rows.length > 501) return { error: "Import a maximum of 500 students at a time." };
  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const required = ["admission_number", "first_name"];
  if (required.some((header) => !headers.includes(header))) return { error: "CSV requires admission_number and first_name columns." };
  const index = (name: string) => headers.indexOf(name);
  const get = (row: string[], name: string) => index(name) >= 0 ? row[index(name)] || null : null;
  const records = rows.slice(1).map((row) => ({
    organization_id: context.organizationId, campus_id: campusId,
    admission_number: get(row, "admission_number") || "", first_name: get(row, "first_name") || "",
    last_name: get(row, "last_name"), preferred_name: get(row, "preferred_name"), date_of_birth: get(row, "date_of_birth"),
    gender: get(row, "gender"), email: get(row, "email"), phone: get(row, "phone"), joined_on: get(row, "joined_on"),
    status: get(row, "status") || "active",
  }));
  if (records.some((record) => !record.admission_number || !record.first_name)) return { error: "Every row needs an admission number and first name." };
  const { error: importError } = await supabase.from("students").upsert(records, { onConflict: "organization_id,admission_number" });
  if (importError) return { error: importError.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "people.students_imported", entityType: "students", metadata: { count: records.length, filename: file.name } });
  revalidatePath("/dashboard/people");
  return { success: `${records.length} students imported successfully.`, imported: records.length };
}

export async function linkGuardian(_: PeopleActionState, formData: FormData): Promise<PeopleActionState> {
  const access = await manager();
  if (!access) return { error: "You do not have permission to manage guardian relationships." };
  const { context, supabase } = access;
  const studentId = value(formData, "student_id");
  const guardianId = value(formData, "guardian_id");
  const relationship = value(formData, "relationship");
  if (!studentId || !guardianId || !relationship) return { error: "Select a guardian and relationship." };
  const { data: guardian } = await supabase.from("guardians").select("user_id").eq("id", guardianId).eq("organization_id", context.organizationId).single();
  if (!guardian) return { error: "Guardian not found." };
  const { error: relationshipError } = await supabase.from("guardian_relationships").upsert({
    organization_id: context.organizationId, student_id: studentId, guardian_id: guardianId,
    guardian_user_id: guardian.user_id, relationship,
    is_primary: formData.get("is_primary") === "on", can_pick_up: formData.get("can_pick_up") === "on",
  }, { onConflict: "student_id,guardian_id" });
  if (relationshipError) return { error: relationshipError.message };
  await writeAuditEvent({ organizationId: context.organizationId, action: "people.guardian_linked", entityType: "student", entityId: studentId, metadata: { guardian_id: guardianId } });
  revalidatePath(`/dashboard/people/students/${studentId}`);
  return { success: "Guardian relationship saved." };
}
