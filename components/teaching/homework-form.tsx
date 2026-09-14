"use client";

import { useActionState, useMemo, useState } from "react";
import { createHomework, type HomeworkActionState } from "@/app/dashboard/homework/actions";

const initial: HomeworkActionState = {};
type Subject = { id: string; label: string };
type ClassOption = { id: string; label: string; subjectIds: string[] };

export function HomeworkForm({ subjects, classes, defaultDue }: { subjects: Subject[]; classes: ClassOption[]; defaultDue: string }) {
  const [state, action, pending] = useActionState(createHomework, initial);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const matching = useMemo(() => classes.filter((item) => item.subjectIds.includes(subjectId)), [classes, subjectId]);
  if (!subjects.length) return <p className="empty-copy">Allocate a subject to a class before creating homework.</p>;
  return <form className="homework-form" action={action}>
    <div className="form-two"><label className="field">Subject<select name="subject_id" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.label}</option>)}</select></label><label className="field">Due date and time<input name="due_at" type="datetime-local" defaultValue={defaultDue} required /></label></div>
    <label className="field">Title<input name="title" placeholder="Chapter 4 practice" required /></label>
    <label className="field">Instructions<textarea name="instructions" rows={5} placeholder="Write the task once and assign it to every relevant section…" required /></label>
    <label className="field compact-number">Expected effort (minutes)<input name="estimated_minutes" type="number" min="1" max="600" defaultValue="30" /></label>
    <fieldset className="class-picker"><legend>Assign to classes</legend>{matching.map((item) => <label key={item.id}><input type="checkbox" name="class_ids" value={item.id} /><span>{item.label}</span></label>)}{!matching.length && <p>No classes use this subject yet.</p>}</fieldset>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <div className="form-button-row"><button className="secondary" name="intent" value="draft" type="submit" disabled={pending}>Save draft</button><button className="primary compact" name="intent" value="publish" type="submit" disabled={pending || !matching.length}><span>{pending ? "Saving…" : "Publish homework"}</span><span>→</span></button></div>
  </form>;
}
