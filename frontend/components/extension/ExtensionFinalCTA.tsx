"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function ExtensionFinalCTA() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8] overflow-hidden border-t border-slate-200/70">
      {/* Background ambient radial gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-teal-200/30 via-cyan-200/20 to-sky-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="rounded-3xl bg-gradient-to-b from-white to-[#F7F9FC] border border-slate-200/90 p-8 sm:p-14 lg:p-16 shadow-2xl shadow-slate-200/60 text-center relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Start Working In Flow
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-3xl mx-auto">
            Make every browsing session more intentional.
          </h2>

          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            “Bring your goals into your browser and give focused work more room.”
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/download/extension"
              download="FocusFlow-Chrome-Extension.zip"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-base shadow-lg shadow-teal-600/25 transition-all duration-200 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>Get the Chrome Extension</span>
            </a>

            <Link
              href="/features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-200/90 shadow-sm transition-all duration-200 hover:border-slate-300"
            >
              <span>Explore FocusFlow</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>

          {/* Small assurance badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Manifest V3 verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>Zero telemetry on private tabs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>Free & Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
