"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building2, Eye, EyeOff, LockKeyhole, UserPlus } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const [form, setForm] = useState({ name: "", email: "", password: "", workspace: "", otp: "" });
  const [otpRequired, setOtpRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  async function resendOtp() {
    if (resendSeconds || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, workspace: form.workspace || undefined, inviteToken: inviteToken || undefined, action: "request" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to resend the code");
      setResendSeconds(60);
      setError("A new verification code was sent.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the code");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        workspace: form.workspace || undefined,
        inviteToken: inviteToken || undefined,
        otp: form.otp || undefined,
        action: otpRequired ? "verify" : "request"
      };
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create account");
      if (data.requiresOtp) {
        setOtpRequired(true);
        setResendSeconds(60);
        setError("Verification code sent successfully. Check your email and enter the 6-digit code.");
        return;
      }

      const login = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        targetRole: data.role ?? "ADMIN",
        redirect: false
      });
      if (!login?.ok) throw new Error("Workspace created, but automatic sign-in failed. Please sign in manually.");
      router.replace("/dashboard");
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Could not create account");
    } finally {
      setLoading(false);
    }

  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_35%),linear-gradient(180deg,#eef4ff_0%,#f8fafc_48%,#f1f5f9_100%)] px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_40px_90px_rgba(15,23,42,0.14)] md:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden bg-slate-950 p-9 text-white md:flex md:flex-col md:justify-between">
          <div><div className="text-3xl font-semibold tracking-[0.24em] text-violet-300">LOOP</div><p className="mt-10 text-xs font-medium uppercase tracking-[0.24em] text-violet-200">Start with a private workspace</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Turn customer signals into decisions.</h1><p className="mt-4 text-sm leading-6 text-slate-300">Your workspace is isolated from every other company. Invite the right people and give each one the access they need.</p></div>
          <div className="space-y-3 text-sm text-slate-300"><div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-emerald-300" /> Workspace-scoped data</div><div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-sky-300" /> Role-based access</div></div>
        </aside>
        <section className="p-6 md:p-10">
          <div className="mb-7"><div className="text-[10px] font-medium uppercase tracking-[0.28em] text-violet-600">LOOP</div><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{inviteToken ? "Join your workspace" : "Create your workspace"}</h2><p className="mt-2 text-sm text-slate-500">{inviteToken ? "Set up your account to accept the invitation." : "The account creator becomes the workspace administrator."}</p></div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Full name<input className="input mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required /></label>
            <label className="block text-sm font-medium text-slate-700">Work email<input className="input mt-1" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" autoComplete="email" required /></label>
            {!inviteToken && <label className="block text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-1.5">Workspace name <Building2 className="h-3.5 w-3.5 text-slate-400" /></span><input className="input mt-1" value={form.workspace} onChange={(event) => setForm({ ...form, workspace: event.target.value })} placeholder="Acme customer intelligence" required /></label>}
            {!otpRequired && <label className="block text-sm font-medium text-slate-700">Password<div className="relative mt-1"><input className="input pr-11" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type={showPassword ? "text" : "password"} minLength={8} autoComplete="new-password" required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span></label>}
            {otpRequired && <label className="block text-sm font-medium text-slate-700">Email verification code<input className="input mt-1 tracking-[0.35em]" value={form.otp} onChange={(event) => setForm({ ...form, otp: event.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required /><span className="mt-1 block text-xs font-normal text-slate-500">Enter the 6-digit code sent by Resend to {form.email}.</span></label>}
            {error && <div role="alert" className={`rounded-xl border px-3 py-2 text-sm ${error.includes("sent successfully") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary mt-2 w-full">{loading ? (otpRequired ? "Verifying code..." : "Sending verification code...") : otpRequired ? "Verify and create workspace" : inviteToken ? "Join workspace" : "Create workspace"}</button>
            {otpRequired && <button type="button" onClick={() => void resendOtp()} disabled={loading || resendSeconds > 0} className="w-full text-sm font-medium text-violet-600 disabled:text-slate-400">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend OTP"}</button>}
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link className="font-semibold text-violet-600 hover:text-violet-500" href="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}

export default function Signup() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading signup...</main>}><SignupForm /></Suspense>;
}
