"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import HeroWorkspace3D from "@/components/three/HeroWorkspace3D";
import ParallaxStarsBackground from "@/components/ui/ParallaxStarsBackground";

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24">
      {/* 3-Layer Parallax Focus Stars & Cognitive Sparks Background */}
      <ParallaxStarsBackground asBackgroundOnly speed={0.9} interactiveParallax theme="light" />

      {/* Ambient Light Diffusion Layers */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-[#fafbfc]/40 to-[#f4f7fa]/80" />
      <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-teal-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ==========================================================
              LEFT COLUMN: HERO COPY & CALLS TO ACTION
              ========================================================== */}
          <div className="text-left lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3.5 py-1.5 text-xs font-bold text-teal-700 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>AI-POWERED PRODUCTIVITY</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 font-manrope text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Turn your intentions into{" "}
              <span className="serif-italic text-gradient-teal">focused progress.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg"
            >
              FocusFlow AI turns goals into realistic plans, protects your attention, and learns how you work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/register"
                id="hero-start-free-btn"
                className="btn btn-primary"
              >
                <span>Start for Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                id="hero-explore-btn"
                className="btn btn-ghost"
              >
                <Play className="h-4 w-4 fill-current text-teal-600" />
                <span>Explore FocusFlow</span>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-8 flex items-center gap-6 text-xs font-medium text-slate-500"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Free forever tier included
              </span>
              <span>·</span>
              <span>No credit card required</span>
              <span>·</span>
              <span>Local privacy protection</span>
            </motion.div>
          </div>

          {/* ==========================================================
              RIGHT COLUMN: SIGNATURE 3D FOCUS INTELLIGENCE WORKSPACE
              ========================================================== */}
          <div className="lg:col-span-6">
            <HeroWorkspace3D />
          </div>
        </div>
      </div>
    </section>
  );
}
