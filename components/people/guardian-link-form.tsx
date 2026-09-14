"use client";

import { useActionState } from "react";
import { linkGuardian, type PeopleActionState } from "@/app/dashboard/people/actions";

const initialState: PeopleActionState = {};

export function GuardianLinkForm({ studentId, guardians }: { studentId: string; guardians: { id: string; name: string; phone: string }[] }) {
  const [state, action, pending] = useActionState(linkGuardian, initialState);
  if (!guardians.length) return <p className="empty-copy">Create a guardian record before linking family contacts.</p>;
  return (
    <form className="relationship-form" action={action}>
      <input type="hidden" name="student_id" value={studentId} />
      <label className="field">Guardian<select name="guardian_id" required>{guardians.map((guardian) => <option value={guardian.id} key={guardian.id}>{guardian.name} · {guardian.phone}</option>)}</select></label>
      <label className="field">Relationship<select name="relationship"><option>Mother</option><option>Father</option><option>Guardian</option><option>Grandparent</option><option>Sibling</option><option>Other</option></select></label>
      <label className="check-field"><input type="checkbox" name="is_primary" /> Primary contact</label>
      <label className="check-field"><input type="checkbox" name="can_pick_up" /> Authorized pickup</label>
      {state.error && <p className="form-error form-wide">{state.error}</p>}
      {state.success && <p className="form-success form-wide">{state.success}</p>}
      <button className="secondary" type="submit" disabled={pending}>{pending ? "Linking…" : "Link guardian"}</button>
    </form>
  );
}
