"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Target, Trophy } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

/**
 * Goals + Tasks — shows how real user actions propagate through the product.
 */

const CHAIN = [
  {
    icon: Check,
    label: "Task completed",
    detail: "Tasks reflect work you complete",
    tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    icon: Target,
    label: "Goal updates",
    detail: "Linked milestones update with your work",
    tone: "text-[#FF4500] border-[#FF4500]/30 bg-[#FF4500]/10",
  },
  {
    icon: Trophy,
    label: "Achievement progresses",
    detail: "Achievements unlock from real activity",
    tone: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
];

export default function GoalsTasksPreview() {
  const reduce = useReducedMotion();

  return (
    <section className="relative border-y border-white/5 bg-transparent py-28">
      <div className="section-shell">
        <SectionHeading
          label="Goals & Tasks"
          title={
            <>
              Finishing a task should{" "}
              <span className="serif-italic text-gradient-ai">move something real.</span>
            </>
          }
          description="In FocusFlow, progress is never a number you type in. Complete a task and watch the goal, your achievements, and your analytics update from actual activity."
        />

        {/* completion chain */}
        <div className="mx-auto mt-16 max-w-4xl">
          <Reveal>
            <div className="glass-card rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                {CHAIN.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex flex-1 items-center">
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${step.tone}`}>
                          <Icon className="h-4.5 w-4.5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-white">{step.label}</span>
                          <span className="block truncate text-[11.5px] text-gray-400">{step.detail}</span>
                        </span>
                      </motion.div>
                      {i < CHAIN.length - 1 && (
                        <ArrowRight className="mx-2 hidden h-4 w-4 shrink-0 text-gray-600 md:block" aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* goal card preview */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight text-white">Your goal</p>
                    <p className="mt-0.5 text-[11.5px] text-gray-400">
                      Milestones and linked tasks stay in one view
                    </p>
                  </div>
                  <span className="rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-2.5 py-1 text-[10px] font-mono font-bold text-[#FF4500]">
                    Connected
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Goal", "Milestones", "Tasks"].map((label) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                      <span className="block h-1.5 w-1.5 rounded-full bg-[#FF4500]" />
                      <span className="mt-2 block text-[10px] font-mono font-medium text-gray-300">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
