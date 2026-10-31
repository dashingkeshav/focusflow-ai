"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Bot, Crosshair, LineChart, ListPlus, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

/**
 * How it works — the FocusFlow journey in five stages.
 * A scroll-driven line connects the stages and each activates as it
 * enters the viewport. Respects prefers-reduced-motion.
 */

const STAGES = [
  {
    number: "01",
    icon: ListPlus,
    title: "Define",
    desc: "Set your goal with a real deadline. Break it into tasks, milestones, and habits — or let AI decompose it for you.",
  },
  {
    number: "02",
    icon: Bot,
    title: "Plan",
    desc: "The AI planner reads your goals, tasks, deadlines, habits, and available time — then proposes a realistic schedule you approve before anything is saved.",
  },
  {
    number: "03",
    icon: Crosshair,
    title: "Focus",
    desc: "Start a protected session. The Chrome extension warns and blocks distractions while real telemetry measures how the work actually goes.",
  },
  {
    number: "04",
    icon: LineChart,
    title: "Measure",
    desc: "Every session ends with a real Focus Score from tab switches, idle time, warnings, and engagement — plus a distraction log you can audit.",
  },
  {
    number: "05",
    icon: ShieldCheck,
    title: "Improve",
    desc: "Analytics surface your peak hours and failure patterns. AI adapts your next plan, and achievements mark the streaks you build.",
    accent: true,
  },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.75", "end 0.6"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0.02, 1]);

  // Highlight the stage whose band of the journey is currently in view.
  useMotionValueEvent(scrollYProgress, "change", (v: any) => {
    setActive(Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length))));
  });

  return (
    <section id="how" className="relative scroll-mt-24 py-28">
      <div className="section-shell">
        <SectionHeading
          label="How FocusFlow Works"
          title={
            <>
              Five stages.{" "}
              <span className="serif-italic text-gradient-ai">One honest loop.</span>
            </>
          }
          description="Focus → Plan → Execute → Measure → Improve isn't a slogan here — it's the actual pipeline your data flows through."
        />

        <div ref={trackRef} className="relative mt-20">
          {/* scroll-driven progress line — desktop */}
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-white/10 lg:block">
            <motion.div
              style={{ scaleX: reduce ? 1 : lineScale }}
              className="h-full origin-left bg-linear-to-r from-[#FF4500] via-tide-400 to-[#ffa07a]"
            />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = active === i;
              return (
                <motion.div
                  key={stage.number}
                  initial={reduce ? false : { opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <div className="flex flex-col items-start lg:items-center lg:text-center">
                    <span
                      className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-all duration-500 ${
                        isActive
                          ? "border-[#FF4500] bg-[#FF4500]/15 shadow-[0_0_34px_rgba(255,69,0,0.35)]"
                          : "border-[#262832] bg-[#12131A] hover:border-white/20"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 transition-colors duration-500 ${isActive ? "text-[#FF4500]" : "text-gray-400"}`}
                        aria-hidden
                      />
                    </span>

                    <span
                      className={`mt-5 text-xs font-mono font-medium tracking-[0.3em] transition-colors duration-500 ${
                        isActive ? "text-[#FF4500]" : "text-gray-500"
                      }`}
                    >
                      {stage.number}
                    </span>

                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">{stage.title}</h3>

                    <p className="mt-2.5 max-w-60 text-[13px] leading-[1.7] text-gray-400">
                      {stage.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
