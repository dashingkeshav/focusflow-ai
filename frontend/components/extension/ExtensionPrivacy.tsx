"use client";

import React from "react";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  CheckCircle2,
  XCircle,
  FileText,
  Camera,
  Key,
  Server,
  Sparkles,
  Layers,
} from "lucide-react";

const PERMISSION_ROWS = [
  {
    permission: "tabs",
    why: "Detects the active URL hostname (e.g. github.com) when you switch or open tabs to evaluate if it matches your focus task.",
    accessLevel: "Domain name only",
    restricted: "Never reads tab history, form inputs, or search terms.",
  },
  {
    permission: "storage (local)",
    why: "Stores your custom blocklist, allowlist, and temporary FocusFlow JWT auth token on your computer.",
    accessLevel: "Local device only",
    restricted: "Never synchronized to third-party ad networks or brokers.",
  },
  {
    permission: "alarms",
    why: "Runs background countdown intervals for the 30-second warning banner and focus session timers.",
    accessLevel: "Internal timer engine",
    restricted: "No network requests triggered by timer ticks.",
  },
  {
    permission: "idle",
    why: "Detects when you are away from the keyboard to pause or warn about inactive focus sessions.",
    accessLevel: "State flag (active / idle)",
    restricted: "Zero keystroke timing or hardware telemetry logged.",
  },
  {
    permission: "<all_urls> (Host)",
    why: "Required strictly to inject the overlay warning banner (overlay.js) on flagged attention-risk pages.",
    accessLevel: "Overlay injection only",
    restricted: "Does not inspect page DOM, private messages, or credentials.",
  },
];

export default function ExtensionPrivacy() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#FAFAF8] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            Transparent Data Policy
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Privacy is a principle, not a toggle.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            The FocusFlow Chrome Extension is built around strict data minimization. Here is an honest, line-by-line audit of what permissions are requested and why.
          </p>
        </div>

        {/* What Stays Local vs What is Transmitted Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Card 1: What stays on your device */}
          <div className="rounded-3xl bg-white border border-emerald-200 p-8 shadow-xl shadow-emerald-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Zero Cloud Ingestion
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  What Stays Strictly On Your Device
                </h3>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No keystroke logging:</strong> We never capture typing, keystrokes, or search bar inputs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No DOM content scraping:</strong> Page text, articles, emails, and code snippets are never read.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No password or form access:</strong> Authentication forms, card numbers, and credentials remain untouched.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>No camera access in extension:</strong> The Chrome extension contains zero camera APIs or webcam hooks.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: What is transmitted */}
          <div className="rounded-3xl bg-white border border-teal-200 p-8 shadow-xl shadow-teal-500/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Synchronized to your account
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  What Is Transmitted To FocusFlow API
                </h3>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong>Active task title & target:</strong> Matches your browser session with your dashboard timer.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong>Focus session timestamps:</strong> Start, pause, and completion times for daily productivity charts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong>Intervention counts:</strong> Total number of distracted domain nudges deflected during the block.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong>Encrypted JWT auth token:</strong> Used to securely verify session ownership against your user account.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Detailed Manifest Permissions Table */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/70">
            <h3 className="text-xl font-bold text-slate-900">
              Manifest V3 Permissions Breakdown
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Direct audit of all permissions declared in <code className="font-mono text-teal-700 font-semibold">extension/manifest.json</code>.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">Permission</th>
                  <th className="py-4 px-6">Operational Purpose</th>
                  <th className="py-4 px-6">Scope of Access</th>
                  <th className="py-4 px-6">Strict Restrictions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-slate-700">
                {PERMISSION_ROWS.map((row) => (
                  <tr key={row.permission} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-teal-700 whitespace-nowrap">
                      {row.permission}
                    </td>
                    <td className="py-4 px-6 text-slate-800 leading-snug">
                      {row.why}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 whitespace-nowrap">
                      {row.accessLevel}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs leading-snug">
                      {row.restricted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
