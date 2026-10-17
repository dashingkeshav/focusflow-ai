"use client";

import Link from "next/link";
import { ArrowRight, Camera, CircleHelp, ShieldCheck, Timer } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const TELEMETRY = [
  { label: "Focus score", value: "—" },
  { label: "Tab switches", value: "—" },
  { label: "Idle time", value: "—" },
  { label: "Distraction events", value: "—" },
];

export default function FocusSessionPreview() {
  return (
    <section className="relative overflow-hidden border-y border-ink/8 bg-white/55 py-24 sm:py-28">
      <div className="section-shell">
        <SectionHeading
          label="Smart Focus Mode"
          title={
            <>
              Space to focus.{" "}
              <span className="serif-italic text-gradient-ai">Signal you can trust.</span>
            </>
          }
          description="Focus sessions collect real session and extension telemetry. The workspace stays honest when there is nothing to report."
        />

        <Reveal delay={0.1} className="mt-14">
          <div className="relative mx-auto max-w-4xl [perspective:1200px]">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-5 rounded-[32px] bg-gradient-to-br from-tide-200/40 via-transparent to-sky-200/45 blur-2xl"
            />
            <div className="relative grid overflow-hidden rounded-[26px] border border-white/90 bg-white/90 shadow-[0_32px_80px_-48px_rgba(35,76,96,.4)] backdrop-blur-xl md:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-ink/8 bg-gradient-to-br from-white via-white to-tide-50/60 p-6 sm:p-8 md:border-b-0 md:border-r">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-tide-700">
                  <Timer className="h-3.5 w-3.5" aria-hidden />
                  Focus session
                </div>
                <p className="mt-7 font-mono text-[clamp(48px,8vw,72px)] font-light leading-none tracking-[-0.07em] text-ink" aria-label="Timer unavailable in product preview">
                  --:--
                </p>
                <p className="mt-3 text-xs text-mist-500">Timer appears when you start a session.</p>
                <div className="mt-7 flex items-center gap-3">
                  <Link href="/register" className="btn btn-primary btn-sm">
                    Start your first session
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-tide-500/12 bg-tide-50/60 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tide-700" aria-hidden />
                  <p className="text-[10px] leading-relaxed text-mist-600">
                    Browser protection is connected through your FocusFlow Chrome Extension.
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Live session signals</p>
                    <p className="mt-1 text-xs leading-relaxed text-mist-500">
                      Only reported activity appears here.
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Camera className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {TELEMETRY.map((item) => (
                    <div key={item.label} className="rounded-xl border border-ink/8 bg-white/75 p-3">
                      <span className="block text-[10px] text-mist-500">{item.label}</span>
                      <span className="mt-2 block font-mono text-base font-medium text-mist-400">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink/8 bg-slate-50/80 px-3 py-2.5">
                  <CircleHelp className="h-3.5 w-3.5 shrink-0 text-mist-500" aria-hidden />
                  <span className="text-[10px] leading-relaxed text-mist-500">
                    Camera status and extension activity are shown only when available.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
