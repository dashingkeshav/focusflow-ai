'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cpu, ArrowLeft, Mail, AlertCircle, CheckCircle, Lock } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to reset password page with email and OTP
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/12 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Card */}
        <div className="glass-card rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Brand */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">FocusFlow <span className="text-cyan-400">AI</span></span>
            </Link>
            <h1 className="text-2xl font-extrabold text-white">Reset Password 🔐</h1>
            <p className="text-xs text-gray-400">
              {step === 'email' ? 'Enter your email to receive a reset code' : 'Enter the code sent to your email'}
            </p>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reset code sent!</p>
                <p className="text-emerald-200/70 mt-1">Check your email for a 6-digit code. It expires in 15 minutes.</p>
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

          {/* Step 1: Email Input */}
          {step === 'email' && (
            <form onSubmit={handleRequestOTP} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending Reset Code...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP Input */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" /> 6-Digit Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 text-center font-mono text-2xl tracking-widest focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
                <p className="text-gray-400 text-xs mt-2">Enter the 6-digit code from your email</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying Code...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={handleBackToEmail}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all"
              >
                Change Email
              </button>
            </form>
          )}

          {/* Back to Login */}
          <div className="text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold hover:underline group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
