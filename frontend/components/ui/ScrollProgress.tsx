"use client";

import { motion, useScroll, useSpring } from "framer-motion";

import { usePathname } from "next/navigation";

/** Thin gradient progress bar pinned to the top of the viewport. */
export default function ScrollProgress() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-linear-to-r from-tide-500 via-sky-400 to-amber-400"
      style={{ scaleX }}
    />
  );
}
