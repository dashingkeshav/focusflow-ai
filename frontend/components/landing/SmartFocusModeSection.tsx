"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Globe,
  Puzzle,
  Laptop,
  ArrowRight,
  Eye,
  Activity,
} from "lucide-react";

export default function SmartFocusModeSection() {
  const [activeTab, setActiveTab] = useState<"github" | "youtube" | "instagram">("github");

  return (
    <section className="relative mx-auto w-full max-w-7xl px-6 py-24 sm:py-32">
      <div className="text-center">
        <span className="section-label">
          <ShieldCheck className="h-3 w-3" />
          Attention Armor
        </span>
        <h2 className="section-title">
          Smart Focus Mode:{" "}
          <span className="serif-italic text-gradient-teal">Intelligent Context Shielding.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
          FocusFlow synchronizes with your browser to differentiate purposeful research from attention-draining algorithmic rabbit holes.
        </p>
      </div>

      {/* Browser Simulation Container */}
      <div className="mt-14 overflow-hidden rounded-4xl border border-[#262832] bg-[#12131A] shadow-[0_32px_80px_-46px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {/* Browser Top Window Chrome */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#262832] bg-white/3 px-5 py-3 gap-3">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>

          {/* Current Focus Task Bar */}
          <div className="flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-4 py-1 text-xs shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FF4500] animate-pulse" />
            <span className="text-gray-400 font-mono">Current Task:</span>
            <span className="font-bold text-white">Complete React Authentication</span>
          </div>

          {/* Chrome Extension Status */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF4500] font-mono">
            <Puzzle className="h-3.5 w-3.5" />
            <span>Shield Active</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[#262832] bg-black/40 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("github")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 font-medium transition-all ${
              activeTab === "github"
                ? "bg-[#161616] text-white shadow-sm border-t-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>github.com/focusflow-ai</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              Productive
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("youtube")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 font-medium transition-all ${
              activeTab === "youtube"
                ? "bg-[#161616] text-white shadow-sm border-t-2 border-amber-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>youtube.com/watch</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
              Check
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("instagram")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 font-medium transition-all ${
              activeTab === "instagram"
                ? "bg-[#161616] text-white shadow-sm border-t-2 border-[#FF4500]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-[#FF4500]" />
            <span>instagram.com</span>
            <span className="rounded-full bg-[#FF4500]/20 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF4500]">
              Distracting
            </span>
          </button>
        </div>

        {/* Tab Viewport Display */}
        <div className="p-8 sm:p-12">
          {activeTab === "github" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 shadow-inner">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-mono font-bold text-emerald-400">
                ✅ Productive Workspace Signal
              </span>
              <h3 className="mt-3 text-2xl font-serif font-bold text-white">
                Allowed: github.com matches current task
              </h3>
              <p className="mt-2 max-w-lg text-sm text-gray-400">
                FocusFlow identifies this domain as directly relevant to &quot;Complete React Authentication&quot;. No interruption occurs. Focus Score accumulates smoothly.
              </p>
            </motion.div>
          )}

          {activeTab === "youtube" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-mono font-bold text-amber-400">
                ⚠ Context Awareness Triggered
              </span>
              <h3 className="mt-3 text-2xl font-serif font-bold text-white">
                Possibly Distracting: youtube.com
              </h3>
              <p className="mt-2 max-w-lg text-sm text-gray-400">
                Educational tutorials are permitted, but algorithmic recommendations trigger a gentle prompt: &quot;Is this video part of your task?&quot;
              </p>
            </motion.div>
          )}

          {activeTab === "instagram" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FF4500]/10 text-[#FF4500] shadow-inner">
                <Lock className="h-8 w-8" />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF4500]/20 px-3.5 py-1 text-xs font-mono font-bold text-[#FF4500]">
                🔒 Distraction Shield Engaged
              </span>
              <h3 className="mt-3 text-2xl font-serif font-bold text-white">
                Blocked: instagram.com is on your blocked list
              </h3>
              <p className="mt-2 max-w-lg text-sm text-gray-400">
                The Chrome extension intercepts social feeds during active sprints, preserving mental bandwidth and preventing accidental doom-scrolling.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
