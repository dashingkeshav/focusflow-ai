"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CircleDot, Target, Timer } from "lucide-react";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/ui/Reveal";

const FLOW = [
  { label: "Goals", icon: Target },
  { label: "Plans", icon: Check },
  { label: "Focus", icon: Timer },
  { label: "Progress", icon: CircleDot },
];

export default function FinalCTA() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_110%,rgba(255,69,0,.15),transparent_72%)]"
      />
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <span className="section-label">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF4500]" aria-hidden />
            Work with intention
          </span>
          <h2 className="mx-auto mt-7 max-w-3xl text-[clamp(36px,5.3vw,64px)] font-bold leading-[1.05] tracking-tight font-serif text-white">
            Your goals become plans.{" "}
            <span className="serif-italic text-gradient-teal">Your plans become progress.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-gray-400 sm:text-base font-light">
            Start with what matters to you. FocusFlow AI helps you eliminate distractions and make space for deep work.
          </p>
        </Reveal>

        <div className="relative mx-auto mt-12 max-w-2xl perspective-[1000px]">
          <div className="relative grid grid-cols-4 gap-2 rounded-3xl border border-white/10 bg-card p-4 backdrop-blur-xl sm:p-6 shadow-2xl">
            {FLOW.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.label}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.07, duration: 0.4 }}
                  className="relative flex flex-col items-center gap-2 py-2"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#FF4500] shadow-sm sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-mono font-medium text-gray-200 sm:text-xs">{stage.label}</span>
                  {index < FLOW.length - 1 && (
                    <ArrowRight className="absolute -right-2 top-6 hidden h-3.5 w-3.5 text-gray-600 sm:block" aria-hidden />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <Reveal delay={0.2}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton href="/register" size="lg" ariaLabel="Start for free">
              Start for Free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </MagneticButton>
            <MagneticButton href="/login" variant="ghost" size="lg" ariaLabel="Sign in">
              Sign In
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
