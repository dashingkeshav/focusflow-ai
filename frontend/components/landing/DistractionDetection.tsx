"use client";

import {
  AppWindow,
  Camera,
  CircleHelp,
  EyeOff,
  Hourglass,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const SIGNALS = [
  { icon: AppWindow, label: "Tab switches", note: "Reported by the active session" },
  { icon: Hourglass, label: "Idle time", note: "Measured while a session is active" },
  { icon: EyeOff, label: "Attention signals", note: "Only when camera monitoring is enabled" },
  { icon: Camera, label: "Extension activity", note: "From your connected browser extension" },
];

export default function DistractionDetection() {
  return (
    <section id="protection" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          label="Smart Focus Mode"
          title={
            <>
              Understand interruptions.{" "}
              <span className="serif-italic text-gradient-ai">Return to the work.</span>
            </>
          }
          description="FocusFlow looks at real session signals and extension events when available. It never fills the screen with invented domains or activity."
        />

        <Reveal delay={0.12} className="mt-14">
          <div className="relative mx-auto grid max-w-5xl gap-4 [perspective:1200px] md:grid-cols-[1fr_0.72fr_1fr] md:items-center">
            <div className="space-y-2.5">
              {SIGNALS.map((signal, index) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-[0_12px_34px_-28px_rgba(35,76,96,.35)] backdrop-blur"
                    style={{ transform: `translateX(${index % 2 === 0 ? 0 : 10}px) translateZ(${index * 5}px)` }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/5 bg-gradient-to-br from-white to-tide-50 text-tide-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">{signal.label}</span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-mist-500">{signal.note}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div aria-hidden className="hidden items-center justify-center md:flex">
              <span className="absolute left-[33%] right-[67%] h-px bg-gradient-to-r from-transparent to-tide-300" />
              <span className="absolute left-[67%] right-[8%] h-px bg-gradient-to-r from-tide-300 to-transparent" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-tide-500/20 bg-white text-tide-700 shadow-[0_15px_35px_-20px_rgba(22,143,134,.5)]">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-tide-500/15 bg-gradient-to-br from-white to-tide-50/70 p-5 shadow-[0_24px_55px_-38px_rgba(35,76,96,.32)] md:min-h-[238px] md:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white bg-white text-tide-700 shadow-sm">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-5 text-sm font-semibold text-ink">Thoughtful refocus</p>
              <p className="mt-2 text-xs leading-relaxed text-mist-600">
                When session data indicates a disruption, FocusFlow can help you bring your attention back to the task.
              </p>
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/90 bg-white/75 px-3 py-2.5">
                <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tide-700" aria-hidden />
                <span className="text-[9px] leading-relaxed text-mist-500">
                  Signals are shown only when reported. No activity is displayed in this preview.
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
