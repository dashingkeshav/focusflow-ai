'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Cpu, ArrowRight, Lock, Mail, User, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = (p: string) => {
    if (p.length === 0) return null;
    if (p.length < 6) return { label: 'Too short', color: 'bg-rose-500', width: '25%' };
    if (p.length < 8) return { label: 'Weak', color: 'bg-amber-500', width: '50%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Moderate', color: 'bg-yellow-400', width: '70%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await register(name.trim(), email, password, confirm);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/12 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6">
          {/* Brand */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">FocusFlow <span className="text-cyan-400">AI</span></span>
            </Link>
            <h1 className="text-2xl font-extrabold text-white">Create Account 🚀</h1>
            <p className="text-xs text-gray-400">Join FocusFlow AI and start optimizing your study sessions</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength bar */}
              {strength && (
                <div className="space-y-1">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <span className={`text-[10px] font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${confirm && confirm === password ? 'text-emerald-400' : 'text-cyan-400'}`} /> Confirm Password
              </label>
              <input
                id="register-confirm"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                className={`w-full bg-white/5 border rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                  confirm && confirm !== password
                    ? 'border-rose-500/60 focus:ring-rose-500/30'
                    : 'border-white/10 focus:border-violet-500 focus:ring-violet-500/40'
                }`}
              />
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating Account...</span>
              ) : (
                <><span>Create My Account</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 font-semibold hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
