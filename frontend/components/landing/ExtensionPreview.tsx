"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, CircleHelp, Lock, Puzzle, Shield } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import MagneticButton from "@/components/ui/MagneticButton";

const SIGNALS = [
  { icon: CheckCircle2, label: "Productive", description: "Classification from the extension", tone: "text-emerald-400 bg-emerald-500/20" },
  { icon: CircleHelp, label: "Possibly distracting", description: "Review based on session context", tone: "text-amber-400 bg-amber-500/20" },
  { icon: Lock, label: "Distracting", description: "Protection follows your focus settings", tone: "text-[#FF4500] bg-[#FF4500]/20" },
];

export default function ExtensionPreview() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          label="Chrome Extension"
          title={
            <>
              Focus protection that{" "}
              <span className="serif-italic text-gradient-ai">travels with your work.</span>
            </>
          }
          description="During a real focus session, the FocusFlow extension classifies browsing activity and applies your protection settings. Domains appear only when the extension reports them."
        />

        <Reveal delay={0.12} className="mt-14">
          <div className="mx-auto max-w-4xl" style={{ perspective: reduce ? undefined : "1400px" }}>
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: 10, y: 24 }}
              whileInView={reduce ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-3xl border border-white/10 bg-card shadow-[0_32px_80px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex items-center gap-3 border-b border-white/10 bg-white/3 px-4 py-3">
                <div className="flex gap-1.5" aria-hidden>
                  {["bg-rose-500", "bg-amber-500", "bg-emerald-500"].map((tone) => (
                    <span key={tone} className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                  ))}
                </div>
                <div className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-mono text-gray-400">
                  <Lock className="h-3 w-3" aria-hidden />
                  FocusFlow browser protection
                </div>
                <Puzzle className="h-4 w-4 text-[#FF4500]" aria-hidden />
              </div>

              <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/15 text-[#FF4500] shadow-sm">
                    <Shield className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-sm font-serif font-semibold text-white">Session-aware protection</p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-400">
                    The extension checks the active session and your focus preferences before acting.
                  </p>
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                    <span className="text-[10px] font-mono font-medium text-gray-400">Waiting for a focus session</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-serif font-semibold text-white">Browsing activity</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                        Actual domains are provided by your connected extension.
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-500" aria-hidden />
                  </div>
                  <div className="mt-4 space-y-2">
                    {SIGNALS.map((signal) => {
                      const Icon = signal.icon;
                      return (
                        <div key={signal.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${signal.tone}`}>
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-semibold text-white">{signal.label}</span>
                            <span className="mt-0.5 block text-[9px] leading-relaxed text-gray-400">{signal.description}</span>
                          </span>
                          <span className="ml-auto text-[10px] text-gray-600">—</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[9px] text-gray-500">No browsing domains are shown in this preview.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.25} className="mt-8 flex flex-wrap items-center justify-center gap-4 text-center">
          <MagneticButton href="/download" ariaLabel="Download Chrome Extension">
            Get Chrome Extension
          </MagneticButton>
          <MagneticButton href="/features" variant="ghost" ariaLabel="Explore FocusFlow features">
            Explore Features
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  );
}
