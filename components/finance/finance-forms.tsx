"use client";
import { useActionState } from "react";
import { createFeeInvoice, recordFeePayment, type FinanceState } from "@/app/dashboard/finance/actions";

export function InvoiceForm({ students, today }: { students: { id:string; label:string }[]; today:string }) {
 const [state, action, pending] = useActionState(createFeeInvoice, {} as FinanceState);
 return <form className="workflow-form" action={action}><label className="field">Student<select name="student_id" required><option value="">Choose student</option>{students.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label className="field">Fee name<input name="fee_name" required maxLength={160} placeholder="Term 1 tuition fee" /></label><div className="form-two"><label className="field">Amount (₹)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="field">Due date<input name="due_on" type="date" min={today} required /></label></div><label className="field">Notes<input name="notes" maxLength={500} /></label>{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}<button className="primary" disabled={pending}>Create invoice</button></form>;
}

export function PaymentForm({ invoiceId, outstanding }: { invoiceId:string; outstanding:number }) {
 const [state, action, pending] = useActionState(recordFeePayment, {} as FinanceState);
 return <form className="payment-form" action={action}><input type="hidden" name="invoice_id" value={invoiceId} /><label className="field">Amount<input name="amount" type="number" min="0.01" max={outstanding} step="0.01" required /></label><label className="field">Method<select name="method"><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option></select></label><label className="field">Reference<input name="reference" maxLength={120} /></label>{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}<button className="secondary" disabled={pending}>{pending?"Recording…":"Record payment"}</button></form>;
}
