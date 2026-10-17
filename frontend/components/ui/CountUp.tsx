"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/**
 * Animated number counter — starts when scrolled into view,
 * eases with a expo-out curve, formats with locale separators.
 */
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.8,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent =
          prefix +
          v.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix;
      },
    });
    return () => controls.stop();
  }, [inView, value, decimals, prefix, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
