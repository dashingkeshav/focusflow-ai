import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Award,
  BarChart3,
  BrainCircuit,
  Check,
  AppWindow,
  EyeOff,
  FolderGit2,
  Goal,
  HelpCircle,
  Lightbulb,
  Radio,
  ShieldCheck,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Features — FocusFlow AI",
  description:
    "Explore FocusFlow AI's multimodal planner, real browser focus monitoring, objective tracking, analytics, and telemetry isolation.",
};

const FEATURES = [
  {
    title: "Multimodal AI Planner",
    description:
      "Voice your intent, type constraints, or upload syllabus documents. The unified composer synthesizes milestones and realistic daily blocks powered by Google Gemini 2.5.",
    icon: BrainCircuit,
    href: "/dashboard/planner",
    link: "Open AI Planner",
  },
  {
    title: "Smart Focus Sessions",
    description:
      "Immersive full-screen focus timers with custom durations, Pomodoro rhythms, ambient audio, and strict distraction policies tied directly to your tasks.",
    icon: Timer,
    href: "/dashboard/sessions",
    link: "View focus sessions",
  },
  {
    title: "Authentic Telemetry Monitoring",
    description:
      "Real-time focus scores derived from measured tab switches, active window focus shifts, and idle intervals during work sprints. No synthetic numbers.",
    icon: Activity,
    href: "/dashboard/sessions",
    link: "Live score telemetry",
  },
  {
    title: "Objectives & Linked Backlog",
    description:
      "Connect long-term milestones to immediate tasks. Completing tasks automatically updates progress gauges and unblocks dependent milestones.",
    icon: Goal,
    href: "/dashboard/goals",
    link: "Organize objectives",
  },
  {
    title: "Behavioral Analytics & Trends",
    description:
      "Inspect daily focus velocity, tab switch patterns, and peak cognitive performance windows with 7-day history in Free and all-time trends in Pro.",
    icon: BarChart3,
    href: "/dashboard/analytics",
    link: "Explore analytics",
  },
  {
    title: "Evidence-Based AI Insights",
    description:
      "Structured analysis following Observation → Evidence → Impact → Recommendation. Strictly derived from your verified PostgreSQL activity log.",
    icon: Lightbulb,
    href: "/dashboard/insights",
    link: "Inspect AI insights",
  },
  {
    title: "Verified Milestones & Badges",
    description:
      "Celebrate hard-earned focus streaks and task milestones with restrained, physical unlock cards backed strictly by real database queries.",
    icon: Award,
    href: "/dashboard/goals?view=achievements",
    link: "View achievements",
  },
  {
    title: "Chrome Extension Protection",
    description:
      "Enforces site rules, detects off-task tab switching, and logs incident timestamps directly to your personal PostgreSQL log.",
    icon: AppWindow,
    href: "/download",
    link: "Get Chrome extension",
  },
  {
    title: "Privacy by Design",
    description:
      "Only interaction counts and domain classifications are analyzed locally. No webpage text, search queries, or camera recordings are ever collected.",
    icon: ShieldCheck,
    href: "/privacy",
    link: "Read privacy architecture",
  },
  {
    title: "Focus Rooms (Real-Time Coworking)",
    description:
      "Live coworking spaces with synchronized timers (host up to 4 in Free, 12 in Pro). Keep personal tasks confidential while focusing alongside motivated peers.",
    icon: Radio,
    href: "/focus-rooms",
    link: "Explore Focus Rooms",
  },
  {
    title: "Focus Circles (Habit Accountability)",
    description:
      "Private weekly accountability groups (own 1 in Free, up to 10 in Pro). Track target commitments, transparent check-ins, and shared focus streaks.",
    icon: Users,
    href: "/dashboard/focus-circles",
    link: "View Focus Circles",
  },
  {
    title: "Project Pods (Shared Workspaces)",
    description:
      "Lightweight project spaces for client work, apps, or content (own 1 in Free, up to 10 in Pro). Coordinate milestones, assign tasks, and trigger focus sprints.",
    icon: FolderGit2,
    href: "/dashboard/project-pods",
    link: "Open Project Pods",
  },
  {
    title: "Unblock Exchange (Peer Problem Solving)",
    description:
      "Structured assistance requests (3/7d in Free, 20/7d in Pro). Tap trusted circles and pods for help, spin up pair focus rooms, and log outcome notes.",
    icon: HelpCircle,
    href: "/dashboard/unblock-exchange",
    link: "Launch Unblock Exchange",
  },
];

const SIGNALS = [
  "Verified tab and active window focus shifts",
  "Idle detection with configurable inactivity thresholds",
  "Session elapsed duration and dynamic focus score algorithm",
  "PostgreSQL-linked goal and task completions",
];

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-[#FF4500] selection:text-white">
      {/* Background Dot Matrix Pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <section className="relative z-10 pt-36 pb-20">
        <Reveal>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-6">
            <Badge accent>Complete Intelligence Suite</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Focus deeper with{" "}
              <span className="serif-italic text-gradient-teal">complete clarity.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              Explore every capability implemented in FocusFlow AI: multimodal planning, task backlogs, protected focus sessions, real browser telemetry, and honest analytics.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/register" ariaLabel="Create free account">
                Start for Free
              </MagneticButton>
              <MagneticButton href="/how-it-works" variant="ghost" ariaLabel="See how it works">
                See How It Works
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">Unified Architecture</span>
              <h2 className="section-title mt-3">
                Every tool crafted to protect your concentration.
              </h2>
              <p className="section-description mt-3 mx-auto">
                Every module feeds directly into your personal workspace, turning scattered intentions into measurable accomplishments.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={(index % 3) * 0.08} className="h-full">
                  <article className="glass-card flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-card p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#FF4500] mb-5">
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-white">{feature.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">{feature.description}</p>
                    </div>
                    <Link
                      href={feature.href}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase text-[#FF4500] transition-colors hover:text-tide-400"
                    >
                      {feature.link}
                      <span aria-hidden>→</span>
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 max-w-7xl mx-auto">
          <Reveal>
            <span className="section-label">Verifiable Telemetry</span>
            <h2 className="section-title mt-3">
              Feedback built on{" "}
              <span className="serif-italic text-gradient-teal">authentic signals.</span>
            </h2>
            <p className="section-description mt-3">
              FocusFlow computes session metrics from genuine activity recorded during your work intervals. When no sessions exist, honest empty states are presented instead of synthetic filler data.
            </p>
            <Link
              href="/how-it-works"
              className="mt-6 inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#FF4500] transition-colors hover:text-tide-400"
            >
              Understand how signals are measured
              <span aria-hidden>→</span>
            </Link>
          </Reveal>

          <div className="space-y-3.5">
            {SIGNALS.map((signal, index) => (
              <Reveal key={signal} delay={index * 0.07}>
                <div className="glass-card flex items-center gap-4 rounded-2xl border border-white/10 bg-card px-6 py-4 shadow-xl">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    {index === 0 ? (
                      <EyeOff className="h-4 w-4 text-[#FF4500]" aria-hidden />
                    ) : (
                      <Check className="h-4 w-4 text-[#FF4500]" aria-hidden />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-200">{signal}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <Reveal>
          <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-card px-8 py-16 text-center shadow-2xl max-w-4xl mx-auto">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-[#FF4500]/15 blur-3xl"
            />
            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                <Zap className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
                A calmer, focused workday begins with one choice.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Unite your goals, plans, and protected focus sessions under one intelligent roof.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton href="/download" variant="ghost" ariaLabel="Get the Chrome extension">
                  Get Chrome Extension
                </MagneticButton>
                <MagneticButton href="/register" ariaLabel="Start free today">
                  Start Free Today
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
