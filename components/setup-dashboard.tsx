export function SetupDashboard() {
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>Northstar</span></div>
        <div className="login-copy"><small>PRODUCTION FOUNDATION</small><h1>Ready to connect.</h1><p>The application shell, tenant model, authentication boundary, audit system, storage policies and database migrations are in place.</p></div>
        <span className="login-foot">No secrets have been committed.</span>
      </section>
      <section className="login-panel">
        <div className="login-form"><div><span className="eyebrow" style={{color:"var(--green-2)"}}>SETUP REQUIRED</span><h2>Connect Supabase</h2><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your project values, and run the database migration.</p></div><p className="setup-note"><strong>Quick preview:</strong> the original interactive product prototype is preserved at <a href="/prototype/index.html"><u>/prototype/index.html</u></a>.</p><a className="primary" href="/prototype/index.html"><span>Open UX prototype</span><span>→</span></a></div>
      </section>
    </main>
  );
}
