"use client";

import { useActionState } from "react";
import { createClass, createSubject, type AcademicActionState } from "@/app/dashboard/academics/actions";

const initial: AcademicActionState = {};

export function CreateClassForm({ academicYears, campuses }: { academicYears: { id: string; name: string }[]; campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createClass, initial);
  return <form className="inline-form" action={action}>
    {state.error && <p className="form-error form-wide" role="alert">{state.error}</p>}
    <label className="field">Academic year <em aria-hidden="true">*</em><select name="academic_year_id" required>{academicYears.map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select></label>
    <label className="field">Campus <em aria-hidden="true">*</em><select name="campus_id" required>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>
    <label className="field">Grade <em aria-hidden="true">*</em><input name="grade" list="grade-options" placeholder="Type or choose a grade" required /></label>
    <datalist id="grade-options">{["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`)].map((grade) => <option value={grade} key={grade} />)}</datalist>
    <label className="field">Section <em aria-hidden="true">*</em><input name="section" placeholder="For example, A" required /></label>
    <button className="primary form-wide" type="submit" disabled={pending}><span>{pending ? "Creating…" : "Create class"}</span><span>→</span></button>
  </form>;
}

export function CreateSubjectForm() {
  const [state, action, pending] = useActionState(createSubject, initial);
  return <form className="inline-form subject-form" action={action}>
    {state.error && <p className="form-error form-wide" role="alert">{state.error}</p>}
    {state.success && <p className="form-success form-wide" role="status">{state.success}</p>}
    <label className="field">Subject name<input name="name" placeholder="Mathematics" required /></label>
    <label className="field">Short code<input name="code" placeholder="MATH" required /></label>
    <button className="primary form-wide" type="submit" disabled={pending}><span>{pending ? "Creating…" : "Create subject"}</span><span>→</span></button>
  </form>;
}
