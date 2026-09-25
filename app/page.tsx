import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-page relative min-h-screen overflow-hidden px-6 py-7 sm:py-10">
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-orbit landing-orbit-one" aria-hidden="true" />
      <div className="landing-orbit landing-orbit-two" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="landing-mark flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white">L</div>
            <div>
              <div className="text-lg font-semibold tracking-[0.22em] text-slate-900">LOOP</div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-indigo-500">Signal intelligence</div>
            </div>
          </div>
          <Link href="/login" className="landing-signin btn btn-secondary">Sign in <span aria-hidden="true">↗</span></Link>
        </header>

        <section className="mt-16 grid items-center gap-14 lg:mt-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          <div className="relative z-10">
            <div className="landing-eyebrow">AI customer intelligence <span className="landing-live-dot" /> Live workspace signals</div>
            <h1 className="landing-title mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">Make every voice <span>move the product.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Turn scattered feedback into themes, trends, grounded answers and actionable customer intelligence for every team in your workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="landing-primary btn btn-primary">Open workspace <span aria-hidden="true">→</span></Link>
              <Link href="/signup" className="btn btn-secondary">Create workspace</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <span>✦ Real workspace analytics</span>
              <span>✦ Grounded AI answers</span>
              <span>✦ Role-based access</span>
            </div>
          </div>

          <div className="landing-stage" aria-label="Animated preview of workspace intelligence">
            <div className="landing-grid" aria-hidden="true" />
            <div className="landing-ring landing-ring-large" aria-hidden="true" />
            <div className="landing-ring landing-ring-small" aria-hidden="true" />
            <div className="landing-node landing-node-a" aria-hidden="true"><span>billing</span></div>
            <div className="landing-node landing-node-b" aria-hidden="true"><span>onboarding</span></div>
            <div className="landing-node landing-node-c" aria-hidden="true"><span>retention</span></div>
            <div className="landing-signal-line landing-signal-line-one" aria-hidden="true" />
            <div className="landing-signal-line landing-signal-line-two" aria-hidden="true" />

            <div className="landing-console">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-200">Workspace pulse</div>
                  <div className="mt-2 text-4xl font-bold tracking-tight text-white">+24.8%</div>
                  <div className="mt-1 text-xs text-slate-400">signal momentum · this week</div>
                </div>
                <div className="landing-status">● Uptrend</div>
              </div>
              <div className="landing-wave mt-6" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  ["Total feedback", "128"],
                  ["Negative", "20%"],
                  ["New this week", "15"],
                  ["Top theme", "Billing"],
                ].map(([label, value]) => (
                  <div key={label} className="landing-metric">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-float-card landing-float-card-top">
              <span className="landing-mini-icon">✦</span>
              <span><b>AI found a pattern</b><small>Checkout friction is rising</small></span>
            </div>
            <div className="landing-float-card landing-float-card-bottom">
              <span className="landing-avatar">L</span>
              <span><b>Grounded answer</b><small>12 sources connected</small></span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
