"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  CheckSquare,
  Bot,
  Timer,
  Eye,
  BarChart3,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

/**
 * Interactive system map. Nodes represent the real FocusFlow
 * pipeline; hovering a node brightens its connections and shows
 * a description. Pure DOM/SVG — cheap and accessible.
 */

const NODES: Array<{
  id: string;
  label: string;
  icon: typeof CheckSquare;
  desc: string;
  x: number;
  y: number;
  accent?: boolean;
}> = [
  {
    id: "tasks",
    label: "Task",
    icon: CheckSquare,
    desc: "Capture assignments, deadlines and study goals in one place.",
    x: 50, y: 12,
  },
  {
    id: "planner",
    label: "AI Planner",
    icon: Bot,
    accent: true,
    desc: "AI arranges tasks into a realistic schedule around your available time.",
    x: 14, y: 38,
  },
  {
    id: "session",
    label: "Focus Session",
    icon: Timer,
    desc: "Timed deep-work sessions with a live focus score while you study.",
    x: 86, y: 38,
  },
  {
    id: "detect",
    label: "Distraction Detection",
    icon: Eye,
    desc: "Tab switches, idle drift and look-away events are detected in real time.",
    x: 26, y: 82,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    desc: "Every signal becomes trends, scores and insights you can act on.",
    x: 74, y: 82,
  },
] as const;

const EDGES: Array<[string, string]> = [
  ["tasks", "planner"],
  ["tasks", "session"],
  ["planner", "session"],
  ["session", "detect"],
  ["session", "analytics"],
  ["detect", "analytics"],
];

export default function FocusEngine() {
  const [active, setActive] = useState<string | null>("planner");
  const reduce = useReducedMotion();

  const nodeById = (id: string) => NODES.find((n) => n.id === id)!;
  const isConnected = (a: string, b: string) =>
    active !== null && (a === active || b === active);

  return (
    <section id="focus-engine" className="relative py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 45% 40% at 50% 30%, rgba(33, 162, 148,0.06), transparent 65%)",
        }}
      />
      <div className="section-shell">
        <SectionHeading
          label="AI Focus Engine"
          title={
            <>
              One system for your{" "}
              <span className="serif-italic text-gradient-ai">entire focus workflow.</span>
            </>
          }
          description="Five connected systems work together — from capturing a task to understanding your progress. Hover a node to see what it does."
        />

        <Reveal delay={0.15} className="mt-16">
          <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl md:aspect-[16/8]">
            {/* edges */}
            <svg
              aria-hidden
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {EDGES.map(([a, b]) => {
                const na = nodeById(a);
                const nb = nodeById(b);
                const lit = isConnected(a, b);
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke={lit ? "rgba(33, 162, 148,0.7)" : "rgba(14, 39, 35,0.10)"}
                    strokeWidth={lit ? 0.35 : 0.22}
                    style={{
                      transition: reduce ? undefined : "stroke 0.4s ease, stroke-width 0.4s ease",
                    }}
                  />
                );
              })}
            </svg>

            {/* nodes */}
            {NODES.map((node) => {
              const isActive = active === node.id;
              const dim = active !== null && !isActive && !EDGES.some(([a, b]) => (a === active && b === node.id) || (b === active && a === node.id));
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onMouseEnter={() => setActive(node.id)}
                  onFocus={() => setActive(node.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.12 : dim ? 0.94 : 1,
                      opacity: dim ? 0.45 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 18 }}
                    className={`flex flex-col items-center gap-2.5 outline-none ${
                      isActive ? "" : "opacity-90"
                    }`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition-colors md:h-14 md:w-14 ${
                        isActive
                          ? "border-[#1fa294]/60 bg-[#1fa294]/15 shadow-[0_0_30px_rgba(33, 162, 148,0.25)]"
                          : node.accent
                            ? "border-[#1fa294]/30 bg-white/70"
                            : "border-ink/10 bg-white/70"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 md:h-6 md:w-6 ${
                          isActive || node.accent ? "text-[#0b6f66]" : "text-ink/75"
                        }`}
                        aria-hidden
                      />
                    </span>
                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide backdrop-blur-md transition-colors ${
                        isActive
                          ? "border-ink/20 bg-white/70 text-ink"
                          : "border-ink/10 bg-white/70 text-[#43584f]"
                      }`}
                    >
                      {node.label}
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* active node description */}
        <div className="mx-auto mt-8 h-12 max-w-xl text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-[#43584f]"
            >
              {active ? nodeById(active).desc : ""}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
