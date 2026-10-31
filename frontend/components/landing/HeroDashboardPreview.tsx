"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Timer,
  Bot,
  Activity,
  ShieldCheck,
  Play,
  Pause,
  Sparkles,
  Flame,
  CheckCircle2,
  Lock,
  Volume2,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState<"focus" | "planner" | "telemetry">("focus");
  const [seconds, setSeconds] = useState(1458); // 24m 18s
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 1500));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const progressPercent = Math.round(((1500 - seconds) / 1500) * 100);

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Radiant Orange Glow Accent behind Dashboard */}
      <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-[#FF4500]/30 via-[#FF7138]/20 to-[#FF4500]/30 blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000" />

      {/* Main Glass Dashboard Shell */}
      <div className="relative rounded-3xl border border-[#262832] bg-[#12131A]/95 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden">
        {/* Top OS Window Header */}
        <div className="flex items-center justify-between border-b border-[#262832] bg-[#08090D]/80 px-5 py-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 border border-rose-600/50" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 border border-amber-600/50" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 border border-emerald-600/50" />
            <span className="ml-3 hidden sm:inline-block font-mono text-[11px] text-zinc-400">
              FocusFlow OS · Autonomous Intelligence Engine
            </span>
          </div>

          {/* Interactive Mode Tabs */}
          <div className="flex items-center gap-1 rounded-full bg-[#1A1C24] p-1 border border-[#262832]">
            <button
              type="button"
              onClick={() => setActiveTab("focus")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === "focus"
                  ? "bg-[#FF4500] text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Timer className="h-3 w-3" />
              <span>Focus HUD</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("planner")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === "planner"
                  ? "bg-[#FF4500] text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Bot className="h-3 w-3" />
              <span>AI Planner</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeTab === "telemetry"
                  ? "bg-[#FF4500] text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity className="h-3 w-3" />
              <span>Live Telemetry</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Shield Active</span>
          </div>
        </div>

        {/* Dashboard Main Workspace Area */}
        <div className="p-6 sm:p-8">
          {activeTab === "focus" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Timer Ring & Primary Controls */}
              <div className="lg:col-span-7 flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs font-mono font-bold text-[#FF4500] mb-3">
                  <Flame className="h-3.5 w-3.5 fill-[#FF4500]" />
                  <span>DEEP WORK PROTOCOL · 25 MIN SPRINT</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white mb-1">
                  Finalize Architecture & Production Systems
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mb-6">
                  Target milestone: FocusFlow Core Release · Distraction shield blocking 14 off-task domains
                </p>

                {/* Animated Timer Display */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="relative flex items-center justify-center h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-[#262832] bg-[#08090D]">
                    <svg className="absolute inset-0 h-full w-full -rotate-90">
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        className="stroke-[#262832]"
                        strokeWidth="6"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        className="stroke-[#FF4500] transition-all duration-1000 ease-linear"
                        strokeWidth="6"
                        strokeDasharray={326}
                        strokeDashoffset={326 - (326 * progressPercent) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {timeFormatted}
                      </span>
                      <span className="block text-[10px] uppercase font-mono text-zinc-500 mt-0.5">
                        {progressPercent}% Done
                      </span>
                    </div>
                  </div>

                  {/* Interactive Button Controls */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRunning(!isRunning)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#FF4500] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#FF4500]/30 hover:bg-[#e03e00] transition-colors"
                    >
                      {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      <span>{isRunning ? "Pause Session" : "Resume Flow"}</span>
                    </button>

                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#262832] bg-[#1A1C24] px-3 py-1.5 text-[11px] font-mono text-zinc-300">
                      <Volume2 className="h-3 w-3 text-[#FF4500]" />
                      <span>Sound: Deep Space Ambient</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="w-full max-w-md space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>Pomodoro Interval 1 of 4</span>
                    <span className="text-[#FF7138] font-bold">5m break up next</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#262832] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF4500] to-[#FF7138] transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Telemetry Cards */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Metric 1: Live Focus Score */}
                <div className="rounded-2xl border border-[#262832] bg-[#08090D]/80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                      <Zap className="h-3.5 w-3.5 text-[#FF4500]" />
                      <span>COGNITIVE FLOW SCORE</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                      OPTIMAL
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">98</span>
                    <span className="text-xs text-zinc-500">/ 100</span>
                    <span className="text-xs text-emerald-400 font-semibold ml-auto flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" /> +14% vs avg
                    </span>
                  </div>
                </div>

                {/* Metric 2: Distraction Shield Telemetry */}
                <div className="rounded-2xl border border-[#262832] bg-[#08090D]/80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>DISTRACTION SHIELD</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">0 Warnings</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-400">
                    <div className="flex justify-between items-center">
                      <span>Off-task Tab Intercepts:</span>
                      <span className="font-mono font-bold text-white">4 blocked</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Browser Isolation:</span>
                      <span className="font-mono text-emerald-400 font-semibold">Strict Mode</span>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Pill */}
                <div className="rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/5 p-3.5 flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-[#FF4500] shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-zinc-300">
                    <strong className="text-white">Gemini 2.5 Suggestion:</strong> Flow state verified. Recommend continuing current cadence for 15 more minutes before cognitive fatigue onset.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "planner" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#262832] pb-3">
                <div>
                  <h4 className="text-base font-bold text-white font-serif">
                    Multimodal AI Daily Schedule
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Gemini 2.5 synthesized 4 Pomodoro focus milestones from your syllabus and project backlog.
                  </p>
                </div>
                <span className="text-[11px] font-mono rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#FF4500] px-3 py-1 font-bold">
                  Schedule Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { time: "09:00 - 10:30", title: "Core Architecture System", dur: "90m", tag: "High Priority" },
                  { time: "11:00 - 12:00", title: "API Telemetry Verification", dur: "60m", tag: "Engineering" },
                  { time: "14:00 - 15:30", title: "Interface & UX Review", dur: "90m", tag: "Design" },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-[#262832] bg-[#08090D] p-3.5 space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-[#FF7138]">
                      <span>{item.time}</span>
                      <span>{item.dur}</span>
                    </div>
                    <h5 className="text-sm font-semibold text-white">{item.title}</h5>
                    <span className="inline-block text-[10px] font-mono bg-white/5 border border-[#262832] px-2 py-0.5 rounded-md text-zinc-400">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "telemetry" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#262832] pb-3">
                <div>
                  <h4 className="text-base font-bold text-white font-serif">
                    Authentic PostgreSQL Focus Metrics
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Derived from real window blur, tab switch timestamps, and idle activity thresholds.
                  </p>
                </div>
                <span className="text-[11px] font-mono rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 font-bold">
                  Zero Simulation
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-xl border border-[#262832] bg-[#08090D] p-3">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Today Deep Focus</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">4h 15m</div>
                </div>
                <div className="rounded-xl border border-[#262832] bg-[#08090D] p-3">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Tab Switches</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">2</div>
                </div>
                <div className="rounded-xl border border-[#262832] bg-[#08090D] p-3">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Daily Streak</div>
                  <div className="text-xl font-bold font-mono text-[#FF4500] mt-1">12 Days</div>
                </div>
                <div className="rounded-xl border border-[#262832] bg-[#08090D] p-3">
                  <div className="text-[10px] font-mono uppercase text-zinc-500">Distractions Avoided</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">37</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#262832] bg-[#08090D]/90 px-6 py-4 gap-3 text-xs">
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Manifest V3 Shield Synced
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#FF4500]" />
              Local Privacy Protected
            </span>
          </div>

          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4500] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#e03e00] transition-colors"
          >
            <span>Launch Your Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
