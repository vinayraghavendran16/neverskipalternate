"use client";

import { useState } from "react";
import { setPlatformSchoolArchived } from "../../actions";

export function ArchiveSchoolForm({organizationId,schoolName}:{organizationId:string;schoolName:string}){
  const [confirmation,setConfirmation]=useState("");
  return <form action={setPlatformSchoolArchived} className="archive-school-form">
    <input type="hidden" name="organization_id" value={organizationId}/>
    <input type="hidden" name="archived" value="true"/>
    <p>School access will stop immediately. Academic, financial and audit records remain retained, and the platform owner can restore the school.</p>
    <label className="field">Reason<input name="reason" maxLength={500} placeholder="For example: contract ended"/></label>
    <label className="field">Type <b>{schoolName}</b> to confirm<input name="confirmation" required autoComplete="off" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label>
    <input type="hidden" name="school_name" value={schoolName}/>
    <button className="danger-button" disabled={confirmation!==schoolName}>Delete school safely</button>
  </form>;
}

export function RestoreSchoolForm({organizationId}:{organizationId:string}){
  return <form action={setPlatformSchoolArchived}>
    <input type="hidden" name="organization_id" value={organizationId}/>
    <input type="hidden" name="archived" value="false"/>
    <button className="secondary compact">Restore school</button>
  </form>;
}
