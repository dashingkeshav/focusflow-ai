"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Lock } from "lucide-react";
import { AuthBrand, AuthShell } from "@/components/auth/AuthShell";
import { forgotPassword, verifyOTP } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await forgotPassword(email.trim());
      if (data.success) {
        setStep("otp");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.message || "Failed to send reset code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await verifyOTP(email.trim(), otp);
      if (data.success) {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setError(null);
  };

  return (
    <AuthShell>
      <AuthBrand />
      <div className="rounded-3xl border border-white/10 bg-[#0d0d0d]/85 p-8 md:p-10 shadow-2xl shadow-black/80 backdrop-blur-2xl">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
            Reset password
          </h1>
          <p className="text-sm text-gray-400 font-light">
            {step === "email"
              ? "Enter your email to receive a 6-digit reset code"
              : "Enter the code sent to your email"}
          </p>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-semibold">Reset code sent!</p>
              <p className="mt-0.5 text-xs text-emerald-400 font-light">
                Check your email for a 6-digit code. It expires in 15 minutes.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === "email" && (
          <form onSubmit={handleRequestOTP} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
              >
                <Mail className="h-3.5 w-3.5 text-[#FF4500]" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="forgot-email"
                placeholder="alex@company.com"
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="form-submit w-full"
            >
              {loading ? "Sending Reset Code..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {/* Step 2: OTP Input */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="forgot-otp"
                className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
              >
                <Lock className="h-3.5 w-3.5 text-[#FF4500]" /> 6-digit Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                id="forgot-otp"
                placeholder="000000"
                maxLength={6}
                required
                className="form-input text-center font-mono text-2xl tracking-widest"
              />
              <p className="mt-1 text-xs text-gray-500 font-mono">
                Enter the 6-digit code received in your inbox
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="form-submit w-full"
            >
              {loading ? "Verifying Code..." : "Verify & Continue"}
            </button>

            <button
              type="button"
              onClick={handleBackToEmail}
              className="btn btn-ghost w-full justify-center"
            >
              Change Email
            </button>
          </form>
        )}

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
    </AuthShell>
  );
}
