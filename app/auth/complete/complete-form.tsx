"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseInvitationFragment } from "@/lib/auth/invitation";
import { completeAccount } from "./actions";

export function CompleteAccountForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeAccount, { error: "" });
  const [sessionState, setSessionState] = useState<"loading" | "ready" | "expired" | "missing">("loading");
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    let active = true;
    async function acceptInvitation() {
      const fragment = parseInvitationFragment(window.location.hash);
      if (fragment.kind === "error") {
        if (active) setSessionState("expired");
        return;
      }
      const supabase = createClient();
      if (fragment.kind === "session") {
        const { error } = await supabase.auth.setSession({ access_token: fragment.accessToken, refresh_token: fragment.refreshToken });
        if (error) { if (active) setSessionState("expired"); return; }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setSessionState("missing"); return; }
      setName(String(user.user_metadata?.full_name || defaultName));
      setSessionState("ready");
    }
    acceptInvitation();
    return () => { active = false; };
  }, [defaultName]);

  if (sessionState === "loading") return <p className="auth-status" role="status">Verifying your invitation…</p>;
  if (sessionState === "expired") return <div className="auth-status auth-error" role="alert"><h2>This invitation is no longer valid.</h2><p>It may have expired or already been used. Ask the Northstar platform operator to resend it from the school directory.</p><Link className="secondary" href="/login">Return to sign in</Link></div>;
  if (sessionState === "missing") return <div className="auth-status auth-error" role="alert"><h2>Open the link from your invitation email.</h2><p>No invitation session was found in this browser. If you already created a password, sign in normally.</p><Link className="secondary" href="/login">Go to sign in</Link></div>;
  return <form action={action} className="login-form"><label>Full name<input name="full_name" value={name} onChange={(event)=>setName(event.target.value)} required autoComplete="name"/></label><label>Create password<input name="password" type="password" minLength={10} required autoComplete="new-password"/><small>Use at least 10 characters.</small></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="primary" disabled={pending}>{pending ? "Saving…" : "Complete account"}</button></form>;
}
