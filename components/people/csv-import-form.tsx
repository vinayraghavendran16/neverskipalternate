"use client";

import { useActionState } from "react";
import { importStudents, type PeopleActionState } from "@/app/dashboard/people/actions";

const initialState: PeopleActionState = {};

export function CsvImportForm({ campusId }: { campusId: string }) {
  const [state, action, pending] = useActionState(importStudents, initialState);
  return (
    <form className="upload-box" action={action}>
      <input type="hidden" name="campus_id" value={campusId} />
      <div className="upload-icon">⇧</div>
      <div><b>Choose a student CSV</b><p>Maximum 500 rows or 1 MB per import.</p></div>
      <input name="file" type="file" accept=".csv,text/csv" required />
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
      <button className="primary" type="submit" disabled={pending}><span>{pending ? "Importing…" : "Import students"}</span><span>→</span></button>
    </form>
  );
}
