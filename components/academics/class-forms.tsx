"use client";

import { useActionState } from "react";
import { addTimetableEntry, assignSubject, enrollStudents, type AcademicActionState } from "@/app/dashboard/academics/actions";

const initial: AcademicActionState = {};

export function EnrollmentForm({ classId, students }: { classId: string; students: { id: string; name: string; admissionNumber: string }[] }) {
  const [state, action, pending] = useActionState(enrollStudents, initial);
  if (!students.length) return <p className="empty-copy">Every active student is already enrolled in this class.</p>;
  return <form className="enrollment-form" action={action}><input type="hidden" name="class_id" value={classId} />
    <div className="student-picker">{students.map((student) => <label key={student.id}><input type="checkbox" name="student_ids" value={student.id} /><span><b>{student.name}</b><small>{student.admissionNumber}</small></span></label>)}</div>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <button className="secondary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add selected students"}</button>
  </form>;
}

export function SubjectAllocationForm({ classId, subjects, teachers }: { classId: string; subjects: { id: string; name: string }[]; teachers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(assignSubject, initial);
  if (!subjects.length) return <p className="empty-copy">Create a subject from Academics before allocating it.</p>;
  return <form className="stack-form" action={action}><input type="hidden" name="class_id" value={classId} />
    <label className="field">Subject<select name="subject_id">{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
    <label className="field">Teacher<select name="teacher_staff_id"><option value="">Unassigned</option>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}</select></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <button className="secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Allocate subject"}</button>
  </form>;
}

export function TimetableForm({ classId, allocations }: { classId: string; allocations: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(addTimetableEntry, initial);
  if (!allocations.length) return <p className="empty-copy">Allocate a subject before creating timetable periods.</p>;
  return <form className="stack-form" action={action}><input type="hidden" name="class_id" value={classId} />
    <label className="field">Subject<select name="class_subject_id">{allocations.map((allocation) => <option value={allocation.id} key={allocation.id}>{allocation.label}</option>)}</select></label>
    <div className="mini-grid"><label className="field">Day<select name="weekday">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => <option value={index + 1} key={day}>{day}</option>)}</select></label><label className="field">Period<input name="period_number" type="number" min="1" max="20" defaultValue="1" required /></label></div>
    <div className="mini-grid"><label className="field">Starts<input name="starts_at" type="time" defaultValue="09:00" required /></label><label className="field">Ends<input name="ends_at" type="time" defaultValue="09:45" required /></label></div>
    <label className="field">Room<input name="room" placeholder="Room 204" /></label>
    {state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}
    <button className="secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Add timetable slot"}</button>
  </form>;
}
