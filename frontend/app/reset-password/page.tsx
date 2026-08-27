'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Cpu, ArrowLeft, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

/* -------------------------------------------------------
   Inner component — uses useSearchParams safely inside
   a Suspense boundary (required by Next.js App Router).
------------------------------------------------------- */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const otp = searchParams.get('otp');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !email || !otp
      ? 'Invalid or missing OTP. Please request a new password reset from the forgot password page.'
      : null
  );
  const [success, setSuccess] = useState(false);

  // Validate password in real-time — derived, no useEffect needed
  const passwordErrors: string[] = [];
  if (newPassword) {
    if (newPassword.length < 8) passwordErrors.push('At least 8 characters');
    if (!/[a-z]/.test(newPassword)) passwordErrors.push('1 lowercase letter');
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push('1 uppercase letter');
    if (!/\d/.test(newPassword)) passwordErrors.push('1 number');
    if (!/[@$!%*?&]/.test(newPassword)) passwordErrors.push('1 special character (@$!%*?&)');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordErrors.length > 0) {
      setError('Password does not meet the requirements');
      return;
    }
    if (!email || !otp) {
      setError('Invalid or missing OTP. Please start over.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6">
      {/* Brand */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">
            FocusFlow <span className="text-cyan-400">AI</span>
          </span>
        </Link>
        <h1 className="text-2xl font-extrabold text-white">Create New Password</h1>
        <p className="text-xs text-gray-400">
          Enter a strong password to regain access to your account
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Password reset successfully!</p>
            <p className="text-emerald-200/70 mt-1">
              You can now login with your new password. Redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> New Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
              />
              <button
                type="button"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="space-y-1 mt-2 p-2 bg-white/5 rounded-lg border border-white/5">
                <p className="text-gray-400 font-medium">Password requirements:</p>
                {passwordErrors.length > 0 ? (
                  <ul className="space-y-1 text-rose-300/70">
                    {passwordErrors.map((err, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-rose-400 rounded-full" />
                        {err}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-300/70 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                    Password meets all requirements ✓
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-gray-300 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" /> Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
              />
              <button
                type="button"
                aria-label={showConfirmPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              loading ||
              passwordErrors.length > 0 ||
              !newPassword ||
              !confirmPassword
            }
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      {/* Back to Login */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold hover:underline group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Page export — wraps the form in Suspense so Next.js
   can statically pre-render this route.
------------------------------------------------------- */
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/12 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-gray-400">
              Loading...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
