"use client";

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { RoleBadge } from '../ui/badge';

interface RoleLoginFormProps {
  targetRole: string;
  roleName: string;
  roleIcon: string;
  roleDescription: string;
}

export function RoleLoginForm({
  targetRole,
  roleName,
  roleIcon,
  roleDescription
}: RoleLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    if (loading) return;
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (otpRequired) {
        const verifyResponse = await fetch('/api/auth/login/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, targetRole }) });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verifyData.error || 'Unable to verify the code');
      } else {
        const requestResponse = await fetch('/api/auth/login/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, targetRole }) });
        const requestData = await requestResponse.json();
        if (!requestResponse.ok) throw new Error(requestData.error || 'Invalid credentials or role mismatch.');
        if (requestData.requiresOtp) {
          setOtpRequired(true);
          setResendSeconds(60);
          setError('Verification code sent successfully. Check your email.');
          return;
        }
      }
      const result = await signIn('credentials', { email: email.trim().toLowerCase(), password, targetRole, redirect: false });

      if (!result?.ok) {
        // Check if the error is due to role mismatch
        if (result?.error?.includes('role') || result?.error?.includes('FORBIDDEN')) {
          setError(`These credentials don't have ${roleName.toLowerCase()} access. Please use the correct account.`);
        } else {
          setError('Invalid credentials or unavailable authentication service.');
        }
        return;
      }

      const response = await fetch('/api/auth/verify-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole })
        });

      let data: { success?: boolean; error?: string } = {};
      try {
        data = await response.json();
      } catch {
        setError('The role verification response was invalid. Please try again.');
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error || `Role verification failed for ${roleName}`);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to reach the authentication service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  async function resendOtp() {
    if (resendSeconds || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to resend the code');
      setResendSeconds(60);
      setError('A new verification code was sent.');
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend the code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">{roleIcon}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LOOP</h1>
          <p className="text-gray-600 mt-2">Customer Feedback Intelligence</p>
        </div>

        <div className="card p-8 animate-slide-up">
          <div className="text-center mb-6">
            <RoleBadge role={targetRole} />
            <h2 className="text-2xl font-bold text-gray-900 mt-3">{roleName} Access</h2>
            <p className="text-sm text-gray-500 mt-1">{roleDescription}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={otpRequired}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {otpRequired && (
              <Input
                label="Email verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {otpRequired ? 'Verify and sign in' : `Sign in as ${roleName}`}
            </Button>
            {otpRequired && <button type="button" onClick={() => void resendOtp()} disabled={loading || resendSeconds > 0} className="mt-3 w-full text-sm font-medium text-indigo-600 disabled:text-gray-400">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend OTP'}</button>}
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              🔒 Secure authentication with role verification
            </p>
          </div>

          <div className="mt-4 text-center">
            <a
              href="/login"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              ← Back to role selection
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo credentials: admin@loop.demo / LoopDemo123!
          </p>
        </div>
      </div>
    </div>
  );
}