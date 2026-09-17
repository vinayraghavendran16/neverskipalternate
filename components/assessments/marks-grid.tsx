"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAssessmentMarks, type AssessmentActionState } from "@/app/dashboard/assessments/actions";

type MarkRow = { studentId: string; name: string; admissionNumber: string; status: "scored" | "absent" | "not_applicable"; marks: number | null; note: string };
const initial: AssessmentActionState = {};

export function MarksGrid({ assessmentId, maxMarks, initialRows, locked }: { assessmentId: string; maxMarks: number; initialRows: MarkRow[]; locked: boolean }) {
  const [state, action, pending] = useActionState(saveAssessmentMarks, initial);
  const [rows, setRows] = useState(initialRows); const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "scored" | "absent">("all");
  const scored = useMemo(() => rows.filter((row) => row.status === "scored" && row.marks !== null), [rows]);
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.marks || 0), 0) / scored.length : 0;
  const missing = rows.filter((row) => row.status === "scored" && row.marks === null).length;
  const absent = rows.filter((row) => row.status === "absent").length;
  const visibleRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => {
    const matchesQuery = `${row.name} ${row.admissionNumber}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesFilter = filter === "all" || (filter === "missing" && row.status === "scored" && row.marks === null) || (filter === "scored" && row.status === "scored" && row.marks !== null) || (filter === "absent" && row.status === "absent");
    return matchesQuery && matchesFilter;
  });
  function update(index: number, change: Partial<MarkRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row)); setVersion((value) => value + 1); }
  function next(event: React.KeyboardEvent<HTMLInputElement>, index: number) { if (event.key !== "Enter") return; event.preventDefault(); document.querySelector<HTMLInputElement>(`[data-mark-index="${index + 1}"]`)?.focus(); }
  const payload = rows.map(({ studentId, status, marks, note }) => ({ studentId, status, marks: status === "scored" ? marks : null, note }));
  return <form className="marks-workspace" action={action}>
    <input type="hidden" name="assessment_id" value={assessmentId} /><input type="hidden" name="rows_json" value={JSON.stringify(payload)} key={version} />
    <div className="marks-toolbar"><div><strong>{rows.length} students</strong><span>{scored.length} scored · {missing} missing · {absent} absent · average {average.toFixed(1)} / {maxMarks}</span></div><span className="speed-note">Save your changes before leaving this page</span></div>
    <div className="marks-controls"><label><span className="sr-only">Search students</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or admission no." /></label><div role="group" aria-label="Filter mark rows">{(["all", "missing", "scored", "absent"] as const).map((value) => <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? `All ${rows.length}` : value === "missing" ? `Missing ${missing}` : value === "scored" ? `Scored ${scored.length}` : `Absent ${absent}`}</button>)}</div></div>
    {state.error && <p className="form-error marks-message" role="alert">{state.error}</p>}{state.success && <p className="form-success marks-message" role="status">{state.success}</p>}
    <div className="marks-table-wrap"><table className="marks-table"><thead><tr><th>#</th><th>Student</th><th>Status</th><th>Marks / {maxMarks}</th><th>Note</th></tr></thead><tbody>{visibleRows.map(({ row, index }) => <tr key={row.studentId} className={row.status === "scored" && row.marks === null ? "mark-missing" : ""}><td>{String(index + 1).padStart(2, "0")}</td><td><b>{row.name}</b><small>{row.admissionNumber}</small></td><td><select aria-label={`Result status for ${row.name}`} value={row.status} onChange={(event) => update(index, { status: event.target.value as MarkRow["status"], marks: event.target.value === "scored" ? row.marks : null })} disabled={locked}><option value="scored">Scored</option><option value="absent">Absent</option><option value="not_applicable">N/A</option></select></td><td><input aria-label={`Marks for ${row.name}`} data-mark-index={index} type="number" min="0" max={maxMarks} step="0.01" value={row.marks ?? ""} onChange={(event) => update(index, { marks: event.target.value === "" ? null : Number(event.target.value) })} onKeyDown={(event) => next(event, index)} disabled={locked || row.status !== "scored"} placeholder="Required" aria-invalid={row.status === "scored" && row.marks === null} /></td><td><input aria-label={`Note for ${row.name}`} maxLength={500} value={row.note} onChange={(event) => update(index, { note: event.target.value })} disabled={locked} placeholder="Optional" /></td></tr>)}</tbody></table>{!visibleRows.length && <p className="empty-copy marks-empty">No students match this filter.</p>}</div>
    <div className="marks-footer"><span>{locked ? "Published and locked" : missing ? `${missing} result${missing === 1 ? "" : "s"} still need marks or a status` : "Every student has a result. Ready to publish."}</span>{!locked && <div><button className="secondary" name="intent" value="save" type="submit" disabled={pending}>Save all</button><button className="primary compact" name="intent" value="publish" type="submit" disabled={pending || missing > 0} onClick={(event) => { if (!window.confirm("Publish and lock this marks register? Published results cannot be edited.")) event.preventDefault(); }}><span>{pending ? "Saving…" : "Publish marks"}</span><span>→</span></button></div>}</div>
  </form>;
}
