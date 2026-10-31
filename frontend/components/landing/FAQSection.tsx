"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const FAQS = [
  {
    q: "How is the Focus Score calculated?",
    a: "From your real session telemetry only: tab switches, idle bouts, warnings, blocked-site attempts, camera attention events (if enabled), and engaged input. Every point of the score traces back to a stored event. If a session has no telemetry, the score shows “Not available” instead of guessing.",
  },
  {
    q: "What does the Chrome extension do?",
    a: "It watches the sites you visit during a focus session, warns or blocks distracting ones based on your rules, and reports real activity — tab switches, idle time, keyboard and mouse activity counts — that the dashboard turns into your Focus Score.",
  },
  {
    q: "Is my camera footage uploaded anywhere?",
    a: "No. When you explicitly enable camera monitoring, attention is processed locally in your browser and only an attention signal is recorded. Raw video never leaves your device.",
  },
  {
    q: "Does the AI planner invent my schedule?",
    a: "No. The planner first reads your real goals, tasks, deadlines, habits, and focus history from the database, then proposes a plan. AI suggestions stay clearly separate from saved data until you confirm and apply them.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Reports page builds a date-range report from your actual sessions and events, with one-click CSV and PDF export containing exactly the numbers shown.",
  },
  {
    q: "What happens on the free plan?",
    a: "You get goals, tasks, focus sessions with the Chrome extension, your Focus Score, and the distraction log — free forever. Premium adds the full AI planner, deep analytics, and report exports.",
  },
];

export default function FAQSection() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative border-t border-white/5 bg-transparent py-28 text-white">
      <div className="section-shell">
        <SectionHeading
          label="FAQ"
          title={
            <>
              Answers,{" "}
              <span className="serif-italic text-gradient-teal">without the marketing gloss.</span>
            </>
          }
        />

        <div className="mx-auto mt-14 max-w-3xl space-y-3.5">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={faq.q} delay={i * 0.05}>
                <div
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isOpen ? "border-[#FF4500]/50 bg-slate-100 shadow-xl" : "border-[#262832] bg-[#12131A]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                  >
                    <span className="text-base font-serif font-bold text-white">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        isOpen ? "border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500]" : "border-[#262832] bg-white/5 text-gray-400"
                      }`}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={reduce ? { height: "auto", opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? { height: "auto", opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="px-6 pb-6 text-sm leading-relaxed text-gray-400 font-light">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
