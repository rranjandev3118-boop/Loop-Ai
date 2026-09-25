import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-800 bg-slate-900 p-8 text-center text-white shadow-2xl shadow-slate-950/40">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-rose-300">403 forbidden</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Access restricted</h1>
        <p className="mt-4 text-base text-slate-300">You don&apos;t have permission to access this area. Your authenticated role and workspace context are being checked before every protected action.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
