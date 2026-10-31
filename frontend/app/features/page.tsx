import type { Metadata } from "next";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  Timer,
  Target,
  BrainCircuit,
  BarChart3,
  ShieldAlert,
  Sparkles,
  FileText,
  Users,
  CircleDot,
  FolderKanban,
  LifeBuoy,
  Camera,
  Puzzle,
  Laptop,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features — FocusFlow AI",
  description:
    "Explore the complete suite of FocusFlow AI features across focus & productivity, insights & protection, collaboration, and hardware workspace integrations.",
};

interface FeatureItem {
  title: string;
  tagline: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  previewType: "timer" | "tasks" | "planner" | "analytics" | "shield" | "insights" | "reports" | "rooms" | "circles" | "pods" | "unblock" | "camera" | "extension" | "desktop";
  badge?: string;
}

interface FeatureCategory {
  category: string;
  subtitle: string;
  items: FeatureItem[];
}

const CATEGORIES: FeatureCategory[] = [
  {
    category: "Focus & Productivity",
    subtitle: "Eliminate cognitive fragmentation with deep-work timers, intelligent task queues, and automated planning.",
    items: [
      {
        title: "Focus Timer HUD",
        tagline: "Distraction-locked Pomodoro sprints",
        description: "Immersive deep-work countdown with customizable sprint intervals, ambient audio soundscapes, and real-time tab shielding. Tied directly to your active task backlog.",
        icon: Timer,
        href: "/dashboard/sessions",
        previewType: "timer",
      },
      {
        title: "Tasks & Goals",
        tagline: "Milestone-driven backlog execution",
        description: "Connect big quarterly objectives to daily micro-sprints. Completing sub-tasks automatically advances goal progress gauges and maintains completion momentum.",
        icon: Target,
        href: "/dashboard/goals",
        previewType: "tasks",
      },
      {
        title: "AI Daily Planner",
        tagline: "Multimodal Gemini-powered roadmapping",
        description: "Speak your intention, type constraints, or upload syllabus documents. Gemini 2.5 synthesizes realistic daily focus blocks that you can review and commit.",
        icon: BrainCircuit,
        href: "/dashboard/planner",
        previewType: "planner",
        badge: "Gemini 2.5",
      },
    ],
  },
  {
    category: "Insights & Protection",
    subtitle: "Quantify your flow state with verifiable browser telemetry and evidence-backed cognitive recommendations.",
    items: [
      {
        title: "Analytics & Trends",
        tagline: "Hourly heatmaps & focus velocity",
        description: "Inspect daily study velocity, tab switch patterns, and peak cognitive performance windows. Derived from real session timestamps with zero simulated metrics.",
        icon: BarChart3,
        href: "/dashboard/analytics",
        previewType: "analytics",
      },
      {
        title: "Distraction Shield",
        tagline: "Manifest V3 browser telemetry",
        description: "Automated 3-strike warning policy. Warns when navigating off-task during sprints and intercepts known dopamine-trap domains before you break flow.",
        icon: ShieldAlert,
        href: "/dashboard/distractions",
        previewType: "shield",
      },
      {
        title: "AI Cognitive Insights",
        tagline: "Evidence-based routine diagnosis",
        description: "Structured diagnostic reports following Observation → Evidence → Impact → Recommendation. Evaluated strictly from your verified PostgreSQL session data.",
        icon: Sparkles,
        href: "/dashboard/insights",
        previewType: "insights",
        badge: "AI Diagnostic",
      },
      {
        title: "Reports & Export",
        tagline: "Executive CSV & PDF data dossiers",
        description: "Generate verifiable documentation of your deep-work hours, milestone velocity, and focus ratings for academic or client reporting.",
        icon: FileText,
        href: "/dashboard/reports",
        previewType: "reports",
      },
    ],
  },
  {
    category: "Collaboration Ecosystem",
    subtitle: "Synchronized coworking rooms, accountability circles, and unblocking exchanges for ambitious teams.",
    items: [
      {
        title: "Focus Rooms",
        tagline: "Live synchronized coworking chambers",
        description: "Cowork with peers in real time with synchronized Pomodoro timers, shared goals, live status telemetry, and ambient focus soundscapes.",
        icon: Users,
        href: "/dashboard/focus-rooms",
        previewType: "rooms",
      },
      {
        title: "Focus Circles",
        tagline: "Persistent study & accountability guilds",
        description: "Form high-trust circles with peers. Track collective focus streaks, milestone completions, and weekly leaderboards without intrusive micromanagement.",
        icon: CircleDot,
        href: "/dashboard/focus-circles",
        previewType: "circles",
      },
      {
        title: "Project Pods",
        tagline: "Time-bound sprint deliverables",
        description: "Deliver shared projects with collaborative kanban task distribution, sprint milestones, and collective hours contributed.",
        icon: FolderKanban,
        href: "/dashboard/project-pods",
        previewType: "pods",
      },
      {
        title: "Unblock Exchange",
        tagline: "Asynchronous peer bottleneck solver",
        description: "Get stuck on an algorithm, thesis question, or code bug? Post a focused blocker and receive timely peer guidance.",
        icon: LifeBuoy,
        href: "/dashboard/unblock-exchange",
        previewType: "unblock",
      },
    ],
  },
  {
    category: "Hardware & Workspace",
    subtitle: "Biometric attention tracking, browser extension enforcement, and native desktop power.",
    items: [
      {
        title: "Camera Attention AI",
        tagline: "MediaPipe local face & gaze detection",
        description: "Optional on-device neural attention monitoring. Detects presence and posture drifts completely client-side in your browser. Zero video frames ever leave your device.",
        icon: Camera,
        href: "/dashboard/sessions",
        previewType: "camera",
        badge: "Local AI",
      },
      {
        title: "Chrome Extension",
        tagline: "Manifest V3 active site blocker",
        description: "Lightweight companion that syncs with your FocusFlow workspace, enforces distraction policies, and records authentic tab switch telemetry.",
        icon: Puzzle,
        href: "/download",
        previewType: "extension",
      },
      {
        title: "Windows Desktop Companion",
        tagline: "Native system integration",
        description: "Companion app for Windows with global keyboard shortcuts, system tray status, and cross-application focus management.",
        icon: Laptop,
        href: "/download",
        previewType: "desktop",
      },
    ],
  },
];

function FeaturePreviewBox({ type }: { type: FeatureItem["previewType"] }) {
  switch (type) {
    case "timer":
      return (
        <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span>SPRINT STATUS</span>
            <span className="text-[#FF4500] font-bold">24:18 REMAINING</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#1A1C24] overflow-hidden">
            <div className="h-full bg-[#FF4500] w-3/4" />
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
            <span>Score: 98/100</span>
            <span className="text-emerald-400">0 Tab Swings</span>
          </div>
        </div>
      );
    case "planner":
      return (
        <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#FF7138] text-[11px] font-bold">
            <Sparkles className="h-3 w-3" />
            <span>GEMINI SCHEDULE READY</span>
          </div>
          <div className="text-zinc-300 text-xs truncate">09:00 · Architecture & Flow Engine (90m)</div>
          <div className="text-zinc-500 text-[11px] truncate">11:00 · Telemetry & API Verification (60m)</div>
        </div>
      );
    case "analytics":
      return (
        <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-4 font-mono text-xs">
          <div className="text-zinc-400 text-[11px] mb-1">WEEKLY PEAK FOCUS</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">4.2h</span>
            <span className="text-[11px] text-emerald-400 font-semibold">+18% this week</span>
          </div>
          <div className="mt-2 flex gap-1 h-6 items-end">
            <div className="bg-[#FF4500] w-full h-3 rounded-xs" />
            <div className="bg-[#FF4500] w-full h-5 rounded-xs" />
            <div className="bg-[#FF4500] w-full h-6 rounded-xs" />
            <div className="bg-[#FF7138] w-full h-4 rounded-xs" />
          </div>
        </div>
      );
    case "camera":
      return (
        <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>ATTENTION TRACKER</span>
            <span className="text-emerald-400 font-bold">PRESENT (LOCAL)</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-tight">
            MediaPipe Client Face Detection · 0 frames sent to server
          </p>
        </div>
      );
    default:
      return (
        <div className="rounded-2xl border border-[#262832] bg-[#08090D] p-4 font-mono text-xs flex items-center justify-between">
          <span className="text-zinc-300 text-[11px]">System Status: Connected</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
      );
  }
}

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-[#08090D] text-[#F4F4F5] pt-28 pb-32">
      {/* Ambient Atmospheric Background Light */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[#FF4500]/10 blur-[180px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#262832] bg-[#12131A] text-xs font-mono font-bold text-[#FF4500] uppercase tracking-wider mb-4 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            <span>Comprehensive Platform Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight font-serif text-white mb-6">
            Engineered for <br />
            <span className="text-gradient-teal italic font-light">pure cognitive velocity.</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Every feature in FocusFlow AI is built to preserve and amplify your deepest intellectual state. Explore the 4 foundational pillars below.
          </p>
        </div>

        {/* 4 Categorized Sections */}
        <div className="space-y-24">
          {CATEGORIES.map((cat, catIdx) => (
            <section key={cat.category} className="space-y-8">
              {/* Category Header */}
              <div className="border-b border-[#262832] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono font-bold text-[#FF7138] uppercase tracking-widest mb-1">
                    Pillar 0{catIdx + 1}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                    {cat.category}
                  </h2>
                </div>
                <p className="text-sm text-zinc-400 max-w-xl">
                  {cat.subtitle}
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group relative rounded-3xl border border-[#262832] bg-[#12131A] p-6 shadow-xl hover:border-[#FF4500]/50 hover:shadow-[0_12px_40px_rgba(255,69,0,0.15)] transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Icon & Badge */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08090D] border border-[#262832] text-[#FF4500] group-hover:scale-105 group-hover:border-[#FF4500]/50 transition-all duration-300">
                            <Icon className="h-5 w-5" />
                          </div>
                          {item.badge && (
                            <span className="rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#FF4500]">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold font-serif text-white mb-1">
                          {item.title}
                        </h3>
                        <div className="text-xs font-mono text-[#FF7138] mb-3">
                          {item.tagline}
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                          {item.description}
                        </p>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-[#262832]">
                        <FeaturePreviewBox type={item.previewType} />

                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-[#FF4500] group-hover:text-[#FF7138] group-hover:translate-x-1 transition-all"
                        >
                          <span>Explore {item.title}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-28 rounded-3xl border border-[#262832] bg-[#12131A] p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4500]/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white mb-3">
            Experience the complete platform in action.
          </h3>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-8">
            Create your account today. Free tier includes personal timers, backlog, extension shielding, and AI planning.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FF4500] px-7 py-3 text-xs sm:text-sm font-bold text-white uppercase tracking-wider hover:bg-[#e03e00] shadow-[0_0_24px_rgba(255,69,0,0.35)] transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#262832] bg-[#08090D] px-7 py-3 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-500 transition-all"
            >
              <span>See Walkthrough</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
