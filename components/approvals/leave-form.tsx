"use client";
import { useActionState, useState } from "react";
import { createLeaveRequest, type ApprovalState } from "@/app/dashboard/approvals/actions";

export function LeaveForm({ people, today }: { people: { id: string; label: string; type: "student"|"staff" }[]; today: string }) {
  const [state, action, pending] = useActionState(createLeaveRequest, {} as ApprovalState);
  const [person, setPerson] = useState(people[0]);
  if (!people.length) return <p className="empty-copy">No linked student or staff record is available for leave requests.</p>;
  return <form className="workflow-form" action={action}>
    <input type="hidden" name="person_type" value={person.type} /><input type="hidden" name="person_id" value={person.id} />
    <label className="field">Person<select value={`${person.type}:${person.id}`} onChange={event => { const [type,id] = event.target.value.split(":"); const selected = people.find(p => p.id === id && p.type === type); if (selected) setPerson(selected); }}>{people.map(p => <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>{p.label}</option>)}</select></label>
    <label className="field">Leave type<select name="leave_type"><option value="sick">Sick leave</option><option value="personal">Personal</option><option value="family">Family</option><option value="official">Official duty</option><option value="other">Other</option></select></label>
    <div className="form-two"><label className="field">From<input name="starts_on" type="date" min={today} defaultValue={today} required /></label><label className="field">To<input name="ends_on" type="date" min={today} defaultValue={today} required /></label></div>
    <label className="field">Reason<textarea name="reason" rows={4} minLength={3} maxLength={1000} required /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <button className="primary" disabled={pending}><span>{pending ? "Submitting…" : "Submit for approval"}</span><span>→</span></button>
  </form>;
}
