"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Puzzle,
  Server,
  Zap,
  BarChart,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Database,
  Lock,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface NodeInfo {
  id: string;
  name: string;
  category: string;
  role: string;
  details: string;
  dataTransmitted: string;
  security: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NODES: NodeInfo[] = [
  {
    id: "browser",
    name: "Chrome Browser",
    category: "HOST ENVIRONMENT",
    role: "User tab lifecycle & navigation events",
    details:
      "Listens to tab activation and URL changes via chrome.tabs API. Evaluates domain hostnames without inspecting DOM contents or reading password inputs.",
    dataTransmitted: "Hostname only (e.g. 'github.com')",
    security: "Sandbox isolated; no full URL queries or cookie access",
    icon: Globe,
  },
  {
    id: "extension",
    name: "FocusFlow Extension",
    category: "SERVICE WORKER (MV3)",
    role: "Local classification & enforcement",
    details:
      "Runs classifier.js locally in memory. Compares current domain to active task keywords and local blocklist. Decides whether to allow, warn via overlay, or redirect.",
    dataTransmitted: "Intervention timestamps & deflected domain counts",
    security: "Manifest V3 scoped permissions; zero external trackers",
    icon: Puzzle,
  },
  {
    id: "api",
    name: "FocusFlow API",
    category: "EXPRESS BACKEND",
    role: "Session synchronization & authentication",
    details:
      "Authenticates extension requests using Bearer JWT. Receives session heartbeat, active task state, and stores session summary metrics in MongoDB.",
    dataTransmitted: "Session start/end, task title, summary stats",
    security: "JWT header validation, CORS restricted, rate limited",
    icon: Server,
  },
  {
    id: "session",
    name: "Focus Session",
    category: "REAL-TIME STATE",
    role: "Synchronized focus timer & intent",
    details:
      "Maintains the active timer, countdown progress, and protection policies. Can be controlled from both the extension popup and the web dashboard concurrently.",
    dataTransmitted: "Remaining seconds, active state, task tags",
    security: "State tied strictly to authenticated user UUID",
    icon: Zap,
  },
  {
    id: "dashboard",
    name: "Dashboard & Analytics",
    category: "NEXT.JS WORKSPACE",
    role: "Insights, reports & productivity charts",
    details:
      "Visualizes deep focus duration, distraction prompts avoided, and daily productivity trends. No Windows app required—everything syncs via web.",
    dataTransmitted: "Aggregated charts, streak records, completion logs",
    security: "Encrypted at rest, user-tenant data boundary",
    icon: BarChart,
  },
];

export default function ExtensionSystemDiagram() {
  const [activeNodeId, setActiveNodeId] = useState<string>("extension");

  const currentNode = NODES.find((n) => n.id === activeNodeId) || NODES[1];
  const Icon = currentNode.icon;

  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAFAF8] via-[#F4F7FB] to-[#FAFAF8] overflow-hidden border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Connected Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            How the Extension connects to your FocusFlow workspace.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The extension integrates directly with your FocusFlow web account and API. Click any node in the data pipeline to inspect its exact role and security guarantees.
          </p>
        </div>

        {/* Interactive Architecture Pipeline */}
        <div className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 relative">
            {NODES.map((node, index) => {
              const NodeIcon = node.icon;
              const isSelected = node.id === activeNodeId;

              return (
                <div key={node.id} className="relative flex flex-col items-center">
                  <button
                    onClick={() => setActiveNodeId(node.id)}
                    className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 relative group flex flex-col justify-between h-40 ${
                      isSelected
                        ? "bg-white border-teal-500 shadow-xl shadow-teal-500/10 ring-2 ring-teal-500/20"
                        : "bg-white/80 border-slate-200/90 hover:border-teal-300 hover:bg-white shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-teal-600 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700"
                          }`}
                        >
                          <NodeIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                          0{index + 1}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                        {node.category}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
                        {node.name}
                      </h4>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium truncate mt-2">
                      {node.role}
                    </div>

                    {/* Active Indicator Pin */}
                    {isSelected && (
                      <motion.div
                        layoutId="active-node-indicator"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-teal-600 rounded-full"
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deep Node Inspector Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNode.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
          >
            {/* Ambient accent header */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-sky-500" />

            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">
                      Component Inspector &middot; {currentNode.category}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {currentNode.name}
                    </h3>
                  </div>
                </div>

                <p className="text-slate-700 text-base sm:text-lg leading-relaxed">
                  {currentNode.details}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Web-Only Sync (No Windows app required)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                    <Lock className="w-3.5 h-3.5 text-cyan-600" />
                    JWT Secure Channel
                  </span>
                </div>
              </div>

              {/* Data & Security Spec Card */}
              <div className="w-full lg:w-96 p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 shrink-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pipeline Telemetry
                  </span>
                  <span className="text-[11px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Verified
                  </span>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Data Handled
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1 leading-snug">
                    {currentNode.dataTransmitted}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Privacy Guarantee
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1 leading-snug">
                    {currentNode.security}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Real-time state propagates in &lt; 50ms</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
