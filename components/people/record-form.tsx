"use client";

import { useActionState } from "react";
import { savePerson, type PeopleActionState } from "@/app/dashboard/people/actions";

type RecordValue = string | null | undefined;
type PersonRecord = Record<string, RecordValue>;
type Campus = { id: string; name: string };

const initialState: PeopleActionState = {};

function TextField({ name, label, record, required, type = "text", placeholder }: { name: string; label: string; record: PersonRecord; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="field">{label}{required && <em>*</em>}<input name={name} type={type} defaultValue={record[name] || ""} required={required} placeholder={placeholder} /></label>;
}

export function RecordForm({ kind, record = {}, campuses = [] }: { kind: "students" | "staff" | "guardians"; record?: PersonRecord; campuses?: Campus[] }) {
  const [state, action, pending] = useActionState(savePerson, initialState);
  return (
    <form className="record-form" action={action}>
      <input type="hidden" name="kind" value={kind} />
      {record.id && <input type="hidden" name="id" value={record.id} />}
      {kind !== "guardians" && campuses.length === 1 && <input type="hidden" name="campus_id" value={campuses[0].id} />}
      {state.error && <p className="form-error form-wide">{state.error}</p>}
      {kind !== "guardians" && campuses.length > 1 && <label className="field">Campus<em>*</em><select name="campus_id" defaultValue={record.campus_id || campuses[0]?.id} required>{campuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.name}</option>)}</select></label>}

      {kind === "students" && <>
        <TextField name="admission_number" label="Admission number" record={record} required placeholder="NS-2026-001" />
        <TextField name="first_name" label="First name" record={record} required />
        <TextField name="last_name" label="Last name" record={record} />
        <TextField name="preferred_name" label="Preferred name" record={record} />
        <TextField name="date_of_birth" label="Date of birth" record={record} type="date" />
        <label className="field">Gender<select name="gender" defaultValue={record.gender || ""}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <TextField name="email" label="Email" record={record} type="email" />
        <TextField name="phone" label="Phone" record={record} type="tel" />
        <TextField name="joined_on" label="Joined on" record={record} type="date" />
        <label className="field">Status<select name="status" defaultValue={record.status || "active"}><option value="applicant">Applicant</option><option value="active">Active</option><option value="withdrawn">Withdrawn</option><option value="alumni">Alumni</option></select></label>
        <label className="field form-wide">Address<textarea name="address" defaultValue={record.address || ""} rows={3} /></label>
        <label className="field form-wide">Emergency and care notes<textarea name="emergency_notes" defaultValue={record.emergency_notes || ""} rows={3} placeholder="Visible only to authorized school staff" /></label>
      </>}

      {kind === "staff" && <>
        <TextField name="employee_number" label="Employee number" record={record} required placeholder="EMP-001" />
        <TextField name="first_name" label="First name" record={record} required />
        <TextField name="last_name" label="Last name" record={record} />
        <TextField name="designation" label="Designation" record={record} required placeholder="Mathematics teacher" />
        <TextField name="department" label="Department" record={record} placeholder="Academics" />
        <TextField name="email" label="Email" record={record} type="email" />
        <TextField name="phone" label="Phone" record={record} type="tel" />
        <TextField name="joined_on" label="Joined on" record={record} type="date" />
        <label className="field">Employment type<select name="employment_type" defaultValue={record.employment_type || "full_time"}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="visiting">Visiting</option></select></label>
        <label className="field">Status<select name="status" defaultValue={record.status || "active"}><option value="active">Active</option><option value="on_leave">On leave</option><option value="inactive">Inactive</option></select></label>
      </>}

      {kind === "guardians" && <>
        <TextField name="first_name" label="First name" record={record} required />
        <TextField name="last_name" label="Last name" record={record} />
        <TextField name="phone" label="Phone" record={record} required type="tel" />
        <TextField name="email" label="Email" record={record} type="email" />
        <TextField name="occupation" label="Occupation" record={record} />
        <label className="field">Status<select name="status" defaultValue={record.status || "active"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="field form-wide">Address<textarea name="address" defaultValue={record.address || ""} rows={3} /></label>
      </>}

      <div className="form-actions form-wide">
        <button className="primary" type="submit" disabled={pending}><span>{pending ? "Saving…" : record.id ? "Save changes" : "Create record"}</span><span>→</span></button>
      </div>
    </form>
  );
}
