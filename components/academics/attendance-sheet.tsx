"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAttendance, type AttendanceActionState } from "@/app/dashboard/attendance/actions";

type Status = "present" | "absent" | "late" | "excused";
type Student = { id: string; name: string; admissionNumber: string; status: Status; reason: string; approvedLeave?: boolean };
const initial: AttendanceActionState = {};
const statusOptions: { value: Status; label: string; short: string }[] = [
  { value: "present", label: "Present", short: "P" },
  { value: "absent", label: "Absent", short: "A" },
  { value: "late", label: "Late", short: "L" },
  { value: "excused", label: "Excused", short: "E" },
];
const reasonSuggestions: Record<Exclude<Status, "present">, string[]> = {
  absent: ["Sick", "Family reason", "No information"],
  late: ["Transport delay", "Medical appointment", "Weather"],
  excused: ["Approved leave", "School activity", "Medical leave"],
};

export function AttendanceSheet({ classId, date, students, sessionStatus }: { classId: string; date: string; students: Student[]; sessionStatus: string }) {
  const [state, action, pending] = useActionState(saveAttendance, initial);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, Status>>(() => Object.fromEntries(students.map(student => [student.id, student.status || "present"])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(students.map(student => [student.id, student.reason || ""])));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "exceptions">("all");
  const [lastChange, setLastChange] = useState<{ id: string; status: Status; note: string } | null>(null);
  const counts = useMemo(() => students.reduce((all, student) => { all[studentStatuses[student.id]]++; return all; }, { present: 0, absent: 0, late: 0, excused: 0 }), [studentStatuses, students]);
  const exceptionCount = counts.absent + counts.late + counts.excused;
  const visibleStudents = useMemo(() => students.filter(student => {
    const matches = `${student.name} ${student.admissionNumber}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (filter === "all" || studentStatuses[student.id] !== "present");
  }), [students, query, filter, studentStatuses]);
  const visibleStudentIds = useMemo(() => new Set(visibleStudents.map(student => student.id)), [visibleStudents]);
  const locked = sessionStatus === "locked";

  function setStatus(id: string, status: Status) {
    if (locked || studentStatuses[id] === status) return;
    setLastChange({ id, status: studentStatuses[id], note: notes[id] || "" });
    setStudentStatuses(current => ({ ...current, [id]: status }));
    if (status === "present") setNotes(current => ({ ...current, [id]: "" }));
  }
  function setAllPresent() {
    if (locked) return;
    setLastChange(null);
    setStudentStatuses(Object.fromEntries(students.map(student => [student.id, "present"])));
    setNotes(current => Object.fromEntries(Object.keys(current).map(id => [id, ""])));
  }
  function undo() {
    const change = lastChange;
    if (!change) return;
    setStudentStatuses(current => ({ ...current, [change.id]: change.status }));
    setNotes(current => ({ ...current, [change.id]: change.note }));
    setLastChange(null);
  }

  return <form action={action} className="attendance-sheet">
    <input type="hidden" name="class_id" value={classId} /><input type="hidden" name="attendance_date" value={date} />
    <div className="attendance-command-bar"><div className="attendance-counts" aria-label="Attendance totals">{statusOptions.map(item => <span className={`attendance-count attendance-count-${item.value}`} key={item.value}><b>{counts[item.value]}</b> {item.label}</span>)}</div><div className="attendance-bulk-actions"><button className="secondary compact" type="button" onClick={undo} disabled={locked || !lastChange}>Undo</button><button className="secondary compact" type="button" onClick={setAllPresent} disabled={locked || exceptionCount === 0}>Everyone present</button></div></div>
    <div className="attendance-toolbar"><label className="attendance-search"><span className="sr-only">Find a student</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find student or admission number" /></label><div className="attendance-filters" aria-label="Filter register"><button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All {students.length}</button><button type="button" className={filter === "exceptions" ? "active" : ""} onClick={() => setFilter("exceptions")}>Exceptions {exceptionCount}</button></div></div>
    {sessionStatus === "submitted" && <p className="attendance-notice">This register was submitted. Any changes will be saved as an audited update when you submit again.</p>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <div className="attendance-list">{students.map(student => { const current = studentStatuses[student.id]; return <div className={`attendance-row attendance-${current}`} key={student.id} hidden={!visibleStudentIds.has(student.id)}>
      <span className="student-avatar" aria-hidden="true">{student.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase()}</span><div className="attendance-name"><b>{student.name}</b><small>{student.admissionNumber}{student.approvedLeave ? " · approved leave" : ""}</small></div>
      <input type="hidden" name={`status_${student.id}`} value={current} /><div className="attendance-status-buttons" role="group" aria-label={`Attendance for ${student.name}`}>{statusOptions.map(item => <button key={item.value} type="button" title={item.label} aria-label={`${student.name}: ${item.label}`} aria-pressed={current === item.value} className={`attendance-status-${item.value}`} onClick={() => setStatus(student.id, item.value)} disabled={locked}><span>{item.short}</span><small>{item.label}</small></button>)}</div>
      <div className="attendance-reason">{current === "present" ? <><span className="attendance-ok">Ready</span><input type="hidden" name={`reason_${student.id}`} value="" /></> : <><input aria-label={`Reason for ${student.name}`} maxLength={500} name={`reason_${student.id}`} value={notes[student.id] || ""} onChange={event => setNotes(all => ({ ...all, [student.id]: event.target.value }))} placeholder="Optional reason" disabled={locked} /><div className="reason-chips">{reasonSuggestions[current].map(reason => <button type="button" key={reason} onClick={() => setNotes(all => ({ ...all, [student.id]: reason }))} disabled={locked}>{reason}</button>)}</div></>}</div>
    </div>})}{!visibleStudents.length && <div className="attendance-empty"><b>No students match this view.</b><button type="button" className="text-button" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></div>}</div>
    <div className="attendance-actions"><div><b>{students.length - exceptionCount} of {students.length} present</b><small>{exceptionCount ? `${exceptionCount} exception${exceptionCount === 1 ? "" : "s"} ready to review` : "No exceptions to review"}</small></div><button className="secondary" name="intent" value="draft" type="submit" disabled={pending || locked}>Save draft</button><button className="primary compact" name="intent" value="submit" type="submit" disabled={pending || locked}><span>{pending ? "Saving…" : sessionStatus === "submitted" ? "Update attendance" : "Submit attendance"}</span><span>→</span></button></div>
  </form>;
}
