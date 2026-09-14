import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth/context";
import { logout } from "./actions";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const client = await createClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (user && await getUserContext()) redirect(safeNextPath(params.next || "/dashboard"));
  if (user) return <main className="content"><h1>Your school access is not active.</h1><p>Ask your school administrator to activate your membership, or sign in with another account.</p><form action={logout}><button className="secondary">Sign out</button></form></main>;
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Northstar</span></div>
        <div className="login-copy"><small>THE SCHOOL DAY, SIMPLIFIED</small><h1>Less admin.<br />More teaching.</h1><p>A secure, role-aware workspace for every task that keeps a school moving.</p></div>
        <span className="login-foot">Northstar School OS · Production foundation</span>
      </section>
      <section className="login-panel">{params.error === "callback" && <p role="alert" className="form-error">This sign-in link expired or could not be verified. Request a new invitation from your administrator.</p>}<LoginForm configured={isSupabaseConfigured()} next={params.next || "/dashboard"} /></section>
    </main>
  );
}
