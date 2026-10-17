"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthShell, AuthBrand } from "@/app/login/page";

export default function RegisterPage() {
  const { register } = useAuth();
  const [loginHref, setLoginHref] = useState("/login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestedPlan = new URLSearchParams(window.location.search).get("plan");
      const next = new URLSearchParams(window.location.search).get("next");
      if (requestedPlan === "pro" || requestedPlan === "student_pro") {
        setLoginHref(`/login?next=${encodeURIComponent("/billing/checkout?plan=pro")}`);
        return;
      }
      if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        setLoginHref(`/login?next=${encodeURIComponent(next)}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const passwordStrength = (p: string) => {
    if (p.length === 0) return null;
    if (p.length < 6) return { label: "Too short", color: "bg-rose-500", text: "text-rose-400", width: "25%" };
    if (p.length < 8) return { label: "Weak", color: "bg-amber-500", text: "text-amber-400", width: "50%" };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: "Moderate", color: "bg-orange-500", text: "text-orange-400", width: "70%" };
    return { label: "Strong", color: "bg-[#FF4500]", text: "text-[#FF4500]", width: "100%" };
  };

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await register(name.trim(), email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Registration failed.");
    }
  };

  return (
    <AuthShell>
      <AuthBrand />

      <div className="rounded-3xl border border-white/10 bg-[#0d0d0d]/85 p-8 md:p-10 shadow-2xl shadow-black/80 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-gray-400 font-light">
          Start planning smarter focus sessions in minutes.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="register-name"
              className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
            >
              <User className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              disabled={loading}
              className="form-input"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="register-email"
              className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
            >
              <Mail className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              required
              disabled={loading}
              autoComplete="email"
              className="form-input"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="register-password"
              className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
            >
              <Lock className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                disabled={loading}
                autoComplete="new-password"
                className="form-input pr-11"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-white"
              >
                {showPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>

            {strength && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <span className={`text-[11px] font-mono ${strength.text}`}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="register-confirm"
              className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-300"
            >
              <CheckCircle2
                className={`h-3.5 w-3.5 ${confirm && confirm === password ? "text-[#FF4500]" : "text-gray-500"}`}
                aria-hidden
              />
              Confirm Password
            </label>
            <input
              id="register-confirm"
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={loading}
              autoComplete="new-password"
              className="form-input"
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="form-submit mt-3 flex items-center justify-center gap-2 w-full"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Creating account…
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-gray-400 font-light">
            Already have an account?{" "}
            <Link
              href={loginHref}
              className="font-bold text-[#FF4500] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
