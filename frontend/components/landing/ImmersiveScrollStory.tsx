"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Brain,
  ListOrdered,
  CalendarClock,
  Timer,
  ShieldAlert,
  BarChart3,
  Lightbulb,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";

interface StoryStep {
  step: string;
  tagline: string;
  title: string;
  description: string;
  icon: typeof Target;
  visualComponent: React.FC;
}

// 01 — INTENTION
const IntentionVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        <Target className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
          Raw Intention
        </span>
        <h4 className="text-base font-bold text-slate-900">Prepare for Placement</h4>
      </div>
    </div>
    <div className="mt-5 space-y-3">
      <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-700">
        <span className="font-semibold text-slate-900">Prompt / Goal: </span>
        &quot;I have my placement exams in 20 days. I can devote 3 hours daily to crack coding & system design.&quot;
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Timeline: 20 days</span>
        <span className="font-semibold text-teal-600">High Priority</span>
      </div>
    </div>
  </motion.div>
);

// 02 — UNDERSTAND
const UnderstandVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <Brain className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
          AI Context Synthesis
        </span>
        <h4 className="text-base font-bold text-slate-900">Multimodal Context Analysis</h4>
      </div>
    </div>
    <div className="mt-4 space-y-2.5">
      {[
        { label: "Available Bandwidth", val: "3 hours / day (60 total hours)" },
        { label: "Feasibility Score", val: "94% achievable with spaced repetition" },
        { label: "Syllabus Extracted", val: "Arrays, Trees, Graphs, System Design" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
          <span className="text-slate-600">{item.label}</span>
          <span className="font-bold text-slate-900">{item.val}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// 03 — PLAN
const PlanVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        <ListOrdered className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
          Roadmap Decomposition
        </span>
        <h4 className="text-base font-bold text-slate-900">4 Structured Milestones</h4>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      {[
        { title: "M1: Data Structures Foundation", hours: "15 hrs", active: true },
        { title: "M2: Advanced Algorithms & DP", hours: "18 hrs", active: false },
        { title: "M3: System Design & Architecture", hours: "12 hrs", active: false },
        { title: "M4: Mock Interviews & Behavioral", hours: "15 hrs", active: false },
      ].map((m, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
            m.active ? "border-teal-400 bg-teal-50/80 font-bold text-teal-900" : "border-slate-100 bg-white text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200/70 text-[10px]">
              {i + 1}
            </span>
            <span>{m.title}</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">{m.hours}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// 04 — SCHEDULE
const ScheduleVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <CalendarClock className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
          Chronos Slotting
        </span>
        <h4 className="text-base font-bold text-slate-900">Realistic Daily Blocks</h4>
      </div>
    </div>
    <div className="mt-4 space-y-2.5">
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-3 text-xs">
        <div className="flex justify-between font-bold text-slate-900">
          <span>08:00 AM — 09:30 AM (90m)</span>
          <span className="text-teal-600">Peak Window</span>
        </div>
        <p className="mt-1 text-slate-600">Dynamic Programming & Graph Traversal</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
        <div className="flex justify-between font-bold text-slate-900">
          <span>04:30 PM — 06:00 PM (90m)</span>
          <span className="text-slate-500">Secondary Window</span>
        </div>
        <p className="mt-1 text-slate-600">System Design: Cache Invalidation & Queues</p>
      </div>
    </div>
  </motion.div>
);

// 05 — FOCUS
const FocusVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
          <Timer className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
            Active Attention
          </span>
          <h4 className="text-base font-bold text-slate-900">Focus Session Active</h4>
        </div>
      </div>
      <span className="flex h-3 w-3 animate-ping rounded-full bg-teal-500" />
    </div>
    <div className="mt-6 text-center">
      <span className="font-mono text-5xl font-black text-slate-900">42:18</span>
      <p className="mt-2 text-xs font-semibold text-teal-600">Camera Attention Tracking Active · Shield ON</p>
    </div>
  </motion.div>
);

// 06 — PROTECT
const ProtectVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-amber-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
          Interception
        </span>
        <h4 className="text-base font-bold text-slate-900">Digital Drift Deflected</h4>
      </div>
    </div>
    <div className="mt-4 space-y-2.5 text-xs">
      <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3 font-semibold text-rose-700">
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4" /> youtube.com/feed/trending
        </span>
        <span>Blocked</span>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-teal-50 p-3 font-semibold text-teal-700">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> github.com/focusflow-ai
        </span>
        <span>Active (Productive)</span>
      </div>
    </div>
  </motion.div>
);

// 07 — MEASURE
const MeasureVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
          Empirical Telemetry
        </span>
        <h4 className="text-base font-bold text-slate-900">Real Progress Metrics</h4>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
      <div className="rounded-2xl bg-slate-50 p-4">
        <span className="text-3xl font-black text-slate-900">91</span>
        <p className="mt-1 text-[11px] text-slate-500">Focus Score</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <span className="text-3xl font-black text-teal-600">88m</span>
        <p className="mt-1 text-[11px] text-slate-500">Productive Time</p>
      </div>
    </div>
  </motion.div>
);

// 08 — LEARN
const LearnVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
        <Lightbulb className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
          Pattern Extraction
        </span>
        <h4 className="text-base font-bold text-slate-900">Observation & Recommendation</h4>
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-xs leading-relaxed text-teal-900">
      <p className="font-bold">Observation:</p>
      <p className="mt-0.5 text-slate-700">Your stamina score peaks at 94 between 8:00 AM and 10:00 AM across 8 completed sessions.</p>
      <p className="mt-2 font-bold">Recommendation:</p>
      <p className="mt-0.5 text-slate-700">Schedule high-complexity algorithmic challenges in morning slots.</p>
    </div>
  </motion.div>
);

// 09 — ADAPT
const AdaptVisual: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 15 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
          Self-Tuning Workspace
        </span>
        <h4 className="text-base font-bold text-slate-900">Tomorrow&apos;s Plan Adjusted</h4>
      </div>
    </div>
    <div className="mt-4 space-y-2 text-xs">
      <div className="rounded-xl border border-teal-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between text-teal-700">
          <span className="font-bold">Auto-Rebalanced Schedule</span>
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px]">Applied</span>
        </div>
        <p className="mt-1 text-slate-600">Advanced DP shifted to 08:30 AM tomorrow. Evening block relaxed to 45m review.</p>
      </div>
    </div>
  </motion.div>
);

const STEPS: StoryStep[] = [
  {
    step: "01",
    tagline: "INTENTION",
    title: "A goal enters the scene.",
    description: "Every breakthrough starts with a single, clear objective. You articulate what you need to achieve—no rigid forms or manual micromanagement.",
    icon: Target,
    visualComponent: IntentionVisual,
  },
  {
    step: "02",
    tagline: "UNDERSTAND",
    title: "AI interprets the objective and context.",
    description: "Multimodal intelligence ingests your timeline, available daily hours, and uploaded documents to understand the actual scale and prerequisites.",
    icon: Brain,
    visualComponent: UnderstandVisual,
  },
  {
    step: "03",
    tagline: "PLAN",
    title: "The goal transforms into milestones and tasks.",
    description: "Big objectives are decomposed into realistic milestones and concrete actionable tasks with dependencies and sensible effort sizing.",
    icon: ListOrdered,
    visualComponent: PlanVisual,
  },
  {
    step: "04",
    tagline: "SCHEDULE",
    title: "Tasks move into realistic time blocks.",
    description: "Work isn't an endless checklist—it's matched against your calendar and natural energy curves into dedicated study windows.",
    icon: CalendarClock,
    visualComponent: ScheduleVisual,
  },
  {
    step: "05",
    tagline: "FOCUS",
    title: "A focus session activates.",
    description: "Enter an intentional, calm state. A prominent timer guides your sprint with local attention tracking and distraction shielding.",
    icon: Timer,
    visualComponent: FocusVisual,
  },
  {
    step: "06",
    tagline: "PROTECT",
    title: "Real distraction scenarios intercepted.",
    description: "Digital drift happens. FocusFlow intercepts off-task tabs in real time and gently steers you back to what matters.",
    icon: ShieldAlert,
    visualComponent: ProtectVisual,
  },
  {
    step: "07",
    tagline: "MEASURE",
    title: "Work becomes measurable progress.",
    description: "No fabricated metrics. Authentic telemetry records actual productive minutes, attention stability, and completed milestones.",
    icon: BarChart3,
    visualComponent: MeasureVisual,
  },
  {
    step: "08",
    tagline: "LEARN",
    title: "FocusFlow identifies your personal patterns.",
    description: "The engine observes when you work best, what triggers burnout, and which environments yield peak cognitive stamina.",
    icon: Lightbulb,
    visualComponent: LearnVisual,
  },
  {
    step: "09",
    tagline: "ADAPT",
    title: "The next plan becomes smarter.",
    description: "The feedback loop closes: tomorrow's schedule adapts automatically based on real performance, ensuring steady, sustainable velocity.",
    icon: Sparkles,
    visualComponent: AdaptVisual,
  },
];

export default function ImmersiveScrollStory() {
  const [activeStep, setActiveStep] = useState(0);
  const current = STEPS[activeStep];
  const Visual = current.visualComponent;

  return (
    <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:py-32">
      {/* Section Header */}
      <div className="text-center">
        <span className="section-label">
          The 9-Phase Experience Loop
        </span>
        <h2 className="section-title">
          From Intention to <span className="serif-italic text-gradient-teal">Adaptive Progress.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          FocusFlow isn&apos;t a collection of disconnected SaaS screens. It is one continuous cognitive loop that evolves as you work.
        </p>
      </div>

      {/* Step Navigation Pill Ticker */}
      <div className="mt-12 flex items-center justify-start gap-2 overflow-x-auto pb-4 pt-2 no-scrollbar sm:justify-center">
        {STEPS.map((s, idx) => {
          const isActive = idx === activeStep;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? "border-teal-500 bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className={isActive ? "text-teal-200" : "text-slate-400"}>{s.step}</span>
              <span>{s.tagline}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Dual-Panel Stage Display */}
      <div className="mt-8 grid grid-cols-1 items-center gap-10 rounded-[36px] border border-slate-200/80 bg-gradient-to-b from-white/95 to-[#f8fafc]/90 p-8 shadow-xl backdrop-blur-xl lg:grid-cols-12 lg:p-14">
        {/* Left Narrative Panel */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-teal-50 px-3.5 py-1 text-xs font-bold text-teal-700">
            <span>Stage {current.step}</span>
            <span>·</span>
            <span>{current.tagline}</span>
          </div>

          <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {current.title}
          </h3>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {current.description}
          </p>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveStep((prev) => (prev + 1) % STEPS.length)}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              <span>Next Phase ({STEPS[(activeStep + 1) % STEPS.length].tagline})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-slate-400">
              {activeStep + 1} of {STEPS.length}
            </span>
          </div>
        </div>

        {/* Right Dimensional Visualizer */}
        <div className="relative min-h-[340px] flex items-center justify-center lg:col-span-6">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 blur-2xl" />
          <div className="relative w-full max-w-md">
            <AnimatePresence mode="wait">
              <Visual key={current.step} />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
