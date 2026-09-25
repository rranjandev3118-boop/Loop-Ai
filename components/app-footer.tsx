import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

export function AppFooter({ role }: { role: string }) {
  return (
    <footer className="app-footer border-t px-5 py-6 md:px-7">
      <div className="flex flex-col gap-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold text-slate-800"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">L</span> LOOP</div>
          <p className="mt-1 text-xs">Customer feedback intelligence for teams that close the loop.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          <Link href="/reports" className="hover:text-slate-900">Reports</Link>
          <Link href="/forbidden" className="hover:text-slate-900">Security</Link>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Workspace protected</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5 text-violet-500" /> {role} workspace · {new Date().getFullYear()} LOOP</div>
      </div>
    </footer>
  );
}
