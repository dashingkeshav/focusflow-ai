"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Puzzle,
  Sparkles,
  ExternalLink,
  Laptop,
  Layers,
  Timer,
  Check,
} from "lucide-react";

type ActiveTabKey = "github" | "youtube" | "instagram";

const TABS: { id: ActiveTabKey; label: string; url: string; status: "productive" | "warning" | "blocked" }[] = [
  { id: "github", label: "github.com", url: "https://github.com/focusflow-ai/frontend", status: "productive" },
  { id: "youtube", label: "youtube.com", url: "https://youtube.com/watch?v=react-auth", status: "warning" },
  { id: "instagram", label: "instagram.com", url: "https://instagram.com/explore", status: "blocked" },
];

export default function ExtensionHero() {
  const [activeTab, setActiveTab] = useState<ActiveTabKey>("github");
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Tilt perspective on mouse move
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const scrollToDownload = () => {
    const el = document.getElementById("download-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToJourney = () => {
    const el = document.getElementById("how-it-works-journey");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative pt-36 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-radial-[at_50%_0%] from-teal-50/50 via-white to-slate-50 text-slate-900 border-b border-slate-200/60">
      {/* Background Dimensional Ambient Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-225 h-125 bg-linear-to-tr from-teal-200/20 via-cyan-100/30 to-sky-200/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute -top-32 right-10 w-96 h-96 bg-amber-100/25 blur-[100px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ================= LEFT COLUMN: HERO COPY ================= */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            {/* Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-50 px-3.5 py-1.5 text-[11px] font-mono font-bold tracking-widest uppercase text-teal-800 shadow-xs mb-6"
            >
              <Puzzle className="h-3.5 w-3.5 text-teal-600" />
              <span>FOCUSFLOW SMART FOCUS MODE</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] mb-6"
            >
              Your browser should work{" "}
              <span className="italic font-normal bg-linear-to-r from-teal-700 to-cyan-600 bg-clip-text text-transparent">
                for your goals.
              </span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl mb-9"
            >
              Keep your current task in focus with configurable distraction protection and a connected FocusFlow workspace. Real-time domain verification, gentle drift warnings, and zero keystroke surveillance.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
            >
              <button
                type="button"
                onClick={scrollToDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-98 text-white px-7 py-3.5 text-sm font-semibold tracking-wide transition-all shadow-[0_10px_25px_-5px_rgba(13,148,136,0.35)] cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Get the Chrome Extension</span>
              </button>

              <button
                type="button"
                onClick={scrollToJourney}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/80 hover:bg-white text-slate-800 px-6 py-3.5 text-sm font-semibold tracking-wide transition-all hover:border-slate-400 shadow-xs cursor-pointer"
              >
                <span>Explore How It Works</span>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </button>
            </motion.div>

            {/* Compatibility & Availability Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="mt-10 pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono text-slate-500"
            >
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Manifest V3 Verified
              </span>
              <span>·</span>
              <span>Chrome 116+</span>
              <span>·</span>
              <span>Brave, Edge & Opera</span>
              <span>·</span>
              <span className="text-slate-700 font-bold">Package v3.0.0</span>
            </motion.div>
          </div>

          {/* ================= RIGHT COLUMN: 3D BROWSER ENVIRONMENT ================= */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-6 perspective-distant"
          >
            <motion.div
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
              className="relative rounded-3xl border border-slate-200/80 bg-white/95 p-3 sm:p-4 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.12),0_10px_25px_-5px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_35px_85px_-20px_rgba(13,148,136,0.18)]"
            >
              {/* Browser Window Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 rounded-t-2xl px-4 py-3 gap-3">
                {/* Traffic Light Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400/80 shadow-xs" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80 shadow-xs" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80 shadow-xs" />
                </div>

                {/* Simulated Address Bar */}
                <div className="flex-1 max-w-sm mx-auto flex items-center justify-between rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs text-slate-700 shadow-xs">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                    <span className="text-emerald-600 font-bold">https://</span>
                    <span className="font-semibold">{TABS.find(t => t.id === activeTab)?.url.replace('https://', '')}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60 font-semibold ml-2 shrink-0">
                    <ShieldCheck className="h-3 w-3 text-teal-600" />
                    Active
                  </span>
                </div>

                {/* Extension Action Button */}
                <div className="flex items-center gap-1.5">
                  <span className="h-7 w-7 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shadow-xs">
                    <Puzzle className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* Task Header HUD */}
              <div className="bg-linear-to-r from-slate-900 to-slate-800 text-white rounded-xl mx-2 my-2.5 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-teal-300 font-semibold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                    CURRENT FOCUS TASK
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight mt-0.5 font-serif">
                    Complete React Authentication
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Timer className="h-3.5 w-3.5 text-teal-300" />
                  <span className="font-bold text-teal-200">25:00</span>
                  <span className="text-slate-400 text-[10px]">SPRINT</span>
                </div>
              </div>

              {/* Tab Selector / Browser Activity */}
              <div className="px-2 pt-1 pb-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center justify-between px-1">
                  <span>BROWSER ACTIVITY TABS</span>
                  <span className="text-[10px] text-teal-600 font-normal">Click a tab to test response</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                          isActive
                            ? "bg-slate-50 border-teal-500 shadow-xs ring-1 ring-teal-500/20"
                            : "bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900 truncate">{tab.label}</span>
                          {tab.status === "productive" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          {tab.status === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {tab.status === "blocked" && <Lock className="h-3.5 w-3.5 text-rose-500" />}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                            tab.status === "productive"
                              ? "bg-emerald-100 text-emerald-800"
                              : tab.status === "warning"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {tab.status === "productive" ? "Productive" : tab.status === "warning" ? "Needs Attention" : "Blocked"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Viewport Simulation Area */}
              <div className="mx-2 mb-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6 min-h-55 flex flex-col justify-between">
                {activeTab === "github" && (
                  <motion.div
                    key="github-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center text-center py-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-3 shadow-inner">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase font-bold text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full mb-1.5 border border-emerald-200">
                      Productive Workspace Signal
                    </span>
                    <h4 className="font-serif text-lg font-bold text-slate-900">
                      github.com matches your active task
                    </h4>
                    <p className="text-xs text-slate-600 max-w-sm mt-1 leading-relaxed">
                      Identified repository &quot;focusflow-ai/frontend&quot; as aligned with authentication development. Focus telemetry advances smoothly.
                    </p>
                  </motion.div>
                )}

                {activeTab === "youtube" && (
                  <motion.div
                    key="youtube-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center text-center py-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mb-3 shadow-inner">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase font-bold text-amber-700 bg-amber-100/60 px-3 py-1 rounded-full mb-1.5 border border-amber-200">
                      Attention Drift Warning
                    </span>
                    <h4 className="font-serif text-lg font-bold text-slate-900">
                      youtube.com requires verification
                    </h4>
                    <p className="text-xs text-slate-600 max-w-sm mt-1 leading-relaxed">
                      Educational video detected, but algorithmic sidebars pose drift risk. A soft warning banner alerts you without breaking state.
                    </p>
                  </motion.div>
                )}

                {activeTab === "instagram" && (
                  <motion.div
                    key="instagram-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center text-center py-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-rose-100/80 text-rose-700 flex items-center justify-center mb-3 shadow-inner">
                      <Lock className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-mono uppercase font-bold text-rose-700 bg-rose-100/60 px-3 py-1 rounded-full mb-1.5 border border-rose-200">
                      Distraction Intercept Engaged
                    </span>
                    <h4 className="font-serif text-lg font-bold text-slate-900">
                      instagram.com blocked by sprint policy
                    </h4>
                    <p className="text-xs text-slate-600 max-w-sm mt-1 leading-relaxed">
                      Social feeds are shielded during active deep work blocks. The extension presents FocusFlow blocked.html until the sprint concludes.
                    </p>
                  </motion.div>
                )}

                {/* Telemetry pill */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                    Focus Score: 94%
                  </span>
                  <span>Incident Log: 1 Block</span>
                </div>
              </div>

              {/* Marketing Demonstration Label */}
              <div className="px-2 pb-1 text-center">
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                  Interactive illustrative demonstration · Simulated telemetry & sample task
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
