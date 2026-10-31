"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: boolean;
}

/**
 * FocusFlow dark glass surface card with subtle cursor
 * responsive 3D tilt, specular highlights, and fiery glow.
 */
export default function GlassCard({
  children,
  className = "",
  tilt = false,
  glow = false,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const highlightX = useMotionValue(50);
  const highlightY = useMotionValue(50);

  const highlight = useMotionTemplate`radial-gradient(360px circle at ${highlightX}% ${highlightY}%, rgba(255, 69, 0, 0.12), transparent 70%)`;

  const handleMove = (event: React.MouseEvent) => {
    if (!tilt || reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 6);
    rotateX.set((0.5 - py) * 6);
    highlightX.set(px * 100);
    highlightY.set(py * 100);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    highlightX.set(50);
    highlightY.set(50);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{
        rotateX: tilt ? rotateX : undefined,
        rotateY: tilt ? rotateY : undefined,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
      }}
      transition={{ type: "spring", stiffness: 160, damping: 18 }}
      className={`glass-card relative overflow-hidden rounded-[22px] border border-[#262832] bg-[#12131A]/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] text-white ${className}`}
    >
      {tilt && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: highlight, opacity: tilt ? 1 : 0 }}
        />
      )}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#FF4500]/15 blur-3xl"
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
