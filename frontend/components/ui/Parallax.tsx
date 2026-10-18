"use client";

import {
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import type { ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Pixels of travel across the viewport pass. Positive = drifts up. */
  distance?: number;
  className?: string;
}

/** Scroll-driven parallax: content drifts `distance`px while in view. */
export default function Parallax({
  children,
  distance = 60,
  className,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yRaw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(yRaw, { stiffness: 90, damping: 24 });

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
