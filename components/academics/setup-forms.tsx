"use client";

import { useActionState } from "react";
import { createClass, createSubject, type AcademicActionState } from "@/app/dashboard/academics/actions";

const initial: AcademicActionState = {};

export function CreateClassForm({ academicYears, campuses }: { academicYears: { id: string; name: string }[]; campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createClass, initial);
  return <form className="inline-form" action={action}>
    {state.error && <p className="form-error form-wide">{state.error}</p>}
    <label className="field">Academic year<select name="academic_year_id" required>{academicYears.map((year) => <option value={year.id} key={year.id}>{year.name}</option>)}</select></label>
    <label className="field">Campus<select name="campus_id" required>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>
    <label className="field">Grade<input name="grade" placeholder="Grade 6" required /></label>
    <label className="field">Section<input name="section" placeholder="A" required /></label>
    <button className="primary form-wide" type="submit" disabled={pending}><span>{pending ? "Creating…" : "Create class"}</span><span>→</span></button>
  </form>;
}

export function CreateSubjectForm() {
  const [state, action, pending] = useActionState(createSubject, initial);
  return <form className="inline-form subject-form" action={action}>
    {state.error && <p className="form-error form-wide">{state.error}</p>}
    {state.success && <p className="form-success form-wide">{state.success}</p>}
    <label className="field">Subject name<input name="name" placeholder="Mathematics" required /></label>
    <label className="field">Short code<input name="code" placeholder="MATH" required /></label>
    <button className="primary form-wide" type="submit" disabled={pending}><span>{pending ? "Creating…" : "Create subject"}</span><span>→</span></button>
  </form>;
}
