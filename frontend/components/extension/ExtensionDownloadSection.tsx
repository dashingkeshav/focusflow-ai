"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  Laptop,
  Puzzle,
  ExternalLink,
  Sparkles,
  Info,
  FileCode,
  HardDrive,
} from "lucide-react";

export default function ExtensionDownloadSection() {
  const [downloadingChrome, setDownloadingChrome] = useState(false);
  const [downloadingWin, setDownloadingWin] = useState(false);

  const handleChromeDownload = () => {
    setDownloadingChrome(true);
    setTimeout(() => setDownloadingChrome(false), 2500);
  };

  const handleWinDownload = () => {
    setDownloadingWin(true);
    setTimeout(() => setDownloadingWin(false), 2500);
  };

  return (
    <section id="downloads" className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FAFAF8] via-[#F4F6F9] to-[#FAFAF8] border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Verified Release Assets
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Choose your FocusFlow experience.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Download the official Chrome extension for focused web sessions, or get the desktop companion for cross-window workflow protection.
          </p>
        </div>

        {/* 2-Card Download Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* ------------------------------------------------------------- */}
          {/* CARD 1: Chrome Extension (Primary) */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border-2 border-teal-500/70 p-8 sm:p-10 shadow-2xl shadow-teal-500/10 relative overflow-hidden flex flex-col justify-between">
            {/* Top pill badge */}
            <div className="absolute top-6 right-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-teal-600" />
                Recommended
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 mb-6">
                <Puzzle className="w-7 h-7" />
              </div>

              <div className="text-xs font-mono font-bold text-teal-700 uppercase tracking-wider mb-1">
                Google Chrome & Chromium
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Chrome Extension
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                Lightweight, private browser companion. Blocks distractions, prompts intentional pauses, and synchronizes with your FocusFlow workspace in real time.
              </p>

              {/* Version & Technical Specs */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Version & Architecture:</span>
                  <span className="font-mono font-bold text-slate-900">v3.0.0 (Manifest V3)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Archive Size:</span>
                  <span className="font-mono font-bold text-slate-900">~32 KB (ZIP package)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Installation Type:</span>
                  <span className="font-semibold text-teal-800">Developer Mode &middot; Load unpacked</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Permissions:</span>
                  <span className="font-semibold text-slate-800">tabs, storage, alarms, idle</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="/api/download/extension"
                download="FocusFlow-Chrome-Extension.zip"
                onClick={handleChromeDownload}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-base shadow-lg shadow-teal-600/25 transition-all duration-200 active:scale-[0.99]"
              >
                <Download className="w-5 h-5" />
                <span>
                  {downloadingChrome ? "Downloading ZIP..." : "Download Chrome Extension"}
                </span>
              </a>

              <a
                href="#installation-guide"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 py-1 transition-colors"
              >
                <span>View 7-step unpacked setup instructions</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CARD 2: FocusFlow for Windows (Desktop Companion) */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-sm mb-6">
                <Laptop className="w-7 h-7" />
              </div>

              <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                Desktop Companion &middot; Optional
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                FocusFlow for Windows
              </h3>
              <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                Native Electron desktop companion for tracking active application windows, operating system notifications, and system-wide focus sessions.
              </p>

              {/* Version & Technical Specs */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Version & Platform:</span>
                  <span className="font-mono font-bold text-slate-900">v2.0.0 (Windows x64)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Installer Size:</span>
                  <span className="font-mono font-bold text-slate-900">94.5 MB (EXE Installer)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Package Type:</span>
                  <span className="font-semibold text-slate-800">Electron Native Application</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Code-Signing:</span>
                  <span className="font-medium text-slate-600">Open-source build (Unsigned)</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href="/api/download/desktop"
                download="FocusFlow-Setup.exe"
                onClick={handleWinDownload}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-lg shadow-slate-900/10 transition-all duration-200 active:scale-[0.99]"
              >
                <Download className="w-5 h-5 text-teal-400" />
                <span>
                  {downloadingWin ? "Downloading Installer..." : "Download Windows Installer"}
                </span>
              </a>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 py-1 text-center">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>SmartScreen: Click &apos;More info&apos; &rarr; &apos;Run anyway&apos; on first launch</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
