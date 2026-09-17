"use client";

import { useActionState, useState } from "react";
import { saveOverallComments, type ReportActionState } from "@/app/dashboard/report-cards/actions";

export function OverallCommentRegister({ periodId, classId, rows, locked }: { periodId: string; classId: string; rows: { id: string; name: string; admission: string; comment: string }[]; locked: boolean }) {
  const [state, action, pending] = useActionState(saveOverallComments, {} as ReportActionState), [values,setValues]=useState(rows);
  return <form action={action} className="overall-comment-form"><input type="hidden" name="period_id" value={periodId}/><input type="hidden" name="class_id" value={classId}/><input type="hidden" name="rows_json" value={JSON.stringify(values.map((row)=>({report_card_id:row.id,overall_comment:row.comment})))}/>{state.error&&<p className="form-error register-message" role="alert">{state.error}</p>}{state.success&&<p className="form-success register-message" role="status">{state.success}</p>}<div className="overall-comment-list">{values.map((row,index)=><label key={row.id}><span><b>{row.name}</b><small>{row.admission}</small></span><textarea rows={3} maxLength={1500} value={row.comment} onChange={(event)=>setValues((current)=>current.map((item,i)=>i===index?{...item,comment:event.target.value}:item))} disabled={locked} placeholder="Overall progress, strengths and a clear next step"/></label>)}</div>{!locked&&<footer className="marks-footer"><span>{values.filter((row)=>row.comment.trim()).length}/{values.length} comments added</span><button className="primary compact" disabled={pending}><span>{pending?"Saving…":"Save overall comments"}</span><span>→</span></button></footer>}</form>;
}
