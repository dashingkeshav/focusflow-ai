"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Link2,
  Compass,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";

interface StepData {
  number: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  visualType: "task" | "connect" | "rules" | "distraction" | "analytics";
}

const STEPS: StepData[] = [
  {
    number: "01",
    tag: "INTENTIONAL TARGETING",
    title: "Choose Your Task",
    subtitle: "Define the work that truly matters for this block of time.",
    description:
      "Before diving into the browser, name your active focus task in FocusFlow. The extension reads this context to dynamically evaluate which tabs and resources support your goal, rather than using rigid all-or-nothing website blockers.",
    icon: Target,
    accent: "from-teal-500 to-cyan-500",
    visualType: "task",
  },
  {
    number: "02",
    tag: "LOCAL EXTENSION PAIRING",
    title: "Connect FocusFlow",
    subtitle: "Establish an authenticated link between Chrome and your workspace.",
    description:
      "Open the extension popup and sign in to your FocusFlow account. The service worker pairs securely via local token storage, synchronizing active sessions with your FocusFlow backend so task status and protection rules stay aligned.",
    icon: Link2,
    accent: "from-cyan-500 to-sky-500",
    visualType: "connect",
  },
  {
    number: "03",
    tag: "CONTEXT-AWARE EVALUATION",
    title: "Browse With Purpose",
    subtitle: "Apply actual configurable domain rules and keyword relevance.",
    description:
      "As you open tabs, the local classifier checks domain allowlists, blocklists, and task keyword relevance. Productive documentation and repositories are cleared instantly, while ambiguous platforms are flagged for intentional verification.",
    icon: Compass,
    accent: "from-emerald-500 to-teal-500",
    visualType: "rules",
  },
  {
    number: "04",
    tag: "REAL-TIME INTERVENTION",
    title: "Handle Distractions",
    subtitle: "Gentle nudge warnings or hard shield redirection on temptation.",
    description:
      "When you wander onto flagged domains, FocusFlow triggers your chosen mode: either an in-page warning banner with a countdown to refocus, or direct redirection to the extension's dedicated blocked screen.",
    icon: ShieldAlert,
    accent: "from-amber-500 to-teal-600",
    visualType: "distraction",
  },
  {
    number: "05",
    tag: "SESSION RECAP",
    title: "Review Your Progress",
    subtitle: "Synchronize intercepted events directly into your session analytics.",
    description:
      "Every protected session logs its focus duration, distraction prompts, and intentional site visits to your dashboard history. Review your deep-work ratio and identify recurring friction patterns over time.",
    icon: BarChart3,
    accent: "from-indigo-500 to-teal-500",
    visualType: "analytics",
  },
];

export default function ExtensionJourney() {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-[#FAFAF8] via-[#F4F6F9] to-[#FAFAF8] overflow-hidden border-t border-slate-200/70">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-200 h-100 bg-linear-to-r from-teal-100/40 via-cyan-100/30 to-sky-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            End-To-End Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            How FocusFlow works in your daily workflow.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            From the moment you begin a session to your final analytics recap, the extension operates seamlessly in the background with zero lag and zero invasive tracking.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="relative">
          {/* Central connecting spine (visible on desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-10 bottom-10 w-0.5 bg-linear-to-b from-teal-300 via-cyan-400 to-teal-300 -translate-x-1/2 rounded-full opacity-60" />

          <div className="space-y-16 lg:space-y-24">
            {STEPS.map((step, idx) => {
              const isEven = idx % 2 === 0;
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className={`relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${
                    isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                  onMouseEnter={() => setActiveStep(idx)}
                >
                  {/* Step Connector Node (Desktop) */}
                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-teal-500 shadow-md shadow-teal-500/20 items-center justify-center z-20">
                    <span className="text-xs font-bold text-teal-700">{step.number}</span>
                  </div>

                  {/* Text Content Column */}
                  <div className="w-full lg:w-1/2">
                    <div
                      className={`max-w-xl ${
                        isEven ? "lg:ml-auto lg:pr-12 text-left" : "lg:mr-auto lg:pl-12 text-left"
                      }`}
                    >
                      <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-teal-600 uppercase mb-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
                        {step.tag}
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">
                          {step.number}
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                          {step.title}
                        </h3>
                      </div>

                      <p className="text-base font-medium text-slate-800 mb-3">
                        {step.subtitle}
                      </p>

                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5">
                        {step.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50/80 px-3 py-1.5 rounded-lg border border-teal-200/60 w-fit">
                        <Icon className="w-4 h-4 text-teal-600" />
                        <span>Manifest V3 Real-Time Protection</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Demonstration Card Column */}
                  <div className="w-full lg:w-1/2">
                    <div
                      className={`max-w-xl mx-auto ${
                        isEven ? "lg:mr-auto" : "lg:ml-auto"
                      } rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 relative overflow-hidden group hover:border-teal-300 transition-all duration-300`}
                    >
                      {/* Top light highlight */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-teal-400 via-cyan-400 to-sky-400 opacity-80" />

                      {/* Render specialized step visual */}
                      {step.visualType === "task" && <TaskVisual />}
                      {step.visualType === "connect" && <ConnectVisual />}
                      {step.visualType === "rules" && <RulesVisual />}
                      {step.visualType === "distraction" && <DistractionVisual />}
                      {step.visualType === "analytics" && <AnalyticsVisual />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Step 1 Visual: Task Definition
// -----------------------------------------------------------------------------
function TaskVisual() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Workspace Intent
          </span>
        </div>
        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
          Target: 45 min
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
          Current Focus Task
        </label>
        <div className="text-base font-bold text-slate-900 flex items-center justify-between">
          <span>Complete React Authentication</span>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Locked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100">
          <span className="text-[10px] uppercase font-bold text-teal-700 block">Allowed Contexts</span>
          <span className="text-slate-700 font-medium mt-0.5 block">github, docs, localhost, jwt.io</span>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Intervention Policy</span>
          <span className="text-slate-700 font-medium mt-0.5 block">Warn on feeds, Block entertainment</span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 2 Visual: Connect FocusFlow
// -----------------------------------------------------------------------------
function ConnectVisual() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-linear-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-sm">
            <span className="text-xs font-black">FF</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">FocusFlow Extension Popup</div>
            <div className="text-[10px] text-slate-500">Service Worker MV3 Connected</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Synced
        </span>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span>FocusFlow Account:</span>
          <span className="font-semibold text-slate-900">developer@focusflow.ai</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Backend Target:</span>
          <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] text-slate-800 font-mono">
            http://localhost:5001
          </code>
        </div>
        <div className="flex justify-between items-center text-slate-600">
          <span>Secure Token:</span>
          <span className="text-emerald-700 font-medium">Stored in chrome.storage.local</span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-cyan-50/70 border border-cyan-200/60 flex items-center gap-2.5 text-xs text-cyan-900">
        <Lock className="w-4 h-4 text-cyan-600 shrink-0" />
        <span>JWT session token encrypted locally — never shares browsing logs externally.</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 3 Visual: Rules & Classification
// -----------------------------------------------------------------------------
function RulesVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Domain Evaluation Matrix
        </span>
        <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
          classifier.js
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono font-semibold text-slate-900">github.com</span>
          </div>
          <span className="text-emerald-800 font-bold bg-white px-2 py-0.5 rounded text-[11px] shadow-xs">
            Productive (Code)
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 border border-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-mono font-semibold text-slate-900">youtube.com</span>
          </div>
          <span className="text-amber-800 font-bold bg-white px-2 py-0.5 rounded text-[11px] shadow-xs">
            Flagged (Attention)
          </span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/80 border border-rose-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-mono font-semibold text-slate-900">instagram.com</span>
          </div>
          <span className="text-rose-800 font-bold bg-white px-2 py-0.5 rounded text-[11px] shadow-xs">
            Blocked (Distraction)
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 pt-1">
        Matches task keywords and default productivity lists without recording private URLs.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 4 Visual: Distraction Intervention
// -----------------------------------------------------------------------------
function DistractionVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Intervention Modes
        </span>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Live Interception
        </span>
      </div>

      <div className="border border-amber-300 bg-amber-50/90 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            FocusFlow Banner Overlay
          </div>
          <span className="font-mono text-xs font-bold text-amber-700">00:24 remaining</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-snug">
          “You are visiting an attention-risk site while locked into: Complete React Authentication.”
        </p>
      </div>

      <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            Hard Redirection Mode
          </div>
          <code className="text-[10px] text-teal-800 font-mono">blocked.html</code>
        </div>
        <p className="text-[11px] text-slate-600 leading-snug">
          Redirects non-work domains to your dedicated FocusFlow shield page with a return-to-task button.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 5 Visual: Analytics & Progress
// -----------------------------------------------------------------------------
function AnalyticsVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Session Summary Data
        </span>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Completed
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-lg font-black text-slate-900">42m</div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Focus Time</div>
        </div>
        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200">
          <div className="text-lg font-black text-teal-700">93%</div>
          <div className="text-[10px] font-semibold text-teal-700 uppercase">Efficiency</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-lg font-black text-slate-900">4</div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase">Distractions Deflected</div>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
        <span className="font-medium">Synced with FocusFlow Dashboard</span>
        <span className="text-teal-700 font-bold hover:underline cursor-pointer">View Session &rarr;</span>
      </div>
    </div>
  );
}
