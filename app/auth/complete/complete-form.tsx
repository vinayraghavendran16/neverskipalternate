"use client";
import { useActionState } from "react";
import { completeAccount } from "./actions";
export function CompleteAccountForm({ defaultName }: { defaultName: string }) { const [state, action, pending] = useActionState(completeAccount, { error: "" }); return <form action={action} className="login-form"><label>Full name<input name="full_name" defaultValue={defaultName} required autoComplete="name"/></label><label>Create password<input name="password" type="password" minLength={10} required autoComplete="new-password"/><small>Use at least 10 characters.</small></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary" disabled={pending}>{pending ? "Saving…" : "Complete account"}</button></form>; }
