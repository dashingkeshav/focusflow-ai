"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AppWindow,
  ArrowDown,
  BellRing,
  CircleCheck,
  ListTodo,
  TimerReset,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const FRICTION = [
  { icon: ListTodo, label: "Too many responsibilities" },
  { icon: AppWindow, label: "Too many open tabs" },
  { icon: BellRing, label: "Constant interruptions" },
  { icon: TimerReset, label: "Time slips away" },
];

export default function TheProblem() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-transparent py-24 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          label="When everything competes for attention"
          title={
            <>
              Good intentions get{" "}
              <span className="serif-italic text-gradient-ai">buried in the noise.</span>
            </>
          }
          description="The distance between what you mean to do and what gets done is often a missing system—not a lack of effort."
        />

        <Reveal delay={0.1} className="mt-14">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF4500]">
                    The everyday spiral
                  </p>
                  <p className="mt-1 text-xs text-gray-400 font-light">Small interruptions add up.</p>
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-mono font-semibold text-amber-400">
                  Hard to hold the thread
                </span>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {FRICTION.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      className={`flex min-h-19.5 items-center gap-3 rounded-2xl border bg-white/5 px-4 py-3 border-white/10 ${
                        index === 3
                          ? "border-amber-500/20 sm:col-span-2"
                          : "border-white/10"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#FF4500]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-medium text-gray-200">{item.label}</span>
                      {index < FRICTION.length - 1 && (
                        <ArrowDown className="ml-auto h-3.5 w-3.5 text-gray-600 sm:hidden" aria-hidden />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 px-1 text-[10px] font-mono text-gray-500">
                <span className="h-px flex-1 bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />
                <span>unfinished work</span>
                <span className="h-px flex-1 bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />
              </div>
            </div>

            <div className="relative flex min-h-75 flex-col justify-between overflow-hidden rounded-3xl border border-[#FF4500]/30 bg-card p-6 sm:p-8 shadow-2xl">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.15),transparent_70%)] blur-2xl" />
              <div className="relative">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] shadow-sm">
                  <CircleCheck className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-6 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#FF4500]">
                  A calmer way forward
                </p>
                <h3 className="mt-2 max-w-sm text-2xl font-bold font-serif leading-tight tracking-tight text-white sm:text-3xl">
                  FocusFlow brings your work back into focus.
                </h3>
                <p className="mt-3 max-w-sm text-xs leading-relaxed text-gray-400 font-light">
                  Connect the goal to a practical plan, protect time for focused work, then learn from real progress.
                </p>
              </div>
              <div className="relative mt-8 flex items-center gap-2">
                {["Goal", "Plan", "Focus", "Progress"].map((label, index) => (
                  <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[9px] font-mono font-bold text-[#FF4500] shadow-sm">
                      0{index + 1}
                    </span>
                    <span className="hidden truncate text-[10px] font-mono font-medium text-gray-300 sm:block">{label}</span>
                    {index < 3 && <span className="h-px min-w-2 flex-1 bg-white/10" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
