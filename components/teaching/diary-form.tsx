"use client";

import { useActionState, useState } from "react";
import { saveDiaryEntry, type DiaryActionState } from "@/app/dashboard/teacher/actions";

const initial: DiaryActionState = {};
type Option = { id: string; label: string };
type Previous = { topic: string; summary: string; learningObjective: string } | null;

export function DiaryForm({ allocations, date, selectedAllocation, timetableEntryId = "", previous }: { allocations: Option[]; date: string; selectedAllocation?: string; timetableEntryId?: string; previous: Previous }) {
  const [state, action, pending] = useActionState(saveDiaryEntry, initial);
  const [topic, setTopic] = useState(""); const [summary, setSummary] = useState(""); const [objective, setObjective] = useState("");
  const locked = Boolean(timetableEntryId && selectedAllocation);
  function reuse() { if (!previous) return; setTopic(previous.topic); setSummary(previous.summary); setObjective(previous.learningObjective); }
  if (!allocations.length) return <p className="empty-copy">No class-subject allocation is available. Ask an academic administrator to allocate a subject first.</p>;
  return <form className="diary-form" action={action}>
    {locked ? <><input type="hidden" name="class_subject_id" value={selectedAllocation} /><input type="hidden" name="timetable_entry_id" value={timetableEntryId} /></> : <><label className="field">Class and subject<select name="class_subject_id" defaultValue={selectedAllocation || allocations[0].id}>{allocations.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label><input type="hidden" name="timetable_entry_id" value="" /></>}
    <label className="field">Lesson date<input type="date" name="entry_date" defaultValue={date} required /></label>
    <div className="diary-title-row"><label className="field">Topic<input name="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Fractions and equivalent values" required /></label>{previous && <button className="secondary reuse-button" type="button" onClick={reuse}>Reuse last entry</button>}</div>
    <label className="field">Learning objective<input name="learning_objective" value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Students can compare two fractions" /></label>
    <label className="field">What was covered<textarea name="summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={6} placeholder="Add the lesson summary, activities and anything the next teacher should know…" required /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <div className="form-button-row"><button className="secondary" name="intent" value="draft" type="submit" disabled={pending}>Save draft</button><button className="primary compact" name="intent" value="publish" type="submit" disabled={pending}><span>{pending ? "Saving…" : "Publish diary"}</span><span>→</span></button></div>
  </form>;
}
