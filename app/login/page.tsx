import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Northstar</span></div>
        <div className="login-copy"><small>THE SCHOOL DAY, SIMPLIFIED</small><h1>Less admin.<br />More teaching.</h1><p>A secure, role-aware workspace for every task that keeps a school moving.</p></div>
        <span className="login-foot">Northstar School OS · Production foundation</span>
      </section>
      <section className="login-panel"><LoginForm configured={isSupabaseConfigured()} next={params.next || "/dashboard"} /></section>
    </main>
  );
}
