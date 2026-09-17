"use client";

import { useActionState, useMemo, useState } from "react";
import { createHomework, type HomeworkActionState } from "@/app/dashboard/homework/actions";

const initial: HomeworkActionState = {};
type Subject = { id: string; label: string };
type ClassOption = { id: string; label: string; subjectIds: string[] };

export function HomeworkForm({ subjects, classes, defaultDue, initialSubjectId, initialClassId }: { subjects: Subject[]; classes: ClassOption[]; defaultDue: string; initialSubjectId?: string; initialClassId?: string }) {
  const [state, action, pending] = useActionState(createHomework, initial);
  const [subjectId, setSubjectId] = useState(initialSubjectId || subjects[0]?.id || "");
  const [selected, setSelected] = useState<string[]>(initialClassId ? [initialClassId] : []);
  const matching = useMemo(() => classes.filter((item) => item.subjectIds.includes(subjectId)), [classes, subjectId]);
  const selectedMatching = selected.filter((id) => matching.some((item) => item.id === id));
  function changeSubject(value: string) { setSubjectId(value); setSelected([]); }
  function toggleClass(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  if (!subjects.length) return <p className="empty-copy">Allocate a subject to a class before creating homework.</p>;
  return <form className="homework-form" action={action}>
    <div className="form-two"><label className="field">Subject<select name="subject_id" value={subjectId} onChange={(event) => changeSubject(event.target.value)}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.label}</option>)}</select></label><label className="field">Due date and time (India Standard Time)<input name="due_at" type="datetime-local" defaultValue={defaultDue} required /></label></div>
    <label className="field">Title<input name="title" placeholder="Chapter 4 practice" required /></label>
    <label className="field">Instructions<textarea name="instructions" rows={5} placeholder="Write the task once and assign it to every relevant section…" required /></label>
    <label className="field compact-number">Expected effort (minutes)<input name="estimated_minutes" type="number" min="1" max="600" defaultValue="30" /></label>
    <fieldset className="class-picker"><legend><span>Assign to classes</span>{matching.length > 1 && <button type="button" className="text-button" onClick={() => setSelected(selectedMatching.length === matching.length ? [] : matching.map((item) => item.id))}>{selectedMatching.length === matching.length ? "Clear all" : "Select all"}</button>}</legend>{matching.map((item) => <label key={`${subjectId}:${item.id}`}><input type="checkbox" name="class_ids" value={item.id} checked={selected.includes(item.id)} onChange={() => toggleClass(item.id)} /><span>{item.label}</span></label>)}{!matching.length && <p>No classes use this subject yet.</p>}</fieldset>
    <p className="form-context-note">{selectedMatching.length ? `${selectedMatching.length} class${selectedMatching.length === 1 ? "" : "es"} selected. One assignment will be shared across them.` : "Select at least one class to publish."}</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <div className="form-button-row"><button className="secondary" name="intent" value="draft" type="submit" disabled={pending || !selectedMatching.length}>Save draft</button><button className="primary compact" name="intent" value="publish" type="submit" disabled={pending || !selectedMatching.length}><span>{pending ? "Saving…" : "Publish homework"}</span><span>→</span></button></div>
  </form>;
}
