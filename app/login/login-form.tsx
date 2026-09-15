"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ configured, next }: { configured: boolean; next: string }) {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form className="login-form" action={action}>
      <div>
        <span className="eyebrow" style={{ color: "var(--green-2)" }}>WELCOME BACK</span>
        <h2>Start your school day</h2>
        <p>Use the account invited by your school administrator.</p>
      </div>
      {!configured && <p className="setup-note"><strong>Setup mode:</strong> add the Supabase values from <code>.env.example</code> to <code>.env.local</code>. The original UX prototype remains available at <a href="/prototype/index.html"><u>/prototype</u></a>.</p>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <input type="hidden" name="next" value={next} />
      <label className="field">School email<input name="email" type="email" autoComplete="email" placeholder="name@school.edu" required /></label>
      <label className="field">Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button className="primary" type="submit" disabled={pending || !configured}><span>{pending ? "Signing in…" : "Sign in"}</span><span>→</span></button>
      <p style={{ fontSize: 11, textAlign: "center" }}>Invite-only access · Contact your school administrator for help.</p>
    </form>
  );
}
