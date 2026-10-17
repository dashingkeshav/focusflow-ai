"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  ShieldAlert,
  Zap,
  Activity,
  SlidersHorizontal,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  EyeOff,
  Flame,
  Globe,
  Radio,
  FileCode,
  AlertCircle,
} from "lucide-react";

export default function ExtensionBento() {
  // Card 1: Task toggle state
  const [selectedTask, setSelectedTask] = useState<"auth" | "design">("auth");

  // Card 2: Protection mode state
  const [shieldMode, setShieldMode] = useState<"warn" | "block">("warn");

  // Card 5: Domain toggle state
  const [customRules, setCustomRules] = useState<{ domain: string; status: "allowed" | "blocked" }[]>([
    { domain: "github.com", status: "allowed" },
    { domain: "stackoverflow.com", status: "allowed" },
    { domain: "reddit.com", status: "blocked" },
    { domain: "x.com", status: "blocked" },
  ]);

  const toggleDomain = (domainName: string) => {
    setCustomRules((prev) =>
      prev.map((item) =>
        item.domain === domainName
          ? { ...item, status: item.status === "allowed" ? "blocked" : "allowed" }
          : item
      )
    );
  };

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Engineered for deep focus. Built with transparency.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Every feature in the FocusFlow extension is designed around one goal: keeping your current intent alive without intruding on your private web life.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 1: Task-Aware Browsing (Spans 2 columns on desktop) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between group hover:border-teal-300 transition-all duration-300">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-teal-50 to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold uppercase tracking-wide">
                  <Brain className="w-3.5 h-3.5 text-teal-600" />
                  Context-Driven Classifier
                </div>
                <span className="text-xs font-mono text-slate-500">classifier.js v3.0.0</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Task-Aware Browsing
              </h3>
              <p className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Unlike blunt blockers that treat all web visits the same, FocusFlow recalculates domain relevance based on your active task title and keywords.
              </p>
            </div>

            {/* Interactive demo widget */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Switch Active Task to test rule shift:
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-200/70 border border-slate-300 text-xs font-semibold">
                  <button
                    onClick={() => setSelectedTask("auth")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedTask === "auth"
                        ? "bg-white text-teal-800 font-bold shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    React Authentication
                  </button>
                  <button
                    onClick={() => setSelectedTask("design")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedTask === "design"
                        ? "bg-white text-teal-800 font-bold shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    UI Design System
                  </button>
                </div>
              </div>

              {/* Dynamic rule display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Target Domain</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {selectedTask === "auth" ? "jwt.io" : "figma.com"}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Relevant (Allowed)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Coding Hub</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">github.com</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Core Workspace
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Off-Task Domain</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {selectedTask === "auth" ? "pinterest.com" : "leetcode.com"}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <AlertCircle className="w-3 h-3" /> Warn or Block
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 2: Distraction Protection (Configurable action) */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between group hover:border-amber-300 transition-all duration-300">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wide mb-4">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Dual Intervention
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Distraction Protection
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Choose between gentle mindfulness nudges or hard shielding when temptation strikes.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-slate-600">Intervention Mode:</span>
                <div className="inline-flex p-1 rounded-lg bg-slate-200/80 text-[11px] font-semibold">
                  <button
                    onClick={() => setShieldMode("warn")}
                    className={`px-2.5 py-1 rounded ${
                      shieldMode === "warn"
                        ? "bg-white text-amber-900 font-bold shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Overlay Banner
                  </button>
                  <button
                    onClick={() => setShieldMode("block")}
                    className={`px-2.5 py-1 rounded ${
                      shieldMode === "block"
                        ? "bg-white text-rose-900 font-bold shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    Full Shield
                  </button>
                </div>
              </div>

              {shieldMode === "warn" ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    30-Second Mindfulness Banner
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Injects a calm top banner reminding you of your intent before allowing you to proceed.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    Hard Redirect to blocked.html
                  </div>
                  <p className="text-[11px] text-rose-800 leading-snug">
                    Instantly redirects the tab to the extension shield page with an option to return to work.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 3: Focus Session Connection */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between group hover:border-cyan-300 transition-all duration-300">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold uppercase tracking-wide mb-4">
                <Radio className="w-3.5 h-3.5 text-cyan-600" />
                Backend Sync
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Focus Session Sync
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Seamless real-time synchronization between your browser extension and the authenticated FocusFlow workspace.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Target API</span>
                <code className="text-[11px] font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  localhost:5001/api/sessions
                </code>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Transport</span>
                <span className="font-semibold text-slate-900">Background HTTP Fetch + JWT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Active Session</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 4: Activity Timeline */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between group hover:border-teal-300 transition-all duration-300">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold uppercase tracking-wide mb-4">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                Live Feed
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Activity Timeline
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Accurate logging of focus checkpoints, domain switches, and intercepted distractions.
              </p>
            </div>

            <div className="mt-6 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-slate-800">github.com</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">14:32 — Allowed</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="font-mono text-amber-900">youtube.com</span>
                </div>
                <span className="text-[10px] text-amber-700 font-mono">14:45 — Banner Prompt</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="font-mono text-rose-900">instagram.com</span>
                </div>
                <span className="text-[10px] text-rose-700 font-mono">14:48 — Blocked</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 5: Website Rules */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between group hover:border-indigo-300 transition-all duration-300">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold uppercase tracking-wide mb-4">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                Custom Lists
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Configurable Domain Rules
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Click any domain below to toggle its status directly in your rule configuration.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Click to toggle rule policy:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {customRules.map((rule) => (
                  <button
                    key={rule.domain}
                    onClick={() => toggleDomain(rule.domain)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                      rule.status === "allowed"
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                        : "bg-rose-50/80 border-rose-300 text-rose-900 hover:bg-rose-100"
                    }`}
                  >
                    <span className="font-mono font-medium text-[11px]">{rule.domain}</span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        rule.status === "allowed"
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-rose-200 text-rose-900"
                      }`}
                    >
                      {rule.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BENTO CARD 6: Privacy & Permissions */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-3 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wide">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                Zero-Intrusive Privacy Architecture
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                No keylogging. No private URL scraping. No selling data.
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                The FocusFlow extension only checks the top-level hostname against your active session rules. Full paths, query parameters, form fields, and messages never leave your browser.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <div className="text-teal-400 font-bold text-sm">Local Storage</div>
                <div className="text-[11px] text-slate-300">Rules stay on device</div>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <div className="text-cyan-400 font-bold text-sm">Strict MV3</div>
                <div className="text-[11px] text-slate-300">No background DOM snooping</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
