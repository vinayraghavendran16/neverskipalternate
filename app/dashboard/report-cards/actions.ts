"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditEvent } from "@/lib/audit";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type ReportActionState = { error?: string; success?: string };
const leaderRoles = ["owner", "administrator", "principal"];
const scaleSchema = z.array(z.object({ grade: z.string().trim().min(1).max(24), label: z.string().trim().min(1).max(80) })).min(1).max(20);
const subjectRowsSchema = z.array(z.object({ report_card_id: databaseId, grade: z.string().trim().max(24), percentage: z.number().min(0).max(100).nullable(), teacher_comment: z.string().trim().max(1000) })).min(1).max(1000);

async function leaderAccess() {
  const context = await getUserContext(), supabase = await createClient();
  if (!context || !supabase || !leaderRoles.includes(context.role)) return null;
  return { context, supabase };
}

export async function createReportTemplate(_: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const access = await leaderAccess(); if (!access) return { error: "Only school leaders can configure report cards." };
  const scale = String(formData.get("grading_scale_text") || "").split(/\r?\n/).filter((line) => line.trim()).map((line) => { const [grade, ...label] = line.split("|"); return { grade: grade?.trim() || "", label: label.join("|").trim() }; });
  const parsed = z.object({ name: z.string().trim().min(2).max(120), title: z.string().trim().min(2).max(160), grading_scale: scaleSchema, show_percentage: z.boolean(), show_attendance: z.boolean(), show_teacher_comments: z.boolean() }).safeParse({ name: formData.get("name"), title: formData.get("title"), grading_scale: scale, show_percentage: formData.get("show_percentage") === "on", show_attendance: formData.get("show_attendance") === "on", show_teacher_comments: formData.get("show_teacher_comments") === "on" });
  if (!parsed.success) return { error: "Complete the template and enter each grade band as grade | description." };
  const { context, supabase } = access;
  const { data, error } = await supabase.from("report_card_templates").insert({ organization_id: context.organizationId, ...parsed.data, created_by: context.userId }).select("id").single();
  if (error) return { error: "The template could not be created. Use a unique name and try again." };
  await writeAuditEvent({ organizationId: context.organizationId, action: "reports.template_created", entityType: "report_card_template", entityId: data.id });
  revalidatePath("/dashboard/report-cards"); return { success: "Report-card template created." };
}

export async function createReportingPeriod(_: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const access = await leaderAccess(); if (!access) return { error: "Only school leaders can create reporting periods." };
  const parsed = z.object({ academic_year_id: databaseId, template_id: databaseId, name: z.string().trim().min(2).max(120), starts_on: z.iso.date(), ends_on: z.iso.date() }).refine((value) => value.ends_on >= value.starts_on, { message: "End date must follow the start date." }).safeParse({ academic_year_id: formData.get("academic_year_id"), template_id: formData.get("template_id"), name: formData.get("name"), starts_on: formData.get("starts_on"), ends_on: formData.get("ends_on") });
  if (!parsed.success) return { error: "Complete a valid reporting period and template." };
  const { context, supabase } = access;
  const { data, error } = await supabase.from("reporting_periods").insert({ organization_id: context.organizationId, ...parsed.data, status: "open", created_by: context.userId }).select("id").single();
  if (error) return { error: "The reporting period could not be created. Check that its name is unique for this academic year." };
  await writeAuditEvent({ organizationId: context.organizationId, action: "reports.period_created", entityType: "reporting_period", entityId: data.id });
  revalidatePath("/dashboard/report-cards"); redirect(`/dashboard/report-cards?period=${data.id}`);
}

export async function initializeClassReports(formData: FormData) {
  const context = await getUserContext(), supabase = await createClient();
  const periodId = String(formData.get("period_id") || ""), classId = String(formData.get("class_id") || "");
  if (!context || !supabase || !databaseId.safeParse(periodId).success || !databaseId.safeParse(classId).success) redirect("/dashboard/report-cards?error=Invalid+report+class");
  const { data, error } = await supabase.rpc("initialize_report_cards", { p_period: periodId, p_class: classId });
  if (error) redirect(`/dashboard/report-cards?period=${periodId}&error=Report+cards+could+not+be+created`);
  await writeAuditEvent({ organizationId: context.organizationId, action: "reports.class_initialized", entityType: "class", entityId: classId, metadata: { period_id: periodId, cards: data } });
  revalidatePath("/dashboard/report-cards"); redirect(`/dashboard/report-cards/${periodId}/classes/${classId}`);
}

export async function saveSubjectRegister(_: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const context = await getUserContext(), supabase = await createClient();
  const periodId = String(formData.get("period_id") || ""), classId = String(formData.get("class_id") || ""), allocationId = String(formData.get("class_subject_id") || "");
  if (!context || !supabase || [periodId, classId, allocationId].some((id) => !databaseId.safeParse(id).success)) return { error: "The subject register is invalid." };
  let raw: unknown; try { raw = JSON.parse(String(formData.get("rows_json") || "[]")); } catch { return { error: "The report rows could not be read." }; }
  const parsed = subjectRowsSchema.safeParse(raw); if (!parsed.success) return { error: "One or more report rows are invalid." };
  const { data, error } = await supabase.rpc("save_report_subject_register", { p_period: periodId, p_class: classId, p_class_subject: allocationId, p_rows: parsed.data });
  if (error) return { error: "The register could not be saved. It may have been submitted or the roster may have changed." };
  await writeAuditEvent({ organizationId: context.organizationId, action: "reports.subject_saved", entityType: "class_subject", entityId: allocationId, metadata: { period_id: periodId, rows: data } });
  revalidatePath(`/dashboard/report-cards/${periodId}/classes/${classId}`); return { success: `Saved ${data} student report rows.` };
}

export async function saveOverallComments(_: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const access = await leaderAccess(); if (!access) return { error: "Only school leaders can save overall comments." };
  const periodId = String(formData.get("period_id") || ""), classId = String(formData.get("class_id") || "");
  let raw: unknown; try { raw = JSON.parse(String(formData.get("rows_json") || "[]")); } catch { return { error: "The comment rows could not be read." }; }
  const parsed = z.array(z.object({ report_card_id: databaseId, overall_comment: z.string().trim().max(1500) })).min(1).max(1000).safeParse(raw);
  if (!parsed.success || !databaseId.safeParse(periodId).success || !databaseId.safeParse(classId).success) return { error: "One or more overall comments are invalid." };
  const { context, supabase } = access;
  const { data, error } = await supabase.rpc("save_report_overall_comments", { p_period: periodId, p_class: classId, p_rows: parsed.data });
  if (error) return { error: "Comments could not be saved because the report is locked or changed." };
  await writeAuditEvent({ organizationId: context.organizationId, action: "reports.comments_saved", entityType: "class", entityId: classId, metadata: { period_id: periodId, rows: parsed.data.length } });
  revalidatePath(`/dashboard/report-cards/${periodId}/classes/${classId}`); return { success: `Saved ${data} overall comments.` };
}

export async function advanceReportStatus(formData: FormData) {
  const context = await getUserContext(), supabase = await createClient();
  const periodId = String(formData.get("period_id") || ""), classId = String(formData.get("class_id") || ""), status = String(formData.get("status") || "");
  if (!context || !supabase || !databaseId.safeParse(periodId).success || !databaseId.safeParse(classId).success || !["submitted", "approved", "published"].includes(status)) redirect(`/dashboard/report-cards/${periodId}/classes/${classId}?error=Invalid+workflow+step`);
  const { data, error } = await supabase.rpc("set_report_class_status", { p_period: periodId, p_class: classId, p_status: status });
  if (error) redirect(`/dashboard/report-cards/${periodId}/classes/${classId}?error=${encodeURIComponent(status === "submitted" ? "Complete every subject grade before submitting" : "The class is not ready for this step")}`);
  await writeAuditEvent({ organizationId: context.organizationId, action: `reports.class_${status}`, entityType: "class", entityId: classId, metadata: { period_id: periodId, cards: data } });
  revalidatePath("/dashboard/report-cards"); revalidatePath(`/dashboard/report-cards/${periodId}/classes/${classId}`); redirect(`/dashboard/report-cards/${periodId}/classes/${classId}?success=${encodeURIComponent(`${data} report cards ${status}.`)}`);
}
