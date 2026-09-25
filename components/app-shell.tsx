"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowUpRight, BarChart3, FileText, Gauge, LayoutDashboard, LogOut, Menu, MessageSquareQuote, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useState } from "react";
import { roleMeta, roleNavigation, type RoleKey } from "@/lib/role-config";
import { RoleSwitcher } from "@/components/role-switcher";
import { AppFooter } from "@/components/app-footer";
import { useTheme } from "@/components/theme-provider";

const iconMap = {
  Dashboard: LayoutDashboard,
  Feedback: MessageSquareQuote,
  Analytics: BarChart3,
  "Ask LOOP": Sparkles,
  Reports: FileText,
  Team: Users,
  Settings: ShieldCheck
};

export function AppShell({
  user,
  currentRole,
  workspaceName,
  children
}: {
  user: { email: string; role: RoleKey; name?: string };
  currentRole: RoleKey;
  workspaceName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = roleNavigation[currentRole];

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
    router.refresh();
  }

  return (
    <div className={`app-shell app-shell-${currentRole.toLowerCase()} app-shell-${theme} min-h-screen text-slate-900`}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:flex-row lg:gap-6 lg:px-6">
        <div className="app-mobile-bar mb-3 flex items-center justify-between rounded-2xl border p-3 shadow-sm lg:hidden">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Go to LOOP home" className="flex items-center gap-2">
              <div className="app-brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">L</div>
              <span className="font-semibold tracking-[0.18em] text-slate-900">LOOP</span>
            </Link>
          </div>
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen((open) => !open)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <aside className={`app-sidebar ${mobileOpen ? "flex" : "hidden"} w-full flex-col overflow-y-auto rounded-[28px] border p-5 text-white shadow-[0_40px_80px_rgba(2,6,23,0.28)] lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-2rem)] lg:w-[280px]`}>
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" aria-label="Go to LOOP home" className="inline-block text-2xl font-bold tracking-tight transition hover:text-violet-200">LOOP</Link>
              <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">Customer intelligence</div>
            </div>
            <div className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.18em] ${roleMeta[currentRole].soft} bg-white/5 text-white border-white/10`}>
              {currentRole}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Workspace</div>
            <div className="mt-2 text-lg font-semibold">{workspaceName}</div>
            <div className="mt-1 text-sm text-slate-400">{user.email}</div>
          </div>

          <nav className="mt-8 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.label as keyof typeof iconMap] ?? Gauge;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-2xl border px-3 py-3 transition ${
                    active
                      ? "border-violet-400/60 bg-violet-500/10 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.22)]"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/4"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 pt-6">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure access
            </div>
            <div className="mt-2 text-xs leading-5 text-violet-100">Workspace and role access are verified on every protected request.</div>
            </div>
          </div>
        </aside>

        <div className="app-content flex-1 rounded-[28px] border shadow-[0_30px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <header className="app-header flex flex-col gap-4 border-b px-5 py-4 md:flex-row md:items-center md:justify-between md:px-7">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">LOOP workspace</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{currentRole === "ADMIN" ? "Workspace Command Center" : currentRole === "ANALYST" ? "Feedback Intelligence Workspace" : "Customer Insights"}</div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <RoleSwitcher currentRole={currentRole} userEmail={user.email} />
              <button
                type="button"
                onClick={() => handleSignOut()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          <main className="min-h-[calc(100vh-96px)] p-4 sm:p-5 md:p-7">{children}</main>
          <AppFooter role={currentRole} />
        </div>
      </div>
    </div>
  );
}
