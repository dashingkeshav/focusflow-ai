"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees. */
  max?: number;
  glare?: boolean;
}

/**
 * 3D tilt card — tracks the cursor and rotates with a spring,
 * plus a soft radial glare that follows the pointer.
 */
export default function TiltCard({
  children,
  className = "",
  max = 9,
  glare = true,
}: TiltCardProps) {
  const rotateX = useSpring(0, { stiffness: 200, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 22 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.55), transparent 55%)`;

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rotateY.set((px - 0.5) * max * 2);
    rotateX.set(-(py - 0.5) * max * 2);
    gx.set(px * 100);
    gy.set(py * 100);
  }

  function handleLeave() {
    rotateX.set(0);
    rotateY.set(0);
    gx.set(50);
    gy.set(50);
  }

  return (
    <motion.div
      className={`group/tilt relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  );
}
