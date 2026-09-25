export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_35%),#f8fafc] px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-lg shadow-slate-200/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">L</div>
        <div>
          <div className="text-sm font-semibold tracking-[0.18em] text-slate-900">LOOP</div>
          <div className="mt-1 text-xs text-slate-500">Preparing your workspace…</div>
        </div>
        <div className="ml-3 h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    </main>
  );
}