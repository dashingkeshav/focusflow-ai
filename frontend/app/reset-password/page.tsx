"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { AuthBrand, AuthShell } from "@/components/auth/AuthShell";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const otp = searchParams.get("otp");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !email || !otp
      ? "Invalid or missing OTP. Please request a new password reset from the forgot password page."
      : null
  );
  const [success, setSuccess] = useState(false);

  const passwordErrors: string[] = [];
  if (newPassword) {
    if (newPassword.length < 8) passwordErrors.push("At least 8 characters");
    if (!/[a-z]/.test(newPassword)) passwordErrors.push("1 lowercase letter");
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push("1 uppercase letter");
    if (!/\d/.test(newPassword)) passwordErrors.push("1 number");
    if (!/[@$!%*?&]/.test(newPassword)) passwordErrors.push("1 special character (@$!%*?&)");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (passwordErrors.length > 0) {
      setError("Password does not meet the requirements");
      return;
    }
    if (!email || !otp) {
      setError("Invalid or missing OTP. Please start over.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await resetPassword(email, otp, newPassword, confirmPassword);

      if (data.success) {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-card p-8 md:p-10 shadow-2xl backdrop-blur-2xl">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
          Create new password
        </h1>
        <p className="text-sm text-gray-400 font-light">
          Enter a secure password to regain access to your workspace
        </p>
      </div>

      {success && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold">Password reset successfully!</p>
            <p className="mt-0.5 text-xs text-emerald-400 font-light">
              Redirecting you to sign in...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
          >
            <Lock className="h-3.5 w-3.5 text-[#FF4500]" /> New Password
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              id="new-password"
              placeholder="Enter new password"
              required
              disabled={loading || !email || !otp}
              className="form-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
          >
            <Lock className="h-3.5 w-3.5 text-[#FF4500]" /> Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPass ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              id="confirm-password"
              placeholder="Confirm new password"
              required
              disabled={loading || !email || !otp}
              className="form-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Password Requirements Checklist */}
        {newPassword && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-2">Password Requirements:</p>
            <ul className="space-y-1">
              {[
                { label: "At least 8 characters", valid: newPassword.length >= 8 },
                { label: "1 lowercase letter", valid: /[a-z]/.test(newPassword) },
                { label: "1 uppercase letter", valid: /[A-Z]/.test(newPassword) },
                { label: "1 number", valid: /\d/.test(newPassword) },
                { label: "1 special character (@$!%*?&)", valid: /[@$!%*?&]/.test(newPassword) },
              ].map((req, idx) => (
                <li
                  key={idx}
                  className={`flex items-center gap-2 ${req.valid ? "text-[#FF4500]" : "text-gray-500"}`}
                >
                  <span className="text-xs">{req.valid ? "✓" : "○"}</span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !otp || passwordErrors.length > 0}
          className="form-submit w-full mt-2"
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-8 border-t border-white/10 pt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#FF4500] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <AuthBrand />
      <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
