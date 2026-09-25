"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900 p-8 text-center text-white shadow-2xl shadow-slate-950/40">
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300">500</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-4 text-base text-slate-300">The server hit an unexpected error. Please refresh and try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Refresh page
        </button>
        {error?.digest && <div className="mt-4 text-xs text-slate-400">{error.digest}</div>}
      </div>
    </main>
  );
}
