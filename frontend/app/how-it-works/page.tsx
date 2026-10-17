import type { Metadata } from "next";
import Link from "next/link";
import {
  Target,
  BrainCircuit,
  ListChecks,
  Play,
  Gauge,
  BarChart3,
  TrendingUp,
  Check,
  Radio,
  Users,
  FolderGit2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";

export const metadata: Metadata = {
  title: "How It Works — FocusFlow AI",
  description:
    "Follow the authentic FocusFlow user journey: Define a goal, generate and review an AI plan, organize tasks, start a shielded focus session, record activity, review progress, and continuously adapt.",
};

const JOURNEY = [
  {
    icon: Target,
    title: "1. Define a Goal",
    desc: "Anchor your semester exam, engineering sprint, or career milestone in the Goals workspace. Define priority, category tags, and target completion dates.",
  },
  {
    icon: BrainCircuit,
    title: "2. Generate & Review Plan",
    desc: "Articulate your objective via voice, text, or syllabus document. Gemini AI synthesizes a structured roadmap. User confirmation is required before committing the plan to your database.",
  },
  {
    icon: ListChecks,
    title: "3. Organize Tasks",
    desc: "The confirmed plan populates your task backlog. Adjust priorities (High, Medium, Low), verify estimated minutes, and sequence your daily workload.",
  },
  {
    icon: Play,
    title: "4. Start a Focus Session",
    desc: "Select your target task, connect the FocusFlow Chrome Extension for browser-level shielding, and launch an immersive Pomodoro or custom deep-work session.",
  },
  {
    icon: Gauge,
    title: "5. Record Actual Activity",
    desc: "As you work, the extension enforces site rules and streams authentic tab switches, window blurs, and idle duration to compute your live Focus Score in real time.",
  },
  {
    icon: BarChart3,
    title: "6. Review Progress",
    desc: "When the session completes, database records update immediately. Inspect your measured focus score, distraction logs, streak counters, and unlocked achievements.",
  },
  {
    icon: TrendingUp,
    title: "7. Improve the Next Plan",
    desc: "Evidence-based AI insights (Observation → Evidence → Impact → Recommendation) evaluate your velocity and adapt upcoming time allocations.",
  },
];

const FLOW = [
  { title: "Goal Definition", desc: "Target dates & priorities" },
  { title: "AI Plan Synthesis", desc: "Multimodal Gemini composer" },
  { title: "User Confirmation", desc: "Review & approve tasks" },
  { title: "Focus Session HUD", desc: "Full-screen deep work timer" },
  { title: "Chrome Extension", desc: "Domain shielding & telemetry" },
  { title: "Progress & Insights", desc: "Postgres sync & adaptation" },
];

const DETAIL_CARDS = [
  {
    title: "Telemetry Ingestion",
    points: [
      "Active tab changes and domain transition timestamps",
      "Window focus and blur state monitoring",
      "Inactivity detection via configurable idle thresholds",
      "Session duration and interval completion status",
    ],
  },
  {
    title: "Focus Score Algorithm",
    points: [
      "Starts at 100 benchmark score upon session launch",
      "Calculated deductions for off-task domain navigation",
      "Penalties for prolonged idle drift during active sprints",
      "Sustained uninterrupted intervals preserve high score",
    ],
  },
  {
    title: "Real-Time Shielding",
    points: [
      "Real-time site rules: Productive, Warning, Blocked",
      "Distraction warning banners before attention breaks",
      "Immediate redirection to blocked shield page for off-task sites",
      "Direct integration with Chrome Manifest V3 extension",
    ],
  },
  {
    title: "User Control & Privacy",
    points: [
      "Mandatory user review before any AI plan is saved",
      "Scoped strictly to your personal authenticated account",
      "Domain-level categorization only; no private page text read",
      "Full data portability with PDF & CSV export capabilities",
    ],
  },
];

const COLLAB_STEPS = [
  {
    icon: Radio,
    badge: "Coworking",
    title: "1. Create or Join a Focus Room",
    desc: "Launch a public-listed or private invite-only coworking room with a single click. Share your secure room link or 6-character room code. Host up to 4 participants on Free, up to 12 on Pro. Free guests can join any room without an upgrade prompt.",
    points: [
      "Synchronized Pomodoro timer with host pause, resume & end controls",
      "Live participant status, reconnection resilience on page refresh",
      "Individual task confidentiality — teammates never see your private notes",
      "Post-session summary with voluntary outcome reports",
    ],
    href: "/focus-rooms",
    cta: "Explore Focus Rooms",
  },
  {
    icon: Users,
    badge: "Accountability",
    title: "2. Commit with Focus Circles",
    desc: "Form private habit circles with peers who share long-term goals. Own 1 Circle (up to 4 members) on Free, or up to 10 Circles (12 members each) on Pro. Keep each other committed over weeks and months.",
    points: [
      "Set weekly intentions, milestone targets, and completion notes",
      "Honest streak tracking, overdue notices, and missed check-in alerts",
      "Schedule or spin up joint Focus Rooms directly from the Circle",
      "Role-based permissions (owner, admin, member) and transferrable ownership",
    ],
    href: "/dashboard/focus-circles",
    cta: "View Focus Circles",
  },
  {
    icon: FolderGit2,
    badge: "Shared Workspaces",
    title: "3. Deliver with Project Pods",
    desc: "Coordinate client websites, hackathon builds, content launches, or team sprints. Own 1 active Pod (up to 3 members) on Free, or up to 10 active Pods (10 members each) on Pro.",
    points: [
      "Shared project milestones with visual percentage completion meters",
      "Prioritized task backlog with assignment, estimates, and status tags",
      "Attach reference links, design deliverables, and documentation",
      "Launch a synchronized Focus Room straight from any project task",
    ],
    href: "/dashboard/project-pods",
    cta: "Open Project Pods",
  },
  {
    icon: HelpCircle,
    badge: "Peer Problem Solving",
    title: "4. Request Help via Unblock Exchange",
    desc: "When technical bugs, design decisions, or cognitive fatigue stall progress, publish a structured help request to trusted circles or pods. Free tier includes 3 requests/7d; Pro includes 20 requests/7d.",
    points: [
      "Route requests securely only to selected Circles or Project Pods",
      "Review peer assistance offers, accept the best helper, and get notified",
      "Spin up a dedicated 1-on-1 Focus Room to co-solve the blocker",
      "Log authentic resolution notes to keep project history intact",
    ],
    href: "/dashboard/unblock-exchange",
    cta: "Launch Unblock Exchange",
  },
];

export default function HowItWorksPage() {
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

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-20">
        <Reveal>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-6">
            <Badge accent>End-to-End User Journey</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              How to use FocusFlow{" "}
              <span className="serif-italic text-gradient-teal">from start to finish.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              Step through the complete process: define goals, generate and confirm plans, execute with browser shielding, review real telemetry, and continuously adapt.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/register" ariaLabel="Get started free">
                Start for Free
              </MagneticButton>
              <MagneticButton href="/download" variant="ghost" ariaLabel="Get Chrome Extension">
                Get Chrome Extension
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </section>

      {/* JOURNEY */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">The Authentic 7-Stage Loop</span>
              <h2 className="section-title mt-3">
                From high-level intention to verified execution
              </h2>
              <p className="section-description mt-3 mx-auto">
                Every stage requires your explicit confirmation where decisions matter, while routine tracking is fully automated by the Chrome extension.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={(i % 3) * 0.08} className="h-full">
                  <div className="glass-card flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-card p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-1 rounded-md border border-[#FF4500]/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-[#FF4500]" aria-hidden />
                        </div>
                      </div>
                      <h3 className="mt-6 text-xl font-bold font-serif text-white">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* COLLABORATIVE WORKFLOW */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">Team & Peer Dynamics</span>
              <h2 className="section-title mt-3">
                How collaboration works in FocusFlow
              </h2>
              <p className="section-description mt-3 mx-auto">
                Extend your personal deep work with real-time coworking rooms, accountability circles, project pod workspaces, and structured peer unblocking.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {COLLAB_STEPS.map((collab, idx) => {
              const Icon = collab.icon;
              return (
                <Reveal key={collab.title} delay={idx * 0.08} className="h-full">
                  <article className="glass-card flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-card p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-2.5 py-1 rounded-md border border-[#FF4500]/30">
                          {collab.badge}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-[#FF4500]" aria-hidden />
                        </div>
                      </div>
                      <h3 className="mt-6 text-xl font-bold font-serif text-white">{collab.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">
                        {collab.desc}
                      </p>

                      <ul className="mt-6 space-y-2.5 border-t border-white/5 pt-5">
                        {collab.points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5 text-xs text-gray-400 font-light leading-relaxed">
                            <Check className="h-4 w-4 shrink-0 text-[#FF4500] mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={collab.href}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase text-[#FF4500] transition-colors hover:text-tide-400"
                    >
                      <span>{collab.cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* BEHIND THE SCENES */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">System Architecture</span>
              <h2 className="section-title mt-3">
                How our connected infrastructure executes
              </h2>
              <p className="section-description mt-3 mx-auto">
                Telemetry signals are filtered locally in your browser and securely synchronized to PostgreSQL without logging private browsing history.
              </p>
            </div>
          </Reveal>

          {/* flow */}
          <Reveal delay={0.1}>
            <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {FLOW.map((node, i) => (
                <div key={node.title} className="glass-card rounded-2xl border border-white/10 bg-card p-5 text-center shadow-lg hover:border-white/20 transition-colors">
                  <div className="text-[10px] font-mono font-bold text-[#FF4500] tracking-widest uppercase">
                    Stage {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 text-sm font-bold font-serif text-white">{node.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-400 font-light">{node.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DETAIL_CARDS.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.08} className="h-full">
                <div className="glass-card h-full rounded-3xl border border-white/10 bg-card p-7 shadow-xl">
                  <h3 className="text-base font-bold font-serif text-white mb-5">{card.title}</h3>
                  <ul className="space-y-3">
                    {card.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-xs text-gray-400 font-light leading-relaxed">
                        <Check className="h-4 w-4 shrink-0 text-[#FF4500] mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <Reveal>
          <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-card px-8 py-16 text-center shadow-2xl max-w-4xl mx-auto">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-[#FF4500]/15 blur-3xl"
            />
            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
                Experience the complete loop today.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Define your first goal, let AI generate a candidate plan, and launch your first shielded session in under 3 minutes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton href="/pricing" variant="ghost" ariaLabel="Compare plans">
                  Compare Plans
                </MagneticButton>
                <MagneticButton href="/register" ariaLabel="Create free account">
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
