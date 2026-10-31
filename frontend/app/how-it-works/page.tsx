"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Timer,
  BrainCircuit,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Volume2,
} from "lucide-react";

interface StageData {
  stepNumber: string;
  id: "organize" | "focus" | "improve";
  title: string;
  tagline: string;
  summary: string;
  bullets: string[];
  ctaText: string;
  ctaHref: string;
}

const STAGES: StageData[] = [
  {
    stepNumber: "01",
    id: "organize",
    title: "Organize",
    tagline: "Add tasks, set goals, and prioritize your work.",
    summary:
      "Transform messy obligations, complex exam syllabi, or multi-week engineering milestones into structured, actionable Pomodoro tasks powered by Gemini 2.5.",
    bullets: [
      "Voice, text, or syllabus document inputs with multimodal AI parsing",
      "Automatic breakdown into 25-minute Pomodoro focus blocks",
      "Goal-linked task backlog with priority tags and target dates",
      "Full user confirmation before committing to your database",
    ],
    ctaText: "Explore AI Planner",
    ctaHref: "/dashboard/planner",
  },
  {
    stepNumber: "02",
    id: "focus",
    title: "Focus",
    tagline: "Start focus sessions and use distraction protection.",
    summary:
      "Enter an uninterrupted flow sanctuary. The full-screen Focus Timer pairs with our Chrome Extension to lock down off-task domains, stream ambient sound, and monitor presence.",
    bullets: [
      "Immersive deep-work timer with customizable intervals and breaks",
      "Manifest V3 distraction shield with an automated 3-strike policy",
      "Built-in Web Audio ambient sound generator (Rain, Space, Brown Noise)",
      "Optional on-device camera attention monitoring with MediaPipe AI",
    ],
    ctaText: "Launch Focus HUD",
    ctaHref: "/dashboard/sessions",
  },
  {
    stepNumber: "03",
    id: "improve",
    title: "Improve",
    tagline: "Review analytics, receive AI suggestions, and improve your routine.",
    summary:
      "Close the feedback loop with evidence-based diagnostics. Your real activity log generates cognitive performance insights to eliminate fatigue and optimize peak hours.",
    bullets: [
      "Authentic focus scores derived strictly from verified PostgreSQL logs",
      "Hourly productivity heatmaps and streak velocity tracking",
      "Observation → Evidence → Impact → Recommendation AI insights",
      "Adaptive auto-replanning for missed days in Pro tier",
    ],
    ctaText: "View Analytics",
    ctaHref: "/dashboard/analytics",
  },
];

export default function HowItWorksPage() {
  const [activeStageId, setActiveStageId] = useState<"organize" | "focus" | "improve">("organize");

  const currentStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  return (
    <div className="relative min-h-screen bg-[#08090D] text-[#F4F4F5] pt-28 pb-32">
      {/* Ambient Atmospheric Lighting */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[500px] rounded-full bg-[#FF4500]/10 blur-[180px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#262832] bg-[#12131A] text-xs font-mono font-bold text-[#FF4500] uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Workflow Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight font-serif text-white mb-6">
            How FocusFlow <br />
            <span className="text-gradient-teal italic font-light">powers your daily flow.</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            A seamless three-stage loop designed to take you from scattered intentions to measurable cognitive achievement.
          </p>
        </div>

        {/* 3-Stage Stage Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-3xl mx-auto mb-16">
          {STAGES.map((stage) => {
            const isActive = stage.id === activeStageId;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStageId(stage.id)}
                className={`w-full sm:w-1/3 flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 text-left ${
                  isActive
                    ? "bg-[#12131A] border-[#FF4500] shadow-[0_0_30px_rgba(255,69,0,0.25)] ring-1 ring-[#FF4500]/50"
                    : "bg-[#12131A]/60 border-[#262832] hover:border-zinc-700 hover:bg-[#12131A]"
                }`}
              >
                <div>
                  <div
                    className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                      isActive ? "text-[#FF4500]" : "text-zinc-500"
                    }`}
                  >
                    Stage {stage.stepNumber}
                  </div>
                  <div className="text-base font-bold font-serif text-white mt-0.5">
                    {stage.title}
                  </div>
                </div>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-mono font-bold ${
                    isActive
                      ? "border-[#FF4500]/50 bg-[#FF4500] text-white"
                      : "border-[#262832] bg-[#08090D] text-zinc-400"
                  }`}
                >
                  {stage.stepNumber}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Walkthrough Stage Panel */}
        <div className="rounded-3xl border border-[#262832] bg-[#12131A] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Stage Information & Instructions */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 px-3 py-1 text-xs font-mono font-bold text-[#FF4500]">
                <span>STAGE {currentStage.stepNumber} OF 03</span>
                <span>·</span>
                <span>{currentStage.title.toUpperCase()}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight">
                {currentStage.tagline}
              </h2>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {currentStage.summary}
              </p>

              {/* Bullet Checklist */}
              <div className="space-y-3 pt-2">
                {currentStage.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/20 text-[#FF4500] mt-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm text-zinc-300 leading-normal">
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Link
                  href={currentStage.ctaHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#FF4500] px-6 py-3 text-xs sm:text-sm font-bold text-white uppercase tracking-wider hover:bg-[#e03e00] shadow-[0_0_22px_rgba(255,69,0,0.35)] transition-all"
                >
                  <span>{currentStage.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-[#262832] bg-[#08090D] px-6 py-3 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  <span>Create Free Account</span>
                </Link>
              </div>
            </div>

            {/* Right: Rich Interactive Visual Preview for the Stage */}
            <div className="lg:col-span-6">
              {activeStageId === "organize" && (
                <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#262832] pb-3 text-xs font-mono">
                    <span className="text-[#FF7138] font-bold flex items-center gap-1.5">
                      <BrainCircuit className="h-4 w-4" /> GEMINI AI SYNTHESIZER
                    </span>
                    <span className="text-zinc-500">Document Upload: CS_Syllabus.pdf</span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3.5">
                      <div className="flex justify-between text-[11px] font-mono text-[#FF4500] mb-1">
                        <span>Milestone 01</span>
                        <span>Due Nov 04</span>
                      </div>
                      <div className="text-sm font-semibold text-white">Distributed State & Cache Invalidation</div>
                      <div className="text-xs text-zinc-400 mt-1">3 subtasks · Estimated 75 min</div>
                    </div>

                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3.5">
                      <div className="flex justify-between text-[11px] font-mono text-[#FF4500] mb-1">
                        <span>Milestone 02</span>
                        <span>Due Nov 07</span>
                      </div>
                      <div className="text-sm font-semibold text-white">PostgreSQL Connection Pooling Optimization</div>
                      <div className="text-xs text-zinc-400 mt-1">2 subtasks · Estimated 50 min</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#1A1C24] p-3 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                    <span>✓ Ready to commit 5 time-blocked tasks to workspace</span>
                    <span className="underline cursor-pointer">Commit</span>
                  </div>
                </div>
              )}

              {activeStageId === "focus" && (
                <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-6 space-y-5 shadow-xl text-center">
                  <div className="flex items-center justify-between border-b border-[#262832] pb-3 text-xs font-mono text-left">
                    <span className="text-[#FF4500] font-bold flex items-center gap-1.5">
                      <Timer className="h-4 w-4" /> ACTIVE FOCUS HUD
                    </span>
                    <span className="text-emerald-400">Shielding: 14 Domains</span>
                  </div>

                  <div className="inline-block relative">
                    <div className="h-32 w-32 rounded-full border-4 border-[#262832] flex flex-col items-center justify-center mx-auto bg-[#12131A]">
                      <span className="text-3xl font-mono font-bold text-white">25:00</span>
                      <span className="text-[10px] font-mono text-[#FF4500] mt-0.5">FLOW MODE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs">
                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3">
                      <div className="text-[10px] text-zinc-500 uppercase">Ambient Audio</div>
                      <div className="text-white font-semibold mt-0.5 flex items-center gap-1">
                        <Volume2 className="h-3 w-3 text-[#FF4500]" /> Deep Space
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3">
                      <div className="text-[10px] text-zinc-500 uppercase">Camera Detection</div>
                      <div className="text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Gaze Locked
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStageId === "improve" && (
                <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#262832] pb-3 text-xs font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4" /> VERIFIED EVIDENCE AUDIT
                    </span>
                    <span className="text-zinc-500">PostgreSQL Log ID #8491</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center font-mono">
                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3">
                      <div className="text-[10px] text-zinc-500 uppercase">Avg Focus Score</div>
                      <div className="text-2xl font-bold text-white mt-1">94%</div>
                    </div>
                    <div className="rounded-xl border border-[#262832] bg-[#12131A] p-3">
                      <div className="text-[10px] text-zinc-500 uppercase">Weekly Hours</div>
                      <div className="text-2xl font-bold text-[#FF4500] mt-1">26.5h</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/5 p-3.5 text-xs text-zinc-300 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#FF4500]" />
                      Cognitive Cadence Observation
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                      Your deepest flow state peaks between 08:30 and 11:00 AM with 98% focus consistency. We recommend scheduling high-complexity engineering blocks during this window.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Walkthrough Timeline Progress */}
        <div className="mt-20 border-t border-[#262832] pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-[#FF4500]">STEP 01</div>
              <h3 className="text-lg font-bold font-serif text-white">Input Intent & Upload</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Provide syllabi, task lists, or constraints via text or microphone. Gemini AI structures your optimal path.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-[#FF4500]">STEP 02</div>
              <h3 className="text-lg font-bold font-serif text-white">Shielded Execution</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect the Chrome extension, start the timer, and let smart tab rules shield you from compulsive context switching.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-[#FF4500]">STEP 03</div>
              <h3 className="text-lg font-bold font-serif text-white">Adaptive Evolution</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inspect authentic scores and let AI recommendations adjust your future sprint durations and break rhythms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
