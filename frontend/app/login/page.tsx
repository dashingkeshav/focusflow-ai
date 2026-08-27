"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Cpu,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
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
      const result = await login(
        cleanEmail,
        cleanPassword
      );

      if (!result.success) {
        setError(
          result.error ||
            "Login failed. Please check your credentials."
        );
      }

      // No router.push() here.
      // auth.tsx already redirects to /dashboard
      // after successful login.
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || authLoading;

  return (
    <main className="min-h-screen bg-[#07080c] text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* ================================
          BACKGROUND GLOW
      ================================= */}

      <div
        className="pointer-events-none absolute -top-32 -left-32
        w-[520px] h-[520px]
        rounded-full
        bg-violet-600/15
        blur-[150px]"
      />

      <div
        className="pointer-events-none absolute -bottom-32 -right-32
        w-[500px] h-[500px]
        rounded-full
        bg-cyan-500/10
        blur-[150px]"
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "45px 45px",
        }}
      />

      {/* ================================
          LOGIN CONTAINER
      ================================= */}

      <div className="relative z-10 w-full max-w-md">

        {/* Brand */}

        <div className="text-center mb-6">

          <Link
            href="/"
            className="inline-flex items-center gap-3 group"
          >
            <div
              className="w-12 h-12 rounded-2xl
              bg-gradient-to-br
              from-violet-600
              via-purple-600
              to-cyan-500
              flex items-center justify-center
              shadow-xl
              shadow-violet-600/20
              group-hover:scale-105
              transition-transform duration-200"
            >
              <Cpu className="w-6 h-6 text-white" />
            </div>

            <div className="text-left">

              <div className="text-xl font-extrabold tracking-tight">
                FocusFlow{" "}
                <span className="text-cyan-400">
                  AI
                </span>
              </div>

              <div className="text-[11px] text-gray-500">
                Distraction Intelligence Platform
              </div>

            </div>

          </Link>

        </div>


        {/* ================================
            CARD
        ================================= */}

        <div
          className="rounded-3xl
          border border-white/10
          bg-white/[0.045]
          backdrop-blur-xl
          shadow-2xl
          shadow-black/40
          p-7 sm:p-8"
        >

          {/* Header */}

          <div className="text-center mb-7">

            <div
              className="mx-auto mb-4
              w-12 h-12
              rounded-2xl
              bg-violet-500/10
              border border-violet-400/20
              flex items-center justify-center"
            >
              <ShieldCheck className="w-6 h-6 text-violet-300" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to access your FocusFlow AI workspace.
            </p>

          </div>


          {/* Error */}

          {error && (
            <div
              className="mb-5 flex items-start gap-3
              rounded-xl
              border border-rose-500/30
              bg-rose-500/10
              px-4 py-3
              text-sm text-rose-300"
            >
              <AlertCircle
                className="w-5 h-5 mt-0.5 shrink-0 text-rose-400"
              />

              <span>{error}</span>
            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Email */}

            <div>

              <label
                htmlFor="login-email"
                className="mb-2 flex items-center gap-2
                text-sm
                font-semibold
                text-gray-200"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                Email Address
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                disabled={isBusy}
                required
                className="w-full
                rounded-xl
                border border-white/10
                bg-black/20
                px-4 py-3.5
                text-sm text-white
                placeholder:text-gray-600
                outline-none
                transition
                focus:border-violet-500/60
                focus:ring-4
                focus:ring-violet-500/10
                disabled:opacity-60"
              />

            </div>


            {/* Password */}

            <div>

              <div className="mb-2 flex items-center justify-between">

                <label
                  htmlFor="login-password"
                  className="flex items-center gap-2
                  text-sm
                  font-semibold
                  text-gray-200"
                >
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs
                  font-semibold
                  text-cyan-400
                  hover:text-cyan-300
                  transition-colors"
                >
                  Forgot password?
                </Link>

              </div>

              <div className="relative">

                <input
                  id="login-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  disabled={isBusy}
                  required
                  className="w-full
                  rounded-xl
                  border border-white/10
                  bg-black/20
                  px-4 py-3.5 pr-12
                  text-sm text-white
                  placeholder:text-gray-600
                  outline-none
                  transition
                  focus:border-violet-500/60
                  focus:ring-4
                  focus:ring-violet-500/10
                  disabled:opacity-60"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={isBusy}
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  className="absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  rounded-lg
                  p-2
                  text-gray-500
                  hover:text-gray-200
                  transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

              </div>

            </div>


            {/* Submit */}

            <button
              id="login-submit"
              type="submit"
              disabled={isBusy}
              className="w-full
              h-12
              rounded-xl
              bg-gradient-to-r
              from-violet-600
              via-purple-600
              to-cyan-500
              text-white
              font-bold
              text-sm
              shadow-lg
              shadow-violet-600/20
              transition-all
              hover:-translate-y-0.5
              hover:shadow-violet-600/30
              active:translate-y-0
              disabled:cursor-not-allowed
              disabled:opacity-60
              flex
              items-center
              justify-center
              gap-2"
            >

              {isBusy ? (
                <>
                  <span
                    className="w-4 h-4
                    rounded-full
                    border-2
                    border-white/30
                    border-t-white
                    animate-spin"
                  />

                  Signing in...
                </>
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="w-4 h-4" />
                </>
              )}

            </button>

          </form>


          {/* Register */}

          <div className="mt-7 text-center">

            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Create a free account
              </Link>
            </p>

          </div>

        </div>


        {/* Back home */}

        <div className="mt-5 text-center">

          <Link
            href="/"
            className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
          >
            ← Back to FocusFlow AI
          </Link>

        </div>

      </div>
    </main>
  );
}