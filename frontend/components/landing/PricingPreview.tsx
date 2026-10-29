"use client";

import React from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

export default function PricingPreview() {
  return (
    <section id="pricing" className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:py-32">
      <div className="text-center">
        <span className="section-label">
          Transparent Tiers
        </span>
        <h2 className="section-title">
          Start for Free. Upgrade to{" "}
          <span className="serif-italic text-gradient-teal">unlimited Pro.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
          No fake locks or hidden fees. Focus on your real goals with honest, database-backed access.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        {/* FREE PLAN */}
        <Reveal>
          <div className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-card p-8 md:p-10 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl font-bold text-white">Free Tier</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-gray-300">
                  Forever
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                Core workspace for organizing tasks and running protected focus sprints.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-5xl font-bold text-white">₹0</span>
                <span className="text-sm font-mono text-gray-500">/ forever</span>
              </div>

              <ul className="mt-8 space-y-3.5 border-t border-white/10 pt-6 text-sm text-gray-300">
                {[
                  "Goals & Task Roadmap",
                  "Focus Sessions & Timer",
                  "Basic AI Planner (5 requests / day)",
                  "Browser Extension monitoring",
                  "Focus Rooms (host up to 4 peers)",
                  "Focus Circles & Pods (1 of each)",
                  "Join any Pro room or group free",
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-[#FF4500]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/register" className="btn btn-ghost mt-8 w-full justify-center">
              Get Started Free
            </Link>
          </div>
        </Reveal>

        {/* PRO PLAN */}
        <Reveal delay={0.12}>
          <div className="relative flex h-full flex-col justify-between rounded-3xl border-2 border-[#FF4500] bg-card p-8 md:p-10 shadow-[0_20px_50px_rgba(255,69,0,0.25)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_25px_60px_rgba(255,69,0,0.35)]">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FF4500] px-4 py-1 text-[11px] font-mono font-bold uppercase tracking-widest text-white shadow-md">
              FocusFlow Pro
            </span>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
                  <span>Pro Intelligence</span>
                  <Sparkles className="h-4 w-4 text-[#FF4500]" />
                </h3>
                <span className="rounded-full bg-[#FF4500]/20 border border-[#FF4500]/40 px-3 py-1 text-xs font-mono font-bold text-[#FF4500]">
                  Full Access
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                Full multimodal AI Planner with voice, PDF uploads, what-if rebalancing, deep analytics, and expanded team collaboration.
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-5xl font-bold text-white">₹399</span>
                <span className="text-sm font-mono text-gray-500">/ month</span>
              </div>

              <ul className="mt-8 space-y-3.5 border-t border-white/10 pt-6 text-sm text-gray-200">
                {[
                  "Everything in Free Tier",
                  "Multimodal AI Planner (Voice + PDF/Docs)",
                  "200 AI plan generations / day",
                  "Adaptive Replanning & What-if scenarios",
                  "Focus Rooms hosting up to 12 participants",
                  "Advanced Focus Intelligence & Heatmaps",
                  "Comprehensive PDF & CSV Export",
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-[#FF4500] font-bold" />
                    <span className="font-medium text-white">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/billing/checkout?plan=pro"
              className="btn btn-primary mt-8 w-full justify-center shadow-lg shadow-[#FF4500]/30"
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        Secure billing powered by Razorpay. View full entitlement comparison at{" "}
        <Link href="/pricing" className="font-semibold text-[#FF4500] underline hover:text-tide-400">
          /pricing
        </Link>
        .
      </p>
    </section>
  );
}
