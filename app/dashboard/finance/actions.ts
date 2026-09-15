"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type FinanceState = { error?: string; success?: string };
const invoiceSchema = z.object({ student_id: databaseId, fee_name: z.string().trim().min(1).max(160), amount: z.coerce.number().positive().max(10000000), due_on: z.iso.date(), notes: z.string().trim().max(500).optional() });
const paymentSchema = z.object({ invoice_id: databaseId, amount: z.coerce.number().positive(), method: z.enum(["cash","bank_transfer","upi","cheque","card"]), reference: z.string().trim().max(120).optional() });
const financeRoles = ["owner","administrator","principal","staff"];

export async function createFeeInvoice(_: FinanceState, formData: FormData): Promise<FinanceState> {
  const context = await getUserContext(); const supabase = await createClient(); if (!context || !supabase || !financeRoles.includes(context.role)) return { error: "Finance access is required." };
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Complete the student, fee, amount and due date." };
  const { error } = await supabase.from("fee_invoices").insert({ organization_id: context.organizationId, student_id: parsed.data.student_id, fee_name: parsed.data.fee_name, amount: parsed.data.amount, due_on: parsed.data.due_on, notes: parsed.data.notes || null, created_by: context.userId });
  if (error) return { error: error.message }; revalidatePath("/dashboard/finance"); return { success: "Fee invoice created." };
}

export async function recordFeePayment(_: FinanceState, formData: FormData): Promise<FinanceState> {
  const context = await getUserContext(); const supabase = await createClient(); if (!context || !supabase || !financeRoles.includes(context.role)) return { error: "Finance access is required." };
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: "Enter a valid payment amount and method." };
  const { error } = await supabase.rpc("record_fee_payment", { p_invoice: parsed.data.invoice_id, p_amount: parsed.data.amount, p_method: parsed.data.method, p_reference: parsed.data.reference || null });
  if (error) return { error: error.message }; revalidatePath("/dashboard/finance"); revalidatePath("/dashboard"); return { success: "Payment recorded and balance updated." };
}
