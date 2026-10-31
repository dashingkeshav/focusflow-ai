"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Users,
  Radio,
  FolderGit2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Sparkles,
  Timer,
  CalendarCheck,
  Zap,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

const COLLAB_CARDS = [
  {
    id: "focus-rooms",
    title: "Focus Rooms",
    subtitle: "Real-Time Coworking",
    tagline: "Work alongside peers with synchronized timers and genuine presence.",
    icon: Radio,
    badge: "Synchronized HUD",
    href: "/focus-rooms",
    cta: "Explore Focus Rooms",
    limits: {
      free: "Host up to 4 participants",
      pro: "Host up to 12 participants",
    },
    features: [
      "Synchronized Pomodoro timer with host controls",
      "Live participant status, room lock & reconnection resilience",
      "Personal task confidentiality & voluntary session summaries",
      "Free guests can join Pro rooms without upgrading",
    ],
    highlight: "Real-time presence",
  },
  {
    id: "focus-circles",
    title: "Focus Circles",
    subtitle: "Long-Term Accountability",
    tagline: "Maintain weekly consistency with trusted peers over weeks and months.",
    icon: Users,
    badge: "Habit Cadence",
    href: "/dashboard/focus-circles",
    cta: "Explore Focus Circles",
    limits: {
      free: "Own 1 Circle (up to 4 members)",
      pro: "Own up to 10 Circles (12 members each)",
    },
    features: [
      "Weekly commitments, target completion dates & check-ins",
      "Honest streak tracking, overdue notices & progress history",
      "Schedule shared Focus Rooms directly with Circle members",
      "Role-based permissions (owner, admin, member)",
    ],
    highlight: "Weekly accountability",
  },
];

export default function CollaborationSection() {
  const reduce = useReducedMotion();

  return (
    <section id="collaboration" className="relative py-28 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-transparent">
      {/* Background radial ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] opacity-15 blur-[140px] bg-gradient-to-b from-[#FF4500]/20 via-transparent to-transparent"
      />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <Badge accent>Collaborative Intelligence</Badge>
          <h2 className="mt-6 font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Deep focus,{" "}
            <span className="serif-italic text-gradient-ai">multiplied together.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-400 font-light leading-relaxed">
            Solo discipline only goes so far. FocusFlow AI connects you with peers through synchronized coworking and weekly habit circles.
          </p>
        </div>

        {/* 4 Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {COLLAB_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative flex flex-col justify-between rounded-3xl border border-[#262832] bg-[#0a0a0c]/80 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:border-[#FF4500]/40 hover:shadow-[0_20px_50px_rgba(255,69,0,0.12)]"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-[#262832] flex items-center justify-center text-[#FF4500] group-hover:scale-110 group-hover:bg-[#FF4500]/10 transition-all duration-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                          {card.subtitle}
                        </span>
                        <h3 className="text-2xl font-serif font-bold text-white leading-tight">
                          {card.title}
                        </h3>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-mono font-medium border border-[#262832] bg-white/5 text-gray-300">
                      {card.badge}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed mb-6">
                    {card.tagline}
                  </p>

                  {/* Limits Pill */}
                  <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span className="text-gray-300 font-semibold">Free:</span>
                      <span>{card.limits.free}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#FF4500]">
                      <span className="font-semibold">Pro:</span>
                      <span>{card.limits.pro}</span>
                    </div>
                  </div>

                  {/* Core Points */}
                  <ul className="space-y-2.5 mb-8">
                    {card.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-400 font-light leading-snug">
                        <CheckCircle2 className="w-4 h-4 text-[#FF4500] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer Link */}
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                    {card.highlight}
                  </span>
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-white hover:text-[#FF4500] transition-colors group/link"
                  >
                    <span>{card.cta}</span>
                    <ArrowRight className="w-4 h-4 text-[#FF4500] group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Privacy & Guest Guarantee Banner */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 rounded-3xl border border-[#262832] bg-gradient-to-r from-white/[0.03] via-white/[0.05] to-white/[0.03] p-6 sm:p-8 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center text-[#FF4500] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-serif font-bold text-white">
                Task Privacy & Free Guest Participation Built In
              </h4>
              <p className="text-xs sm:text-sm text-gray-400 font-light mt-0.5 max-w-2xl leading-relaxed">
                Joining a collaboration group never exposes your private web history, personal task notes, or biometric scores. Free members can join any room or pod hosted by a Pro user without being forced to pay.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Compare Limits
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[#FF4500] text-white hover:bg-[#e03e00] transition-colors shadow-lg shadow-[#FF4500]/25"
            >
              Start Free
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
