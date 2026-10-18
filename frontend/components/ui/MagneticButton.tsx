"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import Link from "next/link";

interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Magnetic hover button with spring-follow translate,
 * subtle scale and metallic shine. Degrades to a static
 * button on touch devices and reduced motion.
 * Directly wraps Link or button to guarantee 100% clickable surface.
 */
export default function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 180, damping: 16, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 180, damping: 16, mass: 0.4 });

  const handleMove = (event: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    rawX.set(Math.max(-18, Math.min(18, relX * 0.18)));
    rawY.set(Math.max(-10, Math.min(10, relY * 0.14)));
  };

  const reset = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const variantClass = variant === "primary" ? "btn-primary" : "btn-ghost";
  const sizeClass = size === "lg" ? "px-7 min-h-[52px] text-[15px]" : "";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x, y }}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      className={`inline-block ${className}`}
    >
      {href ? (
        <Link
          href={href}
          aria-label={ariaLabel}
          className={`btn ${variantClass} ${sizeClass} inline-flex items-center justify-center`}
        >
          {children}
        </Link>
      ) : (
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
          className={`btn ${variantClass} ${sizeClass} inline-flex items-center justify-center`}
        >
          {children}
        </button>
      )}
    </motion.div>
  );
}
