"use client";
import { useActionState } from "react";
import { saveNotificationPreferences,type NotificationState } from "@/app/dashboard/notifications/actions";

export function NotificationPreferencesForm({preferences}:{preferences:Record<string,boolean>}){
  const[state,action,pending]=useActionState(saveNotificationPreferences,{} as NotificationState);
  return <form className="preference-form" action={action}>
    <label><input type="checkbox" name="channels" value="in_app" defaultChecked={preferences.in_app}/><span><b>In-app alerts</b><small>Show unread notices in Northstar.</small></span></label>
    <label><input type="checkbox" name="channels" value="email" defaultChecked={preferences.email}/><span><b>Email</b><small>Consent to email delivery when a provider is connected.</small></span></label>
    <label><input type="checkbox" name="channels" value="sms" defaultChecked={preferences.sms}/><span><b>SMS</b><small>Consent to SMS delivery when a provider is connected.</small></span></label>
    <p className="provider-note" role="note">Email and SMS delivery are awaiting provider configuration. Enabling them records consent but sends nothing externally yet.</p>
    {state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}
    <button className="primary" disabled={pending}>{pending?"Saving…":"Save preferences"}</button>
  </form>;
}

