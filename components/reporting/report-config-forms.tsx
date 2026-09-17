"use client";

import { useActionState } from "react";
import { createReportingPeriod, createReportTemplate, type ReportActionState } from "@/app/dashboard/report-cards/actions";

const initial: ReportActionState = {};

export function TemplateForm() {
  const [state, action, pending] = useActionState(createReportTemplate, initial);
  return <form action={action} className="report-config-form"><div className="split-fields"><label className="field">Template name<input name="name" required maxLength={120} placeholder="Primary term report"/></label><label className="field">Printed title<input name="title" required maxLength={160} placeholder="Term Progress Report"/></label></div><label className="field">Grade bands<textarea name="grading_scale_text" rows={5} defaultValue={'A | Excellent\nB | Strong\nC | Secure\nD | Developing'} required aria-describedby="grade-band-help"/></label><p id="grade-band-help" className="field-help">Enter one band per line using “grade | description”. You can use letters, numbers or school-specific codes.</p><div className="report-option-grid"><label><input type="checkbox" name="show_percentage" defaultChecked/> Show percentages</label><label><input type="checkbox" name="show_attendance" defaultChecked/> Show attendance</label><label><input type="checkbox" name="show_teacher_comments" defaultChecked/> Show teacher comments</label></div>{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}<button className="primary" disabled={pending}>{pending?"Creating…":"Create template"}</button></form>;
}

export function PeriodForm({ years, templates }: { years: { id: string; name: string }[]; templates: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createReportingPeriod, initial);
  return <form action={action} className="report-config-form"><div className="split-fields"><label className="field">Academic year<select name="academic_year_id" required defaultValue=""><option value="" disabled>Choose year</option>{years.map((row)=><option value={row.id} key={row.id}>{row.name}</option>)}</select></label><label className="field">Template<select name="template_id" required defaultValue=""><option value="" disabled>Choose template</option>{templates.map((row)=><option value={row.id} key={row.id}>{row.name}</option>)}</select></label></div><label className="field">Period name<input name="name" required maxLength={120} placeholder="Term 1 · 2026–27"/></label><div className="split-fields"><label className="field">Starts<input type="date" name="starts_on" required/></label><label className="field">Ends<input type="date" name="ends_on" required/></label></div>{state.error&&<p className="form-error" role="alert">{state.error}</p>}<button className="primary" disabled={pending||!years.length||!templates.length}>{pending?"Creating…":"Create reporting period"}</button></form>;
}
