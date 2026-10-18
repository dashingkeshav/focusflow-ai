"use client";

import { BarChart3, Clock3, Crosshair, ShieldAlert } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const MEASURES = [
  { icon: Crosshair, title: "Focus patterns", detail: "Scores from your real focus sessions" },
  { icon: Clock3, title: "Time in focus", detail: "Time tracked while a session is active" },
  { icon: ShieldAlert, title: "Distractions", detail: "Events reported by your extension" },
];

export default function AnalyticsPreview() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-44 top-10 h-105 w-105 rounded-full bg-[radial-gradient(circle,rgba(255,69,0,0.12),transparent_70%)] blur-2xl"
      />
      <div className="section-shell">
        <SectionHeading
          label="Analytics"
          title={
            <>
              Understand your{" "}
              <span className="serif-italic text-gradient-ai">own patterns.</span>
            </>
          }
          description="Your trends take shape from your sessions, completed tasks and extension activity—not a set of generic sample charts."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <Reveal>
            <div className="glass-card overflow-hidden rounded-3xl p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-serif font-semibold text-white">Your focus patterns</p>
                  <p className="mt-1 text-xs text-gray-400">Built from your real session history</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF4500]/15 text-[#FF4500]">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                </span>
              </div>

              <div className="relative mt-6 flex min-h-52.5 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-50">
                <div aria-hidden className="absolute inset-0 opacity-40" style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.05) 1px, transparent 1px)",
                  backgroundSize: "54px 42px",
                }} />
                <div className="relative mx-4 max-w-xs rounded-2xl border border-white/10 bg-[#161616] px-5 py-4 text-center shadow-[0_16px_40px_-28px_rgba(0,0,0,0.8)] backdrop-blur">
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF4500]/20 text-[#FF4500]">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-white">Your story starts with a session</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                    Focus charts appear here as your real activity is recorded.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-3">
            {MEASURES.map((measure, index) => {
              const Icon = measure.icon;
              return (
                <Reveal key={measure.title} delay={index * 0.08}>
                  <div className="flex min-h-22 items-center gap-3.5 rounded-2xl border border-white/10 bg-card px-4 py-4 shadow-[0_12px_35px_-26px_rgba(0,0,0,0.8)] backdrop-blur">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#FF4500]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-white">{measure.title}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-gray-400">{measure.detail}</span>
                    </span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
