"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Download,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  MonitorDown,
  Puzzle,
  Sparkles,
  ExternalLink,
  Laptop,
  Layers,
  Timer,
  Check,
  Lock,
  Copy,
  Brain,
  Zap,
  Globe,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from "lucide-react";
import Reveal from "@/components/ui/Reveal";

type ActiveTabKey = "github" | "youtube" | "instagram";

interface TabItem {
  id: ActiveTabKey;
  label: string;
  url: string;
  status: "productive" | "warning" | "blocked";
  badge: string;
}

const TABS: TabItem[] = [
  {
    id: "github",
    label: "github.com",
    url: "https://github.com/focusflow-ai/frontend",
    status: "productive",
    badge: "Productive · Allowed",
  },
  {
    id: "youtube",
    label: "youtube.com",
    url: "https://youtube.com/watch?v=react-auth",
    status: "warning",
    badge: "Needs Attention · Warn",
  },
  {
    id: "instagram",
    label: "instagram.com",
    url: "https://instagram.com/explore",
    status: "blocked",
    badge: "Distraction · Blocked",
  },
];

export default function DarkExtensionPage() {
  const [activeTab, setActiveTab] = useState<ActiveTabKey>("github");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [downloadingChrome, setDownloadingChrome] = useState(false);
  const [downloadingWin, setDownloadingWin] = useState(false);
  const [featureMode, setFeatureMode] = useState<"warn" | "block">("warn");
  const [setupTab, setSetupTab] = useState<"windows" | "chrome">("windows");

  // Hash listener to switch tab when navigating to #windows or #chrome
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("chrome") || hash.includes("extension")) {
        setSetupTab("chrome");
      } else if (hash.includes("windows") || hash.includes("desktop")) {
        setSetupTab("windows");
      }
    }
  }, []);

  // 3D subtle perspective tilt
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 180,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 180,
    damping: 24,
  });

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

  const handleCopyUrl = () => {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopySha = () => {
    navigator.clipboard.writeText("321ca860b971ddcc089fc5fc5cc7999648379d4b32caf9fccc92d100519d686d");
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2500);
  };

  const handleChromeDownload = () => {
    setDownloadingChrome(true);
    setTimeout(() => setDownloadingChrome(false), 3000);
  };

  const handleWinDownload = () => {
    setDownloadingWin(true);
    setTimeout(() => setDownloadingWin(false), 4000);
  };

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="relative min-h-screen text-white pb-24 selection:bg-[#FF4500] selection:text-white">
      {/* ===================================================================== */}
      {/* 1. HERO SECTION                                                      */}
      {/* ===================================================================== */}
      <section className="relative pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/4 border border-white/10 text-xs font-mono uppercase tracking-widest text-[#FF4500] backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#FF4500]" />
                FocusFlow Smart Focus Mode
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                Your browser should work{" "}
                <span className="serif-italic text-gradient-orange">for your goals.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
                Keep your current task in focus with configurable distraction protection and a connected FocusFlow workspace.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="/api/download/extension"
                  download="FocusFlow-Chrome-Extension.zip"
                  onClick={handleChromeDownload}
                  id="hero-chrome-download-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#FF4500] hover:bg-[#e03e00] text-white font-semibold text-sm shadow-xl shadow-[#FF4500]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingChrome ? "Downloading ZIP..." : "Get the Chrome Extension"}</span>
                </a>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white font-medium text-sm backdrop-blur-md transition-all duration-200"
                >
                  <span>Explore How It Works</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-gray-400 font-mono pt-2">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF4500]" />
                  Manifest V3 Verified
                </span>
                <span className="text-white/20">&bull;</span>
                <span>Chrome, Brave & Edge</span>
                <span className="text-white/20">&bull;</span>
                <span>Unpacked Setup</span>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive 3D Browser Preview */}
          <div className="lg:col-span-6">
            <Reveal delay={0.2}>
              <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative perspective-distant"
              >
                {/* Ambient glow behind browser */}
                <div className="absolute -inset-4 bg-linear-to-r from-[#FF4500]/20 via-[#FF4500]/5 to-transparent rounded-3xl blur-2xl pointer-events-none opacity-60" />

                <motion.div
                  style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                  }}
                  className="relative rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl shadow-black/80 overflow-hidden"
                >
                  {/* Browser Chrome Header */}
                  <div className="px-4 py-3 border-b border-white/10 bg-white/3 flex items-center justify-between gap-3">
                    {/* Window dots */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>

                    {/* Omnibar / Address bar */}
                    <div className="flex-1 max-w-sm mx-auto px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-gray-300 truncate flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Lock className="w-3 h-3 text-[#FF4500] shrink-0" />
                        <span className="truncate">{currentTab.url}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded shrink-0 ml-2 ${
                          currentTab.status === "productive"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : currentTab.status === "warning"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {currentTab.status}
                      </span>
                    </div>

                    {/* FocusFlow Extension Action Icon */}
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-1 rounded-md bg-[#FF4500]/20 border border-[#FF4500]/40 flex items-center gap-1 text-[11px] font-mono text-[#FF4500] font-bold">
                        <Puzzle className="w-3 h-3 text-[#FF4500]" />
                        <span>FF</span>
                      </div>
                    </div>
                  </div>

                  {/* Browser Tabs Row (Interactive) */}
                  <div className="px-3 pt-2 bg-black/40 border-b border-white/5 flex items-center gap-1 overflow-x-auto">
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-3 py-1.5 rounded-t-lg text-xs font-mono flex items-center gap-2 transition-all ${
                            isActive
                              ? "bg-white/8 text-white border-t border-x border-white/10 font-bold"
                              : "text-gray-400 hover:text-gray-200 hover:bg-white/2"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tab.status === "productive"
                                ? "bg-emerald-400"
                                : tab.status === "warning"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Focus Task HUD inside preview */}
                  <div className="px-5 py-3 bg-linear-to-r from-[#FF4500]/10 via-black to-black border-b border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#FF4500] animate-pulse" />
                      <span className="font-mono text-gray-400 uppercase text-[10px] tracking-wider">
                        Current Focus Task:
                      </span>
                      <span className="font-bold text-white">Complete React Authentication</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-gray-400">
                        Remaining: <strong className="text-white">38:42</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                        Focus Locked
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Browser Viewport Content */}
                  <div className="p-6 sm:p-8 min-h-65 flex flex-col justify-center">
                    {activeTab === "github" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm font-bold text-white">
                              github.com/focusflow-ai/frontend
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Productive &middot; Allowed
                          </span>
                        </div>

                        <div className="bg-black/60 rounded-xl p-3 border border-white/10 font-mono text-xs text-gray-300 space-y-1">
                          <div className="text-gray-500">{"// Pull Request #42: Session JWT Handshake"}</div>
                          <div className="text-emerald-400">{"+ const sessionToken = await auth.getToken();"}</div>
                          <div className="text-emerald-400">{"+ chrome.storage.local.set({ sessionToken });"}</div>
                          <div className="text-gray-400">{"  return <FocusProtectionProvider />;"}</div>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed font-light">
                          FocusFlow recognizes this repository as relevant to your active task. Full uninterrupted access with continuous deep-focus tracking.
                        </p>
                      </div>
                    )}

                    {activeTab === "youtube" && (
                      <div className="space-y-4">
                        {/* Overlay Banner Simulation */}
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              FocusFlow Attention Notice
                            </div>
                            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                              00:26 pause
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/90 leading-relaxed">
                            “You are visiting youtube.com while locked into: <strong>Complete React Authentication</strong>. Is this video required for your task?”
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => setActiveTab("github")}
                              className="px-3 py-1 rounded-md bg-[#FF4500] hover:bg-[#e03e00] text-white text-xs font-semibold transition-colors"
                            >
                              Return to Code (github.com)
                            </button>
                            <span className="text-[11px] text-gray-400">or verify relevant research</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 font-light">
                          Smart warning banner injects unobtrusively on attention-risk domains to break autopilot browsing loops.
                        </p>
                      </div>
                    )}

                    {activeTab === "instagram" && (
                      <div className="text-center py-2 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                          <ShieldAlert className="w-6 h-6" />
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-white">
                            Distraction Intercepted
                          </h4>
                          <p className="text-xs text-gray-300 mt-1 max-w-sm mx-auto">
                            <strong className="text-rose-400">instagram.com</strong> is blocked during your active React sprint.
                          </p>
                        </div>

                        <div>
                          <button
                            onClick={() => setActiveTab("github")}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF4500] hover:bg-[#e03e00] text-white text-xs font-semibold shadow-md transition-colors"
                          >
                            <span>Return to Task &rarr; github.com</span>
                          </button>
                        </div>

                        <p className="text-[11px] font-mono text-gray-500">
                          Redirected to extension blocked.html shield
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Demonstration Label Note */}
                  <div className="px-4 py-2.5 bg-white/2 border-t border-white/5 text-center text-[11px] text-gray-500 font-mono">
                    Interactive demonstration &middot; Click tabs above to test real-time classification
                  </div>
                </motion.div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. CORE FEATURES SECTION                                             */}
      {/* ===================================================================== */}
      <section id="how-it-works" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="section-label">
              <Sparkles className="h-3 w-3" />
              Real Extension Capabilities
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Built for deep focus.{" "}
              <span className="serif-italic text-gradient-orange">Grounded in context.</span>
            </h2>
            <p className="mt-4 text-base text-gray-400 leading-relaxed max-w-2xl mx-auto font-light">
              Unlike blunt all-or-nothing blockers, FocusFlow understands what you are trying to accomplish and protects your attention accordingly.
            </p>
          </div>
        </Reveal>

        {/* 3 Varied Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1: Smart Focus Mode */}
          <Reveal delay={0.1} className="h-full">
            <div className="rounded-3xl border border-white/10 bg-white/2 p-8 backdrop-blur-xl h-full flex flex-col justify-between hover:border-[#FF4500]/40 transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500] flex items-center justify-center mb-6">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-serif">
                  Task-Aware Classification
                </h3>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed font-light">
                  The local <code className="font-mono text-gray-200 text-xs">classifier.js</code> checks active URLs against your focus task keywords. Technical docs and repos stay accessible, while unrelated feeds are intercepted.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Active Context Keywords:
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    auth
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    jwt
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    react
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                    docs
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Distraction Protection */}
          <Reveal delay={0.2} className="h-full">
            <div className="rounded-3xl border border-white/10 bg-white/2 p-8 backdrop-blur-xl h-full flex flex-col justify-between hover:border-[#FF4500]/40 transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-6">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-serif">
                  Configurable Interventions
                </h3>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed font-light">
                  Tailor your protection to your discipline level. Choose gentle in-page countdown overlays to pause mindless habits, or hard shield redirects to stop procrastination cold.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-gray-300 font-medium">Soft Overlay</span>
                  <span className="text-amber-400 font-mono text-[11px]">30s countdown</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-gray-300 font-medium">Hard Shield</span>
                  <span className="text-rose-400 font-mono text-[11px]">blocked.html</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 3: Focus Session Sync */}
          <Reveal delay={0.3} className="h-full">
            <div className="rounded-3xl border border-white/10 bg-white/2 p-8 backdrop-blur-xl h-full flex flex-col justify-between hover:border-[#FF4500]/40 transition-all duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-6">
                  <Radio className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-serif">
                  FocusFlow Workspace Sync
                </h3>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed font-light">
                  The extension communicates directly with your FocusFlow web backend using local JWT storage. Intercepted distractions sync to analytics, while live Focus Rooms and collaboration coworking sessions can be launched straight from the browser popup.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Backend Sync:</span>
                  <span className="text-[11px] font-mono text-cyan-400 bg-white/5 px-2 py-0.5 rounded">
                    FocusFlow JWT API
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Coworking Rooms:</span>
                  <span className="text-[#FF4500] font-medium">1-Click Popup Launch</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Privacy Isolation:</span>
                  <span className="text-emerald-400 font-medium">Domain-only matching</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. VERIFIED DOWNLOADS SECTION                                        */}
      {/* ===================================================================== */}
      <section id="downloads" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="section-label">
              <Sparkles className="h-3 w-3" />
              Verified Releases
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Get FocusFlow for your machine.
            </h2>
            <p className="mt-4 text-base text-gray-400 leading-relaxed max-w-2xl mx-auto font-light">
              Download the official Chrome extension for your browser, or install the native Windows companion for single-window workflow immersion.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Chrome Extension (Primary) */}
          <Reveal className="h-full">
            <article className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border-2 border-[#FF4500]/60 bg-white/3 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-[#FF4500] sm:p-10">
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF4500]/20 border border-[#FF4500]/40 text-[#FF4500] text-xs font-mono uppercase tracking-wider font-bold">
                  Primary
                </span>
              </div>

              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF4500]/10 border border-[#FF4500]/30 text-[#FF4500] shadow-sm">
                  <Puzzle className="h-7 w-7" aria-hidden />
                </div>
                <p className="mt-6 text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#FF4500]">
                  Google Chrome & Chromium
                </p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-serif">
                  Chrome Extension
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-300 font-light">
                  Lightweight browser extension featuring task-aware domain evaluation, overlay countdown warnings, hard shield protection, and direct FocusFlow account sync.
                </p>

                {/* Technical Meta */}
                <div className="mt-6 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Version:</span>
                    <span className="text-white font-bold">v3.0.0 (Manifest V3)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Archive Size:</span>
                    <span className="text-white">~32 KB (.zip archive)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Install Mode:</span>
                    <span className="text-[#FF4500]">Developer Mode &middot; Load unpacked</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <a
                  href="/api/download/extension"
                  download="FocusFlow-Chrome-Extension.zip"
                  onClick={handleChromeDownload}
                  id="download-chrome-zip-btn"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-full bg-[#FF4500] hover:bg-[#e03e00] text-white font-bold text-sm shadow-xl shadow-[#FF4500]/25 transition-all duration-200 active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingChrome ? "Downloading ZIP..." : "Download Chrome Extension"}</span>
                </a>

                <a
                  href="#installation"
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1"
                >
                  <span>View 6-step unpacked setup guide</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
              </div>
            </article>
          </Reveal>

          {/* Windows Desktop (Companion) */}
          <Reveal delay={0.15} className="h-full">
            <article
              id="windows"
              className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/3 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20 sm:p-10"
            >
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-mono uppercase tracking-wider">
                  Companion
                </span>
              </div>

              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-300 shadow-sm">
                  <MonitorDown className="h-7 w-7" aria-hidden />
                </div>
                <p className="mt-6 text-xs font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                  Windows Desktop App
                </p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white font-serif">
                  FocusFlow for Windows
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-300 font-light">
                  A high-performance Windows desktop application providing a dedicated, single-window workspace without distracting browser tabs and native system-level notifications.
                </p>

                {/* Technical Meta */}
                <div className="mt-6 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5 text-xs font-mono text-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Version:</span>
                    <span className="text-white font-bold">v2.0.0 (Windows x64)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Installer Size:</span>
                    <span className="text-white">94.5 MB (.exe installer)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Target Platform:</span>
                    <span className="text-white">Windows 10 / 11 (64-bit)</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-gray-500">SHA-256 Checksum:</span>
                    <button
                      onClick={handleCopySha}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#FF4500] hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
                      title="Click to copy SHA-256 hash"
                    >
                      <span>321ca8...686d</span>
                      {copiedSha ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Direct Static Mirror:</span>
                    <a
                      href="/downloads/FocusFlow-Setup.exe"
                      download="FocusFlow-Setup.exe"
                      className="text-xs text-gray-400 hover:text-[#FF4500] hover:underline"
                    >
                      /downloads/FocusFlow-Setup.exe
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <a
                  href="/api/download/desktop"
                  download="FocusFlow-Setup.exe"
                  onClick={handleWinDownload}
                  id="download-windows-exe-btn"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm shadow-xl transition-all duration-200 active:scale-[0.99]"
                >
                  <Download className="w-4 h-4 text-[#FF4500]" />
                  <span>{downloadingWin ? "Downloading Installer..." : "Download Windows Installer"}</span>
                </a>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 py-1">
                  <Info className="w-3 h-3 text-gray-500" />
                  <span>Windows SmartScreen: Click &apos;More info&apos; &rarr; &apos;Run anyway&apos;</span>
                </div>

                <a
                  href="#installation"
                  onClick={() => setSetupTab("windows")}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1"
                >
                  <span>View 5-step Windows installation guide</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. INTERACTIVE STEP-BY-STEP SETUP GUIDES                             */}
      {/* ===================================================================== */}
      <section id="installation" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/10">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="section-label">
              <Sparkles className="h-3 w-3" />
              Installation & Connection
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Up and running in minutes.
            </h2>
            <p className="mt-4 text-base text-gray-400 leading-relaxed font-light">
              Choose your platform below for complete, verified setup instructions:
            </p>

            {/* Platform Toggle Tabs */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setSetupTab("windows")}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                  setupTab === "windows"
                    ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MonitorDown className="w-4 h-4" />
                <span>Windows App (5 Steps)</span>
              </button>
              <button
                type="button"
                onClick={() => setSetupTab("chrome")}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                  setupTab === "chrome"
                    ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/25"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Puzzle className="w-4 h-4" />
                <span>Chrome Extension (6 Steps)</span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* WINDOWS APP STEPS */}
        {setupTab === "windows" && (
          <div className="space-y-4">
            {[
              {
                num: "01",
                title: "Download FocusFlow-Setup.exe",
                desc: "Get the verified Windows installer (~94.5 MB, 64-bit) via the direct download button or our static mirror.",
                action: (
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/download/desktop"
                      download="FocusFlow-Setup.exe"
                      onClick={handleWinDownload}
                      className="text-xs font-mono font-bold text-[#FF4500] hover:underline"
                    >
                      Download .EXE &rarr;
                    </a>
                    <span className="text-gray-600">|</span>
                    <a
                      href="/downloads/FocusFlow-Setup.exe"
                      download="FocusFlow-Setup.exe"
                      className="text-xs font-mono text-gray-400 hover:text-white"
                    >
                      Static Mirror
                    </a>
                  </div>
                ),
              },
              {
                num: "02",
                title: "Verify File Integrity (Optional & Recommended)",
                desc: "Check the SHA-256 hash in PowerShell: `Get-FileHash .\\FocusFlow-Setup.exe`. Compare with our official build hash.",
                action: (
                  <button
                    onClick={handleCopySha}
                    className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {copiedSha ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Hash Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#FF4500]" />
                        <span>Copy SHA-256 Hash</span>
                      </>
                    )}
                  </button>
                ),
              },
              {
                num: "03",
                title: "Windows SmartScreen Notice",
                desc: "Because FocusFlow is an open-source, community build, Windows SmartScreen may show 'Windows protected your PC'. Click 'More info' and then select 'Run anyway'.",
                callout: (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Click: &quot;More info&quot; &rarr; &quot;Run anyway&quot; to allow the installer to proceed.</span>
                  </div>
                ),
              },
              {
                num: "04",
                title: "Run the NSIS Setup Wizard",
                desc: "Follow the installer wizard. It will install FocusFlow AI to your local user directory (%LOCALAPPDATA%\\Programs\\focusflow-ai) without needing administrator privileges, and create Desktop and Start Menu shortcuts.",
              },
              {
                num: "05",
                title: "Launch & Connect Your FocusFlow Workspace",
                desc: "Open FocusFlow AI from your Desktop. On first launch, enter your FocusFlow website URL (e.g., https://focusflow-ai.app or your local server) and click Connect. Sign in with your existing account to access Focus Rooms, Circles, Pods, and AI Planner.",
              },
            ].map((step, idx) => (
              <Reveal key={step.num} delay={idx * 0.08}>
                <div className="p-6 rounded-2xl border border-white/10 bg-white/2 backdrop-blur-xl hover:border-[#FF4500]/30 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <span className="text-2xl font-mono font-bold text-[#FF4500] shrink-0">
                        {step.num}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-white">{step.title}</h4>
                        <p className="text-xs sm:text-sm text-gray-400 font-light mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                    {step.action && <div className="sm:shrink-0 pl-10 sm:pl-0">{step.action}</div>}
                  </div>
                  {step.callout}
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* CHROME EXTENSION STEPS */}
        {setupTab === "chrome" && (
          <div className="space-y-4">
            {[
              {
                num: "01",
                title: "Download the Extension ZIP",
                desc: "Get the FocusFlow-Chrome-Extension.zip archive (v3.0.0, ~51 KB) from the download button above.",
                action: (
                  <a
                    href="/api/download/extension"
                    download="FocusFlow-Chrome-Extension.zip"
                    onClick={handleChromeDownload}
                    className="text-xs font-mono font-bold text-[#FF4500] hover:underline"
                  >
                    Download ZIP &rarr;
                  </a>
                ),
              },
              {
                num: "02",
                title: "Extract the Archive",
                desc: "Right-click the downloaded ZIP file and extract it to a permanent folder on your machine (e.g., Documents/FocusFlow-Extension).",
              },
              {
                num: "03",
                title: "Open chrome://extensions in Chrome",
                desc: "Type or paste chrome://extensions into your browser address bar and press Enter.",
                action: (
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#FF4500]" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                ),
              },
              {
                num: "04",
                title: "Turn ON 'Developer Mode'",
                desc: "In the top-right corner of the Extensions page, toggle the 'Developer mode' switch to ON.",
              },
              {
                num: "05",
                title: "Click 'Load Unpacked' & Select the Folder",
                desc: "Click 'Load unpacked' in the top-left corner, and choose the extracted folder containing manifest.json.",
              },
              {
                num: "06",
                title: "Pin the Extension & Sign In",
                desc: "Click Chrome's puzzle piece icon, pin FocusFlow AI, and open the popup to connect your FocusFlow workspace and launch Focus Rooms.",
              },
            ].map((step, idx) => (
              <Reveal key={step.num} delay={idx * 0.08}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-white/10 bg-white/2 backdrop-blur-xl hover:border-[#FF4500]/30 transition-all">
                  <div className="flex items-start sm:items-center gap-4">
                    <span className="text-2xl font-mono font-bold text-[#FF4500] shrink-0">
                      {step.num}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white">{step.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-400 font-light mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                  {step.action && <div className="sm:shrink-0 pl-10 sm:pl-0">{step.action}</div>}
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 5. WINDOWS COMPANION ARCHITECTURE & CAPABILITIES                      */}
      {/* ===================================================================== */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="section-label">
              <Laptop className="h-3 w-3" />
              Windows Architecture
            </span>
            <h2 className="mt-4 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Built for dedicated deep work.
            </h2>
            <p className="mt-4 text-base text-gray-400 leading-relaxed font-light">
              Why use the native Windows desktop companion alongside the Chrome extension:
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: MonitorDown,
              title: "Tab-Free Focus",
              desc: "Isolate your daily priorities in an independent window without social bookmarks, news feeds, or dozens of open browser tabs.",
            },
            {
              icon: Zap,
              title: "Native Notifications",
              desc: "Receive real Windows toast notifications when a focus interval completes, when someone joins your Focus Room, or when an unblock offer arrives.",
            },
            {
              icon: Layers,
              title: "System Tray Minimization",
              desc: "Minimize FocusFlow to the Windows system notification tray to run in the background while keeping focus timers active.",
            },
            {
              icon: ShieldCheck,
              title: "Dual Synergy",
              desc: "Use both tools together: the Chrome extension protects your web browsing while the desktop app serves as your mission control.",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={idx * 0.08} className="h-full">
                <div className="h-full rounded-3xl border border-white/10 bg-white/2 p-7 backdrop-blur-xl flex flex-col justify-between hover:border-[#FF4500]/40 transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF4500] mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-white">{item.title}</h3>
                    <p className="mt-2.5 text-xs text-gray-400 font-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. FINAL CALL TO ACTION                                              */}
      {/* ===================================================================== */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/10">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-linear-to-b from-white/4 to-transparent p-10 sm:p-14 text-center relative overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#FF4500] to-transparent" />

            <span className="section-label mx-auto mb-4">
              <Sparkles className="h-3 w-3" />
              Elevate Your Daily Focus
            </span>

            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.15] max-w-2xl mx-auto">
              Start working with{" "}
              <span className="serif-italic text-gradient-orange">unbroken focus.</span>
            </h2>

            <p className="mt-4 text-base text-gray-300 max-w-xl mx-auto font-light leading-relaxed">
              Download the tools designed to protect your attention across Windows, Chrome, and the cloud.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/api/download/desktop"
                download="FocusFlow-Setup.exe"
                onClick={handleWinDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm shadow-xl transition-all duration-200"
              >
                <MonitorDown className="w-4 h-4 text-[#FF4500]" />
                <span>{downloadingWin ? "Downloading Installer..." : "Download for Windows"}</span>
              </a>

              <a
                href="/api/download/extension"
                download="FocusFlow-Chrome-Extension.zip"
                onClick={handleChromeDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[#FF4500] hover:bg-[#e03e00] text-white font-semibold text-sm shadow-xl shadow-[#FF4500]/25 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingChrome ? "Downloading ZIP..." : "Get Chrome Extension"}</span>
              </a>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm backdrop-blur-md transition-all duration-200"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
