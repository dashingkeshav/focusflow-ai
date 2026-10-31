"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, CalendarClock, Check, Clock, Flag, Sparkles } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const INPUTS = [
  { label: "Your goals", icon: Flag },
  { label: "Task priorities", icon: Check },
  { label: "Available time", icon: Clock },
  { label: "Deadlines", icon: CalendarClock },
];

const OUTPUTS = ["Milestones", "Actionable tasks", "Time blocks", "Focus sessions"];

export default function AIPlanner() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-transparent py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-36 top-8 h-110 w-110 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.12),transparent_70%)] blur-2xl"
      />
      <div className="section-shell">
        <SectionHeading
          label="AI Planner"
          title={
            <>
              From a big goal to{" "}
              <span className="serif-italic text-gradient-ai">a workable next step.</span>
            </>
          }
          description="FocusFlow uses the priorities, deadlines and availability you provide to shape a schedule. Suggestions remain yours to review before saving."
        />

        <Reveal delay={0.1} className="mt-14">
          <div className="relative grid overflow-hidden rounded-[26px] border border-[#262832] bg-[#12131A] shadow-[0_32px_80px_-46px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:grid-cols-[0.9fr_0.2fr_0.9fr]">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-gray-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[#FF4500]">
                  <Flag className="h-3.5 w-3.5" aria-hidden />
                </span>
                Your inputs
              </div>
              <h3 className="mt-5 text-xl font-serif font-semibold tracking-tight text-white">Start with what matters to you.</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Nothing is assumed. Your plan starts with the goals and constraints you choose.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {INPUTS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ delay: index * 0.07, duration: 0.4 }}
                      className="flex min-h-13.5 items-center gap-2 rounded-xl border border-[#262832] bg-white/5 px-3 py-2"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#FF4500]" aria-hidden />
                      <span className="text-[10px] font-mono font-medium text-gray-300">{item.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="relative hidden items-center justify-center lg:flex">
              <span aria-hidden className="absolute top-[18%] h-[64%] w-px bg-linear-to-b from-transparent via-[#FF4500]/40 to-transparent" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#FF4500]/30 bg-[#FF4500]/15 text-[#FF4500] shadow-[0_8px_22px_-10px_rgba(255,69,0,0.4)]">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="border-t border-[#262832] bg-white/2 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#FF4500]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF4500]/20 text-[#FF4500]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                AI-organized
              </div>
              <h3 className="mt-5 text-xl font-serif font-semibold tracking-tight text-white">A path you can actually follow.</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                Your plan is generated from your own work—not pre-filled with someone else&apos;s tasks.
              </p>
              <div className="mt-6 space-y-2">
                {OUTPUTS.map((label, index) => (
                  <motion.div
                    key={label}
                    initial={reduce ? false : { opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: 0.14 + index * 0.08, duration: 0.42 }}
                    className="flex items-center gap-3 rounded-xl border border-[#262832] bg-white/5 px-3.5 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF4500]/20 text-[9px] font-mono font-bold text-[#FF4500]">
                      0{index + 1}
                    </span>
                    <span className="text-xs font-medium text-white">{label}</span>
                    {index < OUTPUTS.length - 1 && (
                      <ArrowDown className="ml-auto h-3.5 w-3.5 text-gray-500" aria-hidden />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
