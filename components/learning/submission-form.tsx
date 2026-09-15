"use client";
import { useActionState } from "react";
import { saveHomeworkSubmission, type LearningState } from "@/app/dashboard/learning/actions";

export function SubmissionForm({ homeworkId, studentId, initialResponse, initialStatus }: { homeworkId: string; studentId: string; initialResponse?: string | null; initialStatus?: string }) {
  const [state, action, pending] = useActionState(saveHomeworkSubmission, {} as LearningState);
  return <form className="submission-form" action={action}><input type="hidden" name="homework_id" value={homeworkId} /><input type="hidden" name="student_id" value={studentId} />
    <label className="field">Student response <textarea name="response" rows={3} maxLength={5000} defaultValue={initialResponse || ""} placeholder="Add a note, answer, or link shared by your teacher." /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <div className="form-button-row"><button className="secondary" name="intent" value="completed" disabled={pending}>Mark complete</button><button className="primary compact" name="intent" value="submitted" disabled={pending}>{pending ? "Saving…" : initialStatus === "submitted" ? "Update response" : "Submit response"}</button></div>
  </form>;
}
