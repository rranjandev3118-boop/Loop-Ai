"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const roles = [
  { key: "ADMIN", label: "Admin Access", note: "Full workspace control", accent: "bg-violet-500/10 text-violet-700 border-violet-200" },
  { key: "ANALYST", label: "Analyst Access", note: "Feedback & analysis", accent: "bg-sky-500/10 text-sky-700 border-sky-200" },
  { key: "VIEWER", label: "Viewer Access", note: "Read-only insights", accent: "bg-emerald-500/10 text-emerald-700 border-emerald-200" }
] as const;

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]["key"]>("ADMIN");
  const [email, setEmail] = useState("admin@loop.demo");
  const [password, setPassword] = useState("LoopDemo123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const router = useRouter();

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
      const response = await fetch("/api/auth/login/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
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
    if (loading) return;
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (otpRequired) {
        const verifyResponse = await fetch("/api/auth/login/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp, targetRole: selectedRole }) });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verifyData.error || "Unable to verify the code");
      } else {
        const requestResponse = await fetch("/api/auth/login/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, targetRole: selectedRole }) });
        const requestData = await requestResponse.json();
        if (!requestResponse.ok) throw new Error(requestData.error || "Invalid credentials or role mismatch.");
        if (requestData.requiresOtp) {
          setOtpRequired(true);
          setResendSeconds(60);
          setError("Verification code sent successfully. Check your email.");
          return;
        }
      }
      const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, targetRole: selectedRole, redirect: false });

      if (result?.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setError("Invalid credentials or role mismatch.");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }

  }

  return (
    <main className="login-page relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div className="login-particles" aria-hidden="true" />
      <div className="login-orbit login-orbit-one" aria-hidden="true" />
      <div className="login-orbit login-orbit-two" aria-hidden="true" />
      <div className="login-scene" aria-hidden="true">
        <div className="login-scene-core" />
        <div className="login-scene-ring login-scene-ring-one" />
        <div className="login-scene-ring login-scene-ring-two" />
        <span className="login-scene-node login-scene-node-one" />
        <span className="login-scene-node login-scene-node-two" />
        <span className="login-scene-node login-scene-node-three" />
      </div>
      <div className="login-shell grid w-full max-w-5xl overflow-hidden rounded-[30px] md:grid-cols-[1.05fr_0.95fr]">
        <div className="login-visual relative flex min-h-[250px] flex-col justify-between p-6 text-white md:min-h-[610px] md:p-8">
          <div className="login-visual-grid" aria-hidden="true" />
          <div className="login-holo" aria-hidden="true">
            <div className="login-holo-ring login-holo-ring-one" />
            <div className="login-holo-ring login-holo-ring-two" />
            <div className="login-holo-core"><span>LOOP</span></div>
            <div className="login-holo-label">LIVE SIGNAL <i /></div>
          </div>
          <div>
            <Link href="/" className="relative z-10 inline-flex items-center gap-3 text-2xl font-semibold tracking-[0.24em] text-white">
              <span className="login-mark">L</span> LOOP
            </Link>
            <div className="login-visual-copy relative z-10 mt-16">
              <div className="text-[10px] uppercase tracking-[0.26em] text-violet-200">Secure access</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your customer signal, in focus.</h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">Every role is verified server-side before it can affect customer data, analytics, or administrative controls.</p>
            </div>
          </div>

          <div className="relative z-10 grid gap-3">
            {roles.map((role) => (
              <div key={role.key} className={`login-role-card rounded-2xl border p-3 ${role.accent}`}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{role.label}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em]">{role.key}</div>
                </div>
                <div className="mt-1 text-xs opacity-80">{role.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="login-form-panel p-6 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-600">Welcome back</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Enter your workspace</h2>
              <p className="mt-2 text-sm text-slate-500">Choose your access level to continue.</p>
            </div>
            <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] ${roles.find((role) => role.key === selectedRole)?.accent}`}>
              {selectedRole}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setSelectedRole(role.key)}
                className={`login-role-select rounded-2xl border px-3 py-3 text-left transition ${
                  selectedRole === role.key ? "border-violet-400 bg-violet-50 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-slate-800">{role.label}</div>
                <div className="mt-1 text-xs text-slate-500">{role.note}</div>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={otpRequired} />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {otpRequired && <label className="block text-sm font-medium text-slate-700">Email verification code<input className="input mt-1 tracking-[0.35em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required /></label>}

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
              <ShieldCheck className="h-4 w-4" />
              Backend verifies your workspace role before access is granted.
            </div>

            <button type="submit" disabled={loading} className="login-submit btn btn-primary w-full">
              {loading ? (otpRequired ? "Verifying code..." : "Checking credentials...") : otpRequired ? "Verify and sign in" : `Continue as ${selectedRole}`}
            </button>
            {otpRequired && <button type="button" onClick={() => void resendOtp()} disabled={loading || resendSeconds > 0} className="mt-3 w-full text-sm font-medium text-violet-600 disabled:text-slate-400">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend OTP"}</button>}
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Demo: admin@loop.demo / LoopDemo123!</span>
            <Link href="/signup" className="font-medium text-violet-600 hover:text-violet-500">Create workspace</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
