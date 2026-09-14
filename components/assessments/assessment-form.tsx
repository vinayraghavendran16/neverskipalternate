"use client";

import { useActionState } from "react";
import { createAssessment, type AssessmentActionState } from "@/app/dashboard/assessments/actions";

const initial: AssessmentActionState = {};

export function AssessmentForm({ allocations, today }: { allocations: { id: string; label: string }[]; today: string }) {
  const [state, action, pending] = useActionState(createAssessment, initial);
  if (!allocations.length) return <p className="empty-copy">Allocate a subject and teacher before creating an assessment.</p>;
  return <form className="assessment-form" action={action}>
    <label className="field">Class and subject<select name="class_subject_id">{allocations.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
    <label className="field">Assessment title<input name="title" placeholder="Unit test 1" required /></label>
    <div className="form-three"><label className="field">Date<input name="assessment_date" type="date" defaultValue={today} required /></label><label className="field">Maximum marks<input name="max_marks" type="number" min="1" max="10000" step="0.01" defaultValue="20" required /></label><label className="field">Weight %<input name="weight_percent" type="number" min="0" max="100" step="0.01" placeholder="Optional" /></label></div>
    {state.error && <p className="form-error">{state.error}</p>}
    <button className="primary" type="submit" disabled={pending}><span>{pending ? "Creating…" : "Create and enter marks"}</span><span>→</span></button>
  </form>;
}
