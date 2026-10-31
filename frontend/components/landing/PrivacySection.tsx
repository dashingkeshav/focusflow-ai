"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, EyeOff, Lock, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const POINTS = [
  {
    icon: Camera,
    title: "Camera processing stays on your device",
    desc: "Attention checks run locally in your browser. No raw video is ever uploaded — only an on/off attention signal, and only when you explicitly enable the camera.",
  },
  {
    icon: EyeOff,
    title: "No keystroke or content logging",
    desc: "Keyboard and mouse signals are counted as activity, never recorded as content. Nothing you type is captured, stored, or analyzed.",
  },
  {
    icon: Lock,
    title: "Your data is yours alone",
    desc: "Every session, goal, and event is scoped to your account in PostgreSQL. Deleting a goal, task, or session removes it — there is no shadow copy.",
  },
  {
    icon: ShieldCheck,
    title: "Protection you can see",
    desc: "Warnings and blocks come from rules you set. The distraction log shows every event with its timestamp, domain, and reason — nothing hidden.",
  },
];

export default function PrivacySection() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-28 text-white bg-transparent">
      <div className="section-shell">
        <SectionHeading
          label="Privacy by design"
          title={
            <>
              Powerful monitoring,{" "}
              <span className="serif-italic text-gradient-teal">with clear limits.</span>
            </>
          }
          description="FocusFlow measures behavior, not content. Here is exactly what is collected — and what never leaves your device."
        />

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {POINTS.map((point, i) => {
            const Icon = point.icon;
            return (
              <Reveal key={point.title} delay={i * 0.1}>
                <div className="flex h-full gap-5 rounded-3xl border border-[#262832] bg-[#12131A] p-8 shadow-xl transition-all duration-300 hover:border-white/20">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-white">{point.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400 font-light">{point.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-14 text-center text-xs font-mono text-gray-500"
        >
          Camera monitoring is optional and off by default. Every metric in your dashboard can be traced to a real, timestamped event.
        </motion.p>
      </div>
    </section>
  );
}
