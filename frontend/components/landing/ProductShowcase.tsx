"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  ListTodo,
  Shield,
  Target,
  Timer,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

const STAGES = [
  { key: "goal", icon: Target, label: "Goals", eyebrow: "01 · Direction" },
  { key: "tasks", icon: ListTodo, label: "Tasks", eyebrow: "02 · Execution" },
  { key: "plan", icon: Bot, label: "AI Planner", eyebrow: "03 · Intelligence" },
  { key: "session", icon: Timer, label: "Focus Session", eyebrow: "04 · Attention" },
  { key: "analytics", icon: BarChart3, label: "Analytics", eyebrow: "05 · Learning" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

const PANELS: Record<
  StageKey,
  { title: string; description: string; details: string[] }
> = {
  goal: {
    title: "Turn a direction into a plan",
    description: "Your goals, milestones, deadlines and linked tasks stay connected.",
    details: ["Goals you create appear here", "Milestones keep each step in view"],
  },
  tasks: {
    title: "Keep the next step clear",
    description: "Prioritize, schedule and complete work without losing sight of why it matters.",
    details: ["Tasks stay linked to your goals", "Due dates and priorities at a glance"],
  },
  plan: {
    title: "Make time for what matters",
    description: "Build a schedule around your priorities and available time, then adjust as work changes.",
    details: ["AI suggestions are reviewed before saving", "Your plan adapts to your real workload"],
  },
  session: {
    title: "Give focused work its own space",
    description: "Start a session to track real focus activity and connect browser protection.",
    details: ["Session telemetry appears while you work", "No session activity is invented"],
  },
  analytics: {
    title: "Learn from work you actually did",
    description: "Your trends, insights and reports grow from real sessions and task activity.",
    details: ["Your analytics start with your activity", "No history means no fabricated trends"],
  },
};

export default function ProductShowcase() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<StageKey>("goal");
  const selected = STAGES.find((stage) => stage.key === active)!;
  const Icon = selected.icon;

  return (
    <section id="product" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-48 top-12 h-120 w-120 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.12),transparent_70%)] blur-2xl"
      />
      <div className="section-shell">
        <SectionHeading
          label="Inside FocusFlow"
          title={
            <>
              Everything connected to{" "}
              <span className="serif-italic text-gradient-ai">your progress.</span>
            </>
          }
          description="One considered workspace links your goals, plans and focus sessions to the work you actually complete."
        />

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {STAGES.map((stage, index) => {
              const StageIcon = stage.icon;
              const isActive = active === stage.key;
              return (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setActive(stage.key)}
                  aria-pressed={isActive}
                  className={`group flex min-w-max items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all lg:min-w-0 ${
                    isActive
                      ? "border-[#FF4500]/50 bg-card shadow-[0_12px_32px_-15px_rgba(255,69,0,0.3)]"
                      : "border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isActive ? "bg-[#FF4500]/20 text-[#FF4500]" : "bg-white/5 text-gray-400"
                  }`}>
                    <StageIcon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-white">{stage.label}</span>
                    <span className="mt-0.5 hidden text-[10px] font-mono text-gray-400 sm:block">{stage.eyebrow}</span>
                  </span>
                  <span className="ml-auto hidden h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-all group-hover:translate-x-0.5 group-hover:text-[#FF4500] lg:flex">
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="sr-only">Step {index + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="relative perspective-distant">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-[30px] bg-linear-to-br from-[#FF4500]/15 via-transparent to-orange-500/10 blur-2xl"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, y: 10, rotateX: 2 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative min-h-73 overflow-hidden rounded-[26px] border border-white/10 bg-card p-6 shadow-[0_28px_74px_-44px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-8"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-gray-400">
                    <Icon className="h-3.5 w-3.5 text-[#FF4500]" aria-hidden />
                    {selected.eyebrow}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-mono font-semibold text-gray-300">
                    FocusFlow workspace
                  </span>
                </div>

                <div className="grid gap-7 pt-7 sm:grid-cols-[1fr_0.82fr] sm:items-center">
                  <div>
                    <h3 className="max-w-sm text-xl font-serif font-semibold leading-tight tracking-tight text-white sm:text-2xl">
                      {PANELS[active].title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-400">
                      {PANELS[active].description}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      {active === "session" ? (
                        <Shield className="h-4 w-4 text-[#FF4500]" aria-hidden />
                      ) : (
                        <Bot className="h-4 w-4 text-[#FF4500]" aria-hidden />
                      )}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-gray-400">
                        {active === "session" ? "Live when you begin" : "A workspace that adapts"}
                      </span>
                    </div>
                    <ul className="space-y-3">
                      {PANELS[active].details.map((detail, index) => (
                        <li key={detail} className="flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            index === 0 ? "bg-[#FF4500]/20 text-[#FF4500]" : "bg-white/10 text-gray-400"
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          </span>
                          <span className="text-[11px] leading-relaxed text-gray-300">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
