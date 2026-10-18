"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";

type ScenarioKey = "productive" | "warning" | "blocked";

interface Scenario {
  id: ScenarioKey;
  tabTitle: string;
  badge: string;
  badgeTone: string;
  title: string;
  url: string;
  domain: string;
  category: "productive" | "possibly_productive" | "distracting";
  reason: string;
  actionText: string;
  telemetryEffect: string;
  mockViewport: React.ReactNode;
}

export default function ExtensionInteractiveDemo() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("productive");

  const scenarios: Record<ScenarioKey, Scenario> = {
    productive: {
      id: "productive",
      tabTitle: "Productive Browsing",
      badge: "Allowed · Productive",
      badgeTone: "bg-emerald-50 text-emerald-800 border-emerald-200",
      title: "Permitted development repository directly aligned with active task",
      url: "https://github.com/focusflow-ai/frontend/pull/42",
      domain: "github.com",
      category: "productive",
      reason: "Domain in developer whitelist + keywords match 'React' and 'Authentication'.",
      actionText: "Full access granted. No banners or prompts.",
      telemetryEffect: "+15 minutes clean focus added to daily score · 0 warnings triggered",
      mockViewport: (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800">github.com</span>
              <span className="text-slate-400">/</span>
              <span className="text-xs text-slate-600">focusflow-ai</span>
              <span className="text-slate-400">/</span>
              <span className="text-xs font-semibold text-teal-700">frontend #42</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Verified On-Task
            </span>
          </div>

          <div className="pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              PR: Implement JWT Auth Tokens & Secure Storage Handlers
            </h4>
            <div className="space-y-1.5 font-mono text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-emerald-700">{"+ const token = await authenticateUser(credentials);"}</div>
              <div className="text-emerald-700">{"+ chrome.storage.local.set({ sessionToken: token });"}</div>
              <div className="text-slate-400">{"// Synchronizes authenticated session with extension service worker"}</div>
            </div>
            <p className="text-xs text-slate-500 italic">
              Telemetry status: User is actively writing code. Extension records continuous engaged sprint.
            </p>
          </div>
        </div>
      ),
    },
    warning: {
      id: "warning",
      tabTitle: "Needs Attention",
      badge: "Context Warning · Ambiguous",
      badgeTone: "bg-amber-50 text-amber-800 border-amber-200",
      title: "Algorithmic video platform detected, but tutorial matches task",
      url: "https://youtube.com/watch?v=react-auth-jwt-guide",
      domain: "youtube.com",
      category: "possibly_productive",
      reason: "Domain is high-distraction, but video title and search query contain task keyword 'React Auth'.",
      actionText: "Gentle non-intrusive warning overlay displays with a 60-second grace timer.",
      telemetryEffect: "Marked as 'Under Review'. If user stays >5 mins without confirmation, warning is logged.",
      mockViewport: (
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-xs relative overflow-hidden">
          {/* Extension Warning Banner Injected via content.js */}
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-xs mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-slate-950" />
              <span className="text-xs font-semibold">
                Attention Check: Is this video required for &quot;Complete React Authentication&quot;?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-[11px] font-bold bg-white text-slate-900 px-2.5 py-1 rounded-md shadow-2xs hover:bg-slate-100 cursor-pointer"
              >
                Yes (Allow 10m)
              </button>
              <button
                type="button"
                className="text-[11px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md hover:bg-slate-800 cursor-pointer"
              >
                Back to Task
              </button>
            </div>
          </div>

          <div className="space-y-2 opacity-80">
            <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-mono text-xs">
              [ Video Player: Full React Auth Architecture Tutorial ]
            </div>
            <h4 className="text-xs font-semibold text-slate-800">
              React 19 Authentication with Secure HttpOnly Cookies
            </h4>
            <p className="text-[11px] text-slate-500">
              Notice: Recommender feed and sidebar comments are subdued during Focus Session.
            </p>
          </div>
        </div>
      ),
    },
    blocked: {
      id: "blocked",
      tabTitle: "Distraction Protection",
      badge: "Blocked · Shield Engaged",
      badgeTone: "bg-rose-50 text-rose-800 border-rose-200",
      title: "Designated social platform intercepted during active focus sprint",
      url: "https://instagram.com/direct/inbox",
      domain: "instagram.com",
      category: "distracting",
      reason: "Domain in Social Blacklist with zero task relevance to current sprint.",
      actionText: "Interception redirect to FocusFlow blocked.html sanctuary page.",
      telemetryEffect: "+1 Distraction incident logged · Session remains preserved without broken state",
      mockViewport: (
        <div className="bg-linear-to-b from-slate-900 to-slate-950 text-white rounded-xl p-6 shadow-md text-center flex flex-col items-center justify-center min-h-55">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-800 mb-2">
            FocusFlow Sanctuary Shield
          </span>
          <h4 className="font-serif text-lg font-bold text-white mb-1">
            instagram.com is shielded
          </h4>
          <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
            You set a commitment to finish <span className="text-teal-300 font-semibold">&quot;Complete React Authentication&quot;</span>. 18 minutes remaining in this sprint.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white px-4 py-1.5 rounded-full shadow-sm cursor-pointer"
            >
              Resume Deep Work
            </button>
            <button
              type="button"
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 cursor-pointer"
            >
              Emergency 1m Override
            </button>
          </div>
        </div>
      ),
    },
  };

  const current = scenarios[activeScenario];

  return (
    <section className="py-24 bg-white text-slate-900 border-b border-slate-200/60 relative overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-50 px-3.5 py-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-teal-800 mb-4 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>EXPLAINABLE CONTEXT ENGINE</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 leading-tight">
            See focus protection in action.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Select a browsing scenario to see how Smart Focus Mode analyzes tabs, alerts on drift, and preserves cognitive momentum without breaking your workflow.
          </p>
        </div>

        {/* Scenario Toggle Bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs max-w-full overflow-x-auto">
            {(Object.keys(scenarios) as ScenarioKey[]).map((key) => {
              const item = scenarios[key];
              const isSelected = activeScenario === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveScenario(key)}
                  className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected ? "text-slate-950" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="scenario-pill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {key === "productive" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    {key === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    {key === "blocked" && <Lock className="h-3.5 w-3.5 text-rose-500" />}
                    <span>{item.tabTitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Scenario Card Stage */}
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-10 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.06)] backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              {/* Left Column: Simulated Browser Viewport */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Address Bar */}
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600 gap-2">
                    <span className="truncate text-[11px]">{current.url}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${current.badgeTone}`}>
                      {current.domain}
                    </span>
                  </div>

                  {/* Viewport content */}
                  <div className="p-4 bg-slate-50/50">
                    {current.mockViewport}
                  </div>
                </div>
              </div>

              {/* Right Column: Explanation Breakdown */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-mono font-bold border mb-3 ${current.badgeTone}`}>
                    {current.badge}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                    {current.title}
                  </h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-teal-800 tracking-wider block mb-1">
                      WHY IT FIRED
                    </span>
                    <p className="text-slate-700 leading-relaxed font-normal">
                      {current.reason}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-600 tracking-wider block mb-1">
                      EXTENSION BEHAVIOR
                    </span>
                    <p className="text-slate-700 leading-relaxed font-normal">
                      {current.actionText}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/60 shadow-2xs">
                    <span className="font-mono text-[10px] uppercase font-bold text-teal-900 tracking-wider block mb-1">
                      TELEMETRY IMPACT
                    </span>
                    <p className="text-teal-900 leading-relaxed font-medium">
                      {current.telemetryEffect}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500">
                  <Info className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span>Configured via FocusFlow extension options & smart classifier v2</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
