"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDot,
  Crosshair,
  ListChecks,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";

const workflow = [
  { label: "Set a goal", icon: Target },
  { label: "Build a plan", icon: Sparkles },
  { label: "Focus on the work", icon: Crosshair },
  { label: "See your progress", icon: ListChecks },
];

export default function FocusWorkspace() {
  const reduce = useReducedMotion();
  const scene = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [4, -4]), {
    stiffness: 90,
    damping: 22,
  });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [-3, 3]), {
    stiffness: 90,
    damping: 22,
  });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType === "touch" || !scene.current) return;
    const bounds = scene.current.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      ref={scene}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      className="relative mx-auto aspect-[1.12/1] w-full max-w-[620px] [perspective:1500px]"
      aria-label="A visual overview of the FocusFlow workflow"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-[48%] bg-[radial-gradient(ellipse_at_center,rgba(89,190,184,0.2),rgba(187,224,244,0.15)_42%,transparent_72%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[12%] rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(228,241,244,0.3))] shadow-[0_34px_90px_-48px_rgba(34,75,93,0.32)]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(57,113,132,.13) .7px, transparent .7px)",
          backgroundSize: "17px 17px",
        }}
      />

      <motion.div
        style={{
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className="absolute inset-[9%] [transform-style:preserve-3d]"
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-[8%] top-[10%] w-[72%] rounded-[26px] border border-white/90 bg-white/85 p-5 shadow-[0_30px_70px_-38px_rgba(34,75,93,0.42)] backdrop-blur-xl sm:p-6"
          style={{ transform: "translateZ(48px)" }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tide-50 text-tide-700">
                <Target className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mist-500">
                  Goal
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">One clear direction</p>
              </div>
            </div>
            <span className="rounded-full border border-tide-500/15 bg-tide-50 px-2.5 py-1 text-[10px] font-semibold text-tide-700">
              Your priorities
            </span>
          </div>

          <div className="relative mt-5 grid grid-cols-4 gap-1.5 sm:gap-3">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="relative min-w-0">
                  {index > 0 && (
                    <span
                      aria-hidden
                      className="absolute -left-[calc(50%+5px)] top-4 hidden h-px w-[calc(100%-10px)] bg-gradient-to-r from-tide-300 to-sky-200 sm:block"
                    />
                  )}
                  <div className="relative">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-tide-500/15 bg-white text-tide-700 shadow-[0_5px_18px_-9px_rgba(22,143,134,.24)]"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-2 max-w-20 text-[9px] font-medium leading-snug text-mist-600 sm:text-[10px]">
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: 18, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-[13%] right-[1%] w-[49%] rounded-[22px] border border-white/90 bg-white/90 p-4 shadow-[0_25px_55px_-34px_rgba(34,75,93,0.4)] backdrop-blur-xl sm:p-5"
          style={{ transform: "translateZ(76px)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-mist-600">
                AI plan
              </span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-mist-400" aria-hidden />
          </div>
          <p className="mt-3 text-xs font-semibold text-ink sm:text-sm">A clearer next step</p>
          <div className="mt-3 space-y-2.5">
            {["Break goals into milestones", "Shape work around your time", "Adapt as plans change"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tide-500" />
                  <span className="text-[9px] leading-tight text-mist-600 sm:text-[10px]">{item}</span>
                </div>
              ),
            )}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, x: -16, y: 12 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-[5%] left-[5%] w-[43%] rounded-[20px] border border-white/90 bg-white/90 p-3.5 shadow-[0_22px_50px_-32px_rgba(34,75,93,0.38)] backdrop-blur-xl sm:p-4"
          style={{ transform: "translateZ(32px)" }}
        >
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-tide-700" aria-hidden />
            <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-mist-600 sm:text-[10px]">
              Focus session
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-tide-500/20 bg-tide-50 text-tide-700">
              <CircleDot className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="flex-1 text-[10px] font-medium text-mist-600">Ready when you are</span>
            <ArrowDownRight className="h-3.5 w-3.5 text-mist-400" aria-hidden />
          </div>
          <p className="mt-2 text-[9px] text-mist-500">Protect your attention. Make progress.</p>
        </motion.div>
      </motion.div>

      <div aria-hidden className="pointer-events-none absolute right-[8%] top-[7%] h-2 w-2 rounded-full bg-sky-400/70 shadow-[0_0_18px_rgba(84,182,223,.45)]" />
      <div aria-hidden className="pointer-events-none absolute bottom-[18%] left-[12%] h-1.5 w-1.5 rounded-full bg-tide-500/55" />
    </div>
  );
}
