import type { Metadata } from "next";
import {
  AppWindow,
  Server,
  BrainCircuit,
  Database,
  Blocks,
  Sparkles,
} from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import Badge from "@/components/ui/Badge";
import MagneticButton from "@/components/ui/MagneticButton";

export const metadata: Metadata = {
  title: "About & Architecture — FocusFlow AI",
  description:
    "Explore our production architecture: Next.js frontend, Node.js WebSocket engine, Supabase PostgreSQL, and Manifest V3 extension.",
};

const LAYERS = [
  {
    icon: AppWindow,
    title: "Dimensional Frontend",
    desc: "Next.js App Router with React, Three.js / WebGL 3D intelligence core, and Framer Motion spring physics. Delivers responsive glass surfaces and live telemetry controls.",
    chips: ["Next.js", "React", "TypeScript", "Three.js", "Framer Motion"],
  },
  {
    icon: Server,
    title: "Real-Time Telemetry Engine",
    desc: "Node.js and Express services operating WebSocket channels via Socket.io. Pushes live focus scores, tab switch warnings, and camera attention updates instantly.",
    chips: ["Node.js", "Express", "Socket.io", "JWT Auth"],
  },
  {
    icon: BrainCircuit,
    title: "Multimodal AI Intelligence",
    desc: "Gemini AI multimodal planner parsing natural text, speech recognition audio, and syllabus documents (PDF/TXT) into structured milestones and realistic focus sessions.",
    chips: ["Google Gemini AI", "Speech Recognition", "Multimodal Parser"],
  },
  {
    icon: Database,
    title: "PostgreSQL Database Layer",
    desc: "Supabase PostgreSQL with strict foreign keys, user isolation, and indexed event logs storing sessions, goals, tasks, and distraction telemetry securely.",
    chips: ["PostgreSQL", "Supabase", "Row-Level Security"],
  },
  {
    icon: Blocks,
    title: "Native Browser Extension & Billing",
    desc: "Manifest V3 Chrome extension actively shielding distracting domains without recording page text. Razorpay handles subscriptions with automated server webhooks.",
    chips: ["Chrome MV3 Extension", "Razorpay Subscriptions", "Resend Email"],
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-transparent text-white selection:bg-[#FF4500] selection:text-white">
      {/* Background Dot Matrix Pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(circle, #444 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* HERO */}
      <section className="relative z-10 pt-36 pb-20">
        <Reveal>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-6">
            <Badge accent>Engineering Excellence</Badge>
            <h1 className="mt-6 font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Engineered as an authentic{" "}
              <span className="serif-italic text-gradient-teal">living workspace.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg font-light leading-relaxed">
              FocusFlow AI forms an end-to-end intelligent platform — connecting a real browser extension, multimodal Gemini AI planning, and PostgreSQL telemetry into one unified obsidian experience.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ARCHITECTURE LAYERS */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="section-label">System Architecture</span>
              <h2 className="section-title mt-3">
                Five architectural pillars, zero mocked telemetry
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <Reveal key={layer.title} delay={(i % 3) * 0.1} className="h-full">
                  <div className="glass-card flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-card p-8 shadow-2xl transition-all duration-300 hover:border-[#FF4500]/50 hover:-translate-y-1">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#FF4500] mb-5">
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-white">{layer.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-400 font-light">{layer.desc}</p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-2 pt-5 border-t border-white/10">
                      {layer.chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-[10px] font-mono text-gray-300"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <Reveal>
          <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-card px-8 py-16 text-center shadow-2xl max-w-4xl mx-auto">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-[#FF4500]/15 blur-3xl"
            />
            <div className="relative mx-auto flex max-w-xl flex-col items-center">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                <Sparkles className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-serif">
                Experience verifiable architecture.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-400 font-light">
                Launch your workspace and see every component synchronize seamlessly.
              </p>
              <div className="mt-8">
                <MagneticButton href="/register" ariaLabel="Create account">
                  Start for free
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
