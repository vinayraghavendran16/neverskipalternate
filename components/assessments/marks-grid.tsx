"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAssessmentMarks, type AssessmentActionState } from "@/app/dashboard/assessments/actions";

type MarkRow = { studentId: string; name: string; admissionNumber: string; status: "scored" | "absent" | "not_applicable"; marks: number | null; note: string };
const initial: AssessmentActionState = {};

export function MarksGrid({ assessmentId, maxMarks, initialRows, locked }: { assessmentId: string; maxMarks: number; initialRows: MarkRow[]; locked: boolean }) {
  const [state, action, pending] = useActionState(saveAssessmentMarks, initial);
  const [rows, setRows] = useState(initialRows); const [version, setVersion] = useState(0);
  const scored = useMemo(() => rows.filter((row) => row.status === "scored" && row.marks !== null), [rows]);
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.marks || 0), 0) / scored.length : 0;
  function update(index: number, change: Partial<MarkRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row)); setVersion((value) => value + 1); }
  function next(event: React.KeyboardEvent<HTMLInputElement>, index: number) { if (event.key !== "Enter") return; event.preventDefault(); document.querySelector<HTMLInputElement>(`[data-mark-index="${index + 1}"]`)?.focus(); }
  const payload = rows.map(({ studentId, status, marks, note }) => ({ studentId, status, marks: status === "scored" ? marks : null, note }));
  return <form className="marks-workspace" action={action}>
    <input type="hidden" name="assessment_id" value={assessmentId} /><input type="hidden" name="rows_json" value={JSON.stringify(payload)} key={version} />
    <div className="marks-toolbar"><div><strong>{rows.length} students</strong><span>{scored.length} scored · average {average.toFixed(1)} / {maxMarks}</span></div><span className="speed-note">Inputs stay local until one batched save</span></div>
    {state.error && <p className="form-error marks-message">{state.error}</p>}{state.success && <p className="form-success marks-message">{state.success}</p>}
    <div className="marks-table-wrap"><table className="marks-table"><thead><tr><th>#</th><th>Student</th><th>Status</th><th>Marks / {maxMarks}</th><th>Note</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.studentId}><td>{String(index + 1).padStart(2, "0")}</td><td><b>{row.name}</b><small>{row.admissionNumber}</small></td><td><select value={row.status} onChange={(event) => update(index, { status: event.target.value as MarkRow["status"], marks: event.target.value === "scored" ? row.marks : null })} disabled={locked}><option value="scored">Scored</option><option value="absent">Absent</option><option value="not_applicable">N/A</option></select></td><td><input data-mark-index={index} type="number" min="0" max={maxMarks} step="0.01" value={row.marks ?? ""} onChange={(event) => update(index, { marks: event.target.value === "" ? null : Number(event.target.value) })} onKeyDown={(event) => next(event, index)} disabled={locked || row.status !== "scored"} placeholder="—" /></td><td><input value={row.note} onChange={(event) => update(index, { note: event.target.value })} disabled={locked} placeholder="Optional" /></td></tr>)}</tbody></table></div>
    <div className="marks-footer"><span>{locked ? "Published and locked" : "Press Enter to move to the next student"}</span>{!locked && <div><button className="secondary" name="intent" value="save" type="submit" disabled={pending}>Save all</button><button className="primary compact" name="intent" value="publish" type="submit" disabled={pending}><span>{pending ? "Saving…" : "Publish marks"}</span><span>→</span></button></div>}</div>
  </form>;
}
