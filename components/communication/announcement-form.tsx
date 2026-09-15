"use client";
import { useActionState } from "react";
import { createAnnouncement, type CommunicationState } from "@/app/dashboard/communication/actions";

export function AnnouncementForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createAnnouncement, {} as CommunicationState);
  return <form className="workflow-form" action={action}>
    <label className="field">Title<input name="title" maxLength={180} required placeholder="Term 1 parent meeting" /></label>
    <label className="field">Message<textarea name="body" rows={6} maxLength={5000} required placeholder="Write one clear message with the action and deadline." /></label>
    <div className="form-two"><label className="field">Priority<select name="priority" defaultValue="normal"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label><label className="field">Campus<select name="campus_id" defaultValue=""><option value="">All campuses</option>{campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
    <fieldset className="class-picker"><legend>Audience</legend>{["teacher","parent","student","staff"].map(role => <label key={role}><input type="checkbox" name="audience" value={role} defaultChecked /><span>{role[0].toUpperCase()+role.slice(1)}s</span></label>)}</fieldset>
    <label className="check-field"><input type="checkbox" name="requires_acknowledgement" /> Require acknowledgement</label>
    <label className="field compact-number">Expires on <input name="expires_at" type="date" /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <button className="primary" disabled={pending}><span>{pending ? "Publishing…" : "Publish announcement"}</span><span>→</span></button>
  </form>;
}
