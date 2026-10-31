import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  GraduationCap,
  Lightbulb,
  PenTool,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Solutions — FocusFlow AI",
  description:
    "Discover how students, engineers, founders, and knowledge workers use FocusFlow AI to protect attention and accelerate achievement.",
};

const SOLUTIONS = [
  {
    title: "Students & Academic Prep",
    icon: GraduationCap,
    challenge: "Overwhelming syllabi, impending exam deadlines, and solitary study burnout.",
    approach:
      "Drop syllabus documents into AI Planner for daily study blocks. Join virtual Focus Rooms to study alongside classmates with synchronized Pomodoro timers, and form private Focus Circles for semester-long accountability.",
    href: "/focus-rooms",
    link: "Join student Focus Rooms",
  },
  {
    title: "Software Engineers & Developers",
    icon: Code2,
    challenge: "Constant context switching, pull request backlogs, and getting stuck on difficult technical blockers.",
    approach:
      "Run shielded 90-minute coding sprints. Coordinate sprint deliverables in Project Pods, launch synchronized Focus Rooms directly from tasks, and post technical blockers to Unblock Exchange for fast peer help.",
    href: "/dashboard/project-pods",
    link: "Coordinate Project Pods",
  },
  {
    title: "Knowledge Workers & Corporate Teams",
    icon: BriefcaseBusiness,
    challenge: "Calendars crowded with fragmented meetings, leaving no uninterrupted time for high-leverage execution.",
    approach:
      "Coordinate team-wide quiet focus sessions using private Focus Rooms. Use Focus Circles to maintain weekly habit consistency and track cross-functional deliverables inside Project Pods.",
    href: "/dashboard/focus-circles",
    link: "Explore Focus Circles",
  },
  {
    title: "Freelancers & Consultants",
    icon: Search,
    challenge: "Working in isolation without external structure, juggling multiple client deadlines simultaneously.",
    approach:
      "Organize client deliverables into Project Pods with milestone tracking. Join live Focus Rooms for daily coworking momentum, and use Unblock Exchange to get quick peer design and copy reviews.",
    href: "/focus-rooms",
    link: "Cowork in Focus Rooms",
  },
  {
    title: "Creators & Content Authors",
    icon: PenTool,
    challenge: "Blank-page procrastination, solitary editing fatigue, and inconsistent publishing schedules.",
    approach:
      "Structure multi-week content pipelines with AI planning. Maintain weekly production commitments in a Creator Focus Circle, and write inside silent Focus Rooms to preserve creative flow.",
    href: "/dashboard/focus-circles",
    link: "Create an Accountability Circle",
  },
  {
    title: "Founders & Business Owners",
    icon: Rocket,
    challenge: "Operational fires continually pushing strategic company-building milestones off course.",
    approach:
      "Manage company roadmaps and hire deliverables in Project Pods. Run weekly founder check-ins in Focus Circles, resolve operational bottlenecks via Unblock Exchange, and protect morning deep-work blocks.",
    href: "/dashboard/project-pods",
    link: "Manage Business Pods",
  },
  {
    title: "Job Seekers & Technical Prep",
    icon: Lightbulb,
    challenge: "DSA practice, system design mock rounds, and interview prep feel overwhelming in isolation.",
    approach:
      "Generate adaptive 30-day interview roadmaps with AI. Focus alongside peers in Focus Rooms, and ask trusted mentors for mock interview feedback through Unblock Exchange.",
    href: "/dashboard/unblock-exchange",
    link: "Get unblocked on interview prep",
  },
];

export default function SolutionsPage() {
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
            <Badge accent>Focus Tailored to Your Craft</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Make space for your{" "}
              <span className="serif-italic text-gradient-teal">finest work.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              Whether you are preparing for placement exams, shipping a mission-critical codebase, or building a company, FocusFlow shields your cognitive flow.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton href="/register" ariaLabel="Get started">
                Start for Free
              </MagneticButton>
              <MagneticButton href="/features" variant="ghost" ariaLabel="Explore features">
                Explore Features
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">Engineered for High Performers</span>
              <h2 className="section-title mt-3">
                One intelligent focus core. Distinct avenues of progress.
              </h2>
              <p className="section-description mt-3 mx-auto">
                Articulate what you need to achieve, and let FocusFlow AI create the structure, protection, and accountability to get it done.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((solution, index) => {
              const Icon = solution.icon;
              return (
                <Reveal key={solution.title} delay={(index % 3) * 0.08} className="h-full">
                  <article className="glass-card flex h-full flex-col justify-between rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#262832] bg-white/5 text-[#FF4500] mb-5">
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-white">{solution.title}</h3>
                      <p className="mt-2.5 text-xs font-mono font-medium text-[#FF4500]">{solution.challenge}</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">{solution.approach}</p>
                    </div>
                    <Link
                      href={solution.href}
                      className="mt-6 inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase text-[#FF4500] transition-colors hover:text-tide-400"
                    >
                      <span>{solution.link}</span>
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
                <Sparkles className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
                Tailor your focus to what matters today.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Start organizing your goals, shielding your focus sessions, and building authentic daily momentum.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton href="/how-it-works" variant="ghost" ariaLabel="See how it works">
                  See How It Works
                </MagneticButton>
                <MagneticButton href="/register" ariaLabel="Create account">
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
