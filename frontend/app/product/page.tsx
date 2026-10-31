import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  FolderGit2,
  HelpCircle,
  ListChecks,
  Radio,
  Shield,
  Target,
  Timer,
  Users,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Product — FocusFlow AI",
  description:
    "Explore the unified FocusFlow AI system connecting goals, AI planning, focus sessions, distraction shielding, and real telemetry.",
};

const WORKFLOW = [
  {
    number: "01",
    title: "Define Objectives & Milestones",
    description:
      "Anchor your semester exams, engineering sprints, or career goals in a central system. Every daily action directly links back to a measured objective.",
    icon: Target,
    href: "/dashboard/goals",
    link: "Explore goals workspace",
  },
  {
    number: "02",
    title: "Multimodal AI Roadmapping",
    description:
      "Transform freeform text prompts, voice notes, or syllabus PDFs into structured milestones with realistic time budgets and priority tiers.",
    icon: BrainCircuit,
    href: "/dashboard/planner",
    link: "Open AI Planner",
  },
  {
    number: "03",
    title: "Connected Task & Backlog Engine",
    description:
      "Turn roadmaps into sequenced tasks. Track priority, estimated vs. actual minutes, and completion velocity synced with your PostgreSQL database.",
    icon: ListChecks,
    href: "/dashboard/goals?view=tasks",
    link: "Inspect task backlog",
  },
  {
    number: "04",
    title: "Immersive Deep Work Sessions",
    description:
      "Launch Pomodoro or custom focus timers tied directly to your active task. The full-screen focus hud keeps attention locked on the current milestone.",
    icon: Timer,
    href: "/dashboard/sessions",
    link: "View focus sessions",
  },
  {
    number: "05",
    title: "Chrome Extension Distraction Shield",
    description:
      "Enforce site rules right in the browser. Distraction warnings and blocked pages stop reflex tab-hopping without inspecting private page contents.",
    icon: Shield,
    href: "/download",
    link: "Get browser extension",
  },
  {
    number: "06",
    title: "Authentic Telemetry & Self-Improvement",
    description:
      "Measure true focus scores from active window events and idle time. Structured AI insights feed your actual velocity back into the next sprint plan.",
    icon: BarChart3,
    href: "/dashboard/analytics",
    link: "Explore analytics",
  },
  {
    number: "07",
    title: "Real-Time Coworking Focus Rooms",
    description:
      "Work alongside peers in live virtual rooms with synchronized timers, host controls, personal task confidentiality, and voluntary outcome summaries.",
    icon: Radio,
    href: "/focus-rooms",
    link: "Explore Focus Rooms",
  },
  {
    number: "08",
    title: "Long-Term Accountability Focus Circles",
    description:
      "Maintain weekly consistency with private peer groups. Set target commitments, log transparent weekly check-ins, and schedule joint focus sessions.",
    icon: Users,
    href: "/dashboard/focus-circles",
    link: "View Focus Circles",
  },
  {
    number: "09",
    title: "Project Pods Shared Workspaces",
    description:
      "Collaborative project spaces for teams and creators. Organize deliverable milestones, assign tasks, attach notes, and launch Focus Rooms directly from tasks.",
    icon: FolderGit2,
    href: "/dashboard/project-pods",
    link: "Open Project Pods",
  },
  {
    number: "10",
    title: "Unblock Exchange Peer Assistance",
    description:
      "Overcome roadblocks quickly by requesting assistance from trusted circles or pods. Match with peer helpers, co-solve in a room, and log resolution notes.",
    icon: HelpCircle,
    href: "/dashboard/unblock-exchange",
    link: "Launch Unblock Exchange",
  },
];

export default function ProductPage() {
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
            <Badge accent>One Integrated System</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              How FocusFlow AI{" "}
              <span className="serif-italic text-gradient-teal">works together.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              An intelligent productivity and focus system that seamlessly unites goal setting, multimodal planning, task execution, browser-level distraction protection, and authentic progress telemetry.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/register" ariaLabel="Create free account">
                Get Started Free
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
              <span className="section-label">The Complete Product Architecture</span>
              <h2 className="section-title mt-3">
                Ten interconnected layers. Individual discipline meets collaborative momentum.
              </h2>
              <p className="section-description mt-3 mx-auto">
                Rather than juggling separate note-taking apps, site blockers, and timers, FocusFlow aligns personal planning, distraction shielding, and peer collaboration toward the outcomes you care about most.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.number} delay={(index % 3) * 0.08} className="h-full">
                  <article className="glass-card flex h-full flex-col justify-between rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-1 rounded-md border border-[#FF4500]/30">
                          {step.number}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-[#FF4500]" aria-hidden />
                        </div>
                      </div>
                      <h3 className="mt-6 text-xl font-bold font-serif text-white">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
                        {step.description}
                      </p>
                    </div>
                    <Link
                      href={step.href}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase text-[#FF4500] transition-colors hover:text-tide-400"
                    >
                      <span>{step.link}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <Reveal>
          <div className="glass-card relative overflow-hidden rounded-3xl border border-[#262832] bg-[#12131A] px-8 py-16 text-center shadow-2xl max-w-4xl mx-auto">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-[#FF4500]/15 blur-3xl"
            />
            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                <Check className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
                Unify your focus under one roof.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Connect your planning directly to shielded execution. Build your first roadmap with our free tier, or review all feature entitlements.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton href="/pricing" variant="ghost" ariaLabel="Compare free and pro plans">
                  Compare Plans
                </MagneticButton>
                <MagneticButton href="/register" ariaLabel="Create free account">
                  Create Free Account
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
