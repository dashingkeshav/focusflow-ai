"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client-side for diagnostics only — never rendered to the user.
    console.error("FocusFlow route error:", error.message);
  }, [error]);

  return (
    <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#fafbfc] px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-105 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500/10 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-50 text-rose-600 shadow-xs">
          <AlertTriangle className="h-7 w-7" aria-hidden />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 font-manrope sm:text-4xl">
          Something went wrong.
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          FocusFlow couldn&apos;t load this section. Your telemetry and data remain completely safe.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-teal-600 to-cyan-600 px-6 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition-all hover:from-teal-700 hover:to-cyan-700 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-slate-800 sm:w-auto"
          >
            <Home className="h-4 w-4" aria-hidden />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
