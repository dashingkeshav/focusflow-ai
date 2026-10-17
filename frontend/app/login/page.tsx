"use client";

import React, { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand";

export function AuthBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Radiant Focus & Space Atmosphere Auras */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-[#FF4500]/12 blur-[160px]" />
      <div className="absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[150px]" />
    </div>
  );
}

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-transparent px-4 py-14 sm:py-20 text-white selection:bg-[#FF4500] selection:text-white">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-8 flex items-center justify-center">
      <BrandWordmark size="lg" href="/" />
    </div>
  );
}

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [nextPath, setNextPath] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        setNextPath(next);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password;

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await login(cleanEmail, cleanPassword);
      if (!result.success) {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || authLoading;

  return (
    <AuthShell>
      <AuthBrand />

      <div className="rounded-3xl border border-white/10 bg-[#0d0d0d]/85 p-8 md:p-10 shadow-2xl shadow-black/80 backdrop-blur-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-gray-400 font-light">
          Sign in to your FocusFlow AI workspace.
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

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-300"
            >
              <Mail className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex@company.com"
              disabled={isBusy}
              required
              className="form-input"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="flex items-center gap-2 text-xs font-semibold text-gray-300"
              >
                <Lock className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-mono text-[#FF4500] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                disabled={isBusy}
                required
                className="form-input pr-11"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isBusy}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={isBusy}
            className="form-submit flex items-center justify-center gap-2 w-full mt-2"
          >
            {isBusy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Signing in…
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-gray-400 font-light">
            Don&apos;t have an account?{" "}
            <Link
              href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"}
              className="font-bold text-[#FF4500] hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-300 transition-colors">
          ← Back to FocusFlow AI
        </Link>
      </p>
    </AuthShell>
  );
}
