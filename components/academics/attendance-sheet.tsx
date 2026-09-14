"use client";

import { useActionState, useMemo, useState } from "react";
import { saveAttendance, type AttendanceActionState } from "@/app/dashboard/attendance/actions";

type Student = { id: string; name: string; admissionNumber: string; status: string; reason: string };
const initial: AttendanceActionState = {};

export function AttendanceSheet({ classId, date, students, sessionStatus }: { classId: string; date: string; students: Student[]; sessionStatus: string }) {
  const [state, action, pending] = useActionState(saveAttendance, initial);
  const [statuses, setStatuses] = useState<Record<string, string>>(() => Object.fromEntries(students.map((student) => [student.id, student.status || "present"])));
  const exceptions = useMemo(() => Object.values(statuses).filter((status) => status !== "present").length, [statuses]);
  const locked = sessionStatus === "locked";
  function markAllPresent() { setStatuses(Object.fromEntries(students.map((student) => [student.id, "present"]))); }

  return <form action={action} className="attendance-sheet">
    <input type="hidden" name="class_id" value={classId} /><input type="hidden" name="attendance_date" value={date} />
    <div className="attendance-bar"><div><strong>{students.length - exceptions} present</strong><span>{exceptions} exception{exceptions === 1 ? "" : "s"}</span></div><button className="secondary" type="button" onClick={markAllPresent} disabled={locked}>Mark all present</button></div>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <div className="attendance-list">{students.map((student, index) => <div className={`attendance-row attendance-${statuses[student.id]}`} key={student.id}>
      <span className="roll-number">{String(index + 1).padStart(2, "0")}</span><div className="attendance-name"><b>{student.name}</b><small>{student.admissionNumber}</small></div>
      <select name={`status_${student.id}`} value={statuses[student.id]} onChange={(event) => setStatuses((current) => ({ ...current, [student.id]: event.target.value }))} disabled={locked}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select>
      <input name={`reason_${student.id}`} defaultValue={student.reason} placeholder={statuses[student.id] === "present" ? "Optional note" : "Reason for exception"} disabled={locked} />
    </div>)}</div>
    <div className="attendance-actions"><button className="secondary" name="intent" value="draft" type="submit" disabled={pending || locked}>Save draft</button><button className="primary compact" name="intent" value="submit" type="submit" disabled={pending || locked}><span>{pending ? "Saving…" : "Submit attendance"}</span><span>→</span></button></div>
  </form>;
}
