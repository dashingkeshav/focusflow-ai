import Link from "next/link";
import { ArrowRight, Compass, Home, LayoutDashboard, Sparkles, HelpCircle } from "lucide-react";

export const metadata = {
  title: "404 · Page Not Found — FocusFlow AI",
  description: "The trajectory you requested has drifted out of orbit or does not exist.",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-transparent px-6 py-24 text-white selection:bg-[#FF4500] selection:text-white">
      {/* Radiant Cosmic Atmosphere Aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF4500]/10 blur-[160px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-xl text-center">
        {/* Glow Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-[#0d0d0d]/80 text-[#FF4500] shadow-2xl backdrop-blur-xl">
          <Compass className="h-9 w-9 animate-spin-slow" aria-hidden="true" />
        </div>

        {/* Status Badge */}
        <div className="mt-8 inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 text-xs font-mono font-bold tracking-widest text-[#FF4500] uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF4500] animate-ping" />
          <span>Error 404 · Lost in Orbit</span>
        </div>

        {/* Heading */}
        <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white font-serif">
          Page not found<span className="text-[#FF4500]">.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-400 font-light max-w-md mx-auto">
          The requested coordinate does not exist or has drifted away from your workspace trajectory.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="group inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-white text-black px-7 text-sm font-semibold hover:bg-gray-100 hover:scale-105 transition-all shadow-lg"
            style={{ color: "#000000" }}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Return Home</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-md"
          >
            <LayoutDashboard className="h-4 w-4 text-[#FF4500]" aria-hidden="true" />
            <span>Go to Dashboard</span>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          <Link
            href="/features"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <Sparkles className="h-3 w-3 text-[#FF4500]" />
            <span>Features</span>
          </Link>
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <span>Pricing</span>
          </Link>
          <Link
            href="/contact"
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all"
          >
            <HelpCircle className="h-3 w-3 text-[#FF4500]" />
            <span>Support</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
