"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  CircleCheck,
  Crosshair,
  ShieldCheck,
  Target,
} from "lucide-react";

const FEATURES = [
  {
    title: "AI planning, grounded in your goals.",
    detail: "Turn priorities and available time into milestones, tasks and a plan you can review.",
    icon: Bot,
    href: "/dashboard/planner",
    className: "md:col-span-7 md:row-span-2",
    treatment: "planner",
  },
  {
    title: "Focus with a little more protection.",
    detail: "Session-aware browser controls help keep attention on the work.",
    icon: ShieldCheck,
    href: "/features",
    className: "md:col-span-5",
    treatment: "focus",
  },
  {
    title: "Goals that connect to your next step.",
    detail: "Keep milestones, tasks and deadlines connected.",
    icon: Target,
    href: "/dashboard/goals",
    className: "md:col-span-5",
    treatment: "goals",
  },
  {
    title: "Measure what actually happened.",
    detail: "Session analytics and insights come from your recorded activity.",
    icon: BarChart3,
    href: "/dashboard/analytics",
    className: "md:col-span-4",
    treatment: "analytics",
  },
  {
    title: "Make consistency visible.",
    detail: "Completed work rolls into your real achievements.",
    icon: CircleCheck,
    href: "/dashboard/goals?view=achievements",
    className: "md:col-span-4",
    treatment: "progress",
  },
  {
    title: "A day with room to think.",
    detail: "Shape time around a priority, not a crowded calendar.",
    icon: CalendarDays,
    href: "/dashboard/planner",
    className: "md:col-span-4",
    treatment: "schedule",
  },
];

function FeatureVisual({ type }: { type: string }) {
  if (type === "planner") {
    return (
      <div className="mt-7 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-2xl border border-ink/7 bg-white/75 p-3.5 sm:gap-3 sm:p-4">
        {[
          { label: "Goal", icon: Target },
          { label: "Milestones", icon: CircleCheck },
          { label: "Focus time", icon: Crosshair },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="contents">
              <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  index === 1 ? "bg-tide-50 text-tide-700" : "bg-white text-mist-600"
                }`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[9px] font-medium text-mist-600">{item.label}</span>
              </div>
              {index < 2 && <span aria-hidden className="h-px w-5 bg-tide-300/70 sm:w-8" />}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === "focus") {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-white bg-white/75 px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tide-50 text-tide-700">
          <Crosshair className="h-4 w-4" aria-hidden />
        </span>
        <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-tide-300 via-sky-200 to-slate-100" />
        <span className="text-[9px] text-mist-500">Focus session</span>
      </div>
    );
  }

  if (type === "goals") {
    return (
      <div className="mt-5 flex items-center gap-2">
        {[0, 1, 2, 3].map((step, index) => (
          <span key={step} className={`h-1.5 flex-1 rounded-full ${
            index < 2 ? "bg-tide-400/70" : "bg-slate-200"
          }`} />
        ))}
      </div>
    );
  }

  if (type === "analytics") {
    return (
      <div className="mt-5 flex h-12 items-end gap-1.5">
        {[24, 37, 29, 46, 34, 53, 42, 58, 45, 62, 48, 72].map((height, index) => (
          <span
            key={index}
            className={`flex-1 rounded-t-sm ${index === 9 ? "bg-sky-400/75" : "bg-tide-400/35"}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (type === "progress") {
    return (
      <div className="mt-5 flex items-center gap-2.5">
        {[0, 1, 2].map((item) => (
          <span key={item} className="flex h-8 w-8 items-center justify-center rounded-full border border-tide-500/15 bg-white text-tide-700">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
          </span>
        ))}
        <span className="h-px flex-1 bg-gradient-to-r from-tide-300 to-transparent" />
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-center gap-2 rounded-xl border border-white bg-white/70 p-2.5">
      {[0, 1, 2].map((slot) => (
        <span key={slot} className={`h-8 flex-1 rounded-lg border ${
          slot === 0 ? "border-tide-500/15 bg-tide-50/80" : "border-ink/5 bg-white/70"
        }`} />
      ))}
    </div>
  );
}

export default function FeatureBento() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="relative overflow-hidden py-24 sm:py-28">
      <div className="section-shell">
        <div className="mb-12 grid gap-5 md:grid-cols-[1fr_.65fr] md:items-end">
          <div>
            <span className="section-label">
              <span className="h-1.5 w-1.5 rounded-full bg-tide-500" aria-hidden />
              One connected workspace
            </span>
            <h2 className="section-title max-w-2xl">
              A calmer system for{" "}
              <span className="serif-italic text-gradient-ai">getting good work done.</span>
            </h2>
          </div>
          <p className="section-description md:justify-self-end">
            From the first intention to the session review, each part of FocusFlow is designed to help the next one work better.
          </p>
        </div>

        <div className="grid auto-rows-fr gap-3.5 md:grid-cols-12 md:grid-rows-2">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={reduce ? undefined : { y: -3 }}
                className={`group relative min-h-[210px] overflow-hidden rounded-[22px] border border-white/90 bg-gradient-to-br from-white via-white to-slate-50/80 p-5 shadow-[0_16px_42px_-30px_rgba(35,76,96,.28)] transition-shadow hover:shadow-[0_26px_58px_-34px_rgba(35,76,96,.32)] sm:p-6 ${feature.className}`}
              >
                {feature.treatment === "planner" && (
                  <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(82,182,193,.13),transparent_70%)] blur-xl" />
                )}
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink/5 bg-white text-tide-700 shadow-[0_7px_18px_-12px_rgba(35,76,96,.28)]">
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <Link
                      href={feature.href}
                      aria-label={`Explore ${feature.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/8 bg-white/70 text-mist-500 transition-all hover:border-tide-500/25 hover:text-tide-700"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold tracking-tight text-ink">{feature.title}</h3>
                    <p className="mt-1.5 max-w-md text-[11px] leading-relaxed text-mist-600">{feature.detail}</p>
                  </div>
                  <div className="mt-auto">
                    <FeatureVisual type={feature.treatment} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
