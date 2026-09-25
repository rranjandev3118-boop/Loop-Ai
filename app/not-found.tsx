import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900 p-8 text-center text-white shadow-2xl shadow-slate-950/40">
        <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-violet-300">404</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-base text-slate-300">The workspace path you requested does not exist, or it is outside the current tenant context.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
