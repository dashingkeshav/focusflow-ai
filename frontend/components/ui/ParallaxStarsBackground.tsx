"use client";

import React, { useMemo, useState, useEffect } from "react";

export interface ParallaxStarsBackgroundProps {
  /**
   * Title text to display in the center (Use \n for line breaks)
   */
  title?: string;
  /**
   * Subtitle or additional content
   */
  children?: React.ReactNode;
  /**
   * Additional classes for the container
   */
  className?: string;
  /**
   * Animation speed multiplier. Higher is faster.
   * @default 1
   */
  speed?: number;
  /**
   * Visual theme: "dark" (Galaxy space) or "light"
   * @default "dark"
   */
  theme?: "light" | "dark";
  /**
   * Enable subtle cursor parallax for true 3D depth
   * @default true
   */
  interactiveParallax?: boolean;
  /**
   * When true, acts as a pure background layer (hides title/children container)
   * @default true
   */
  asBackgroundOnly?: boolean;
}

// Linear congruential generator for deterministic star rendering (zero SSR hydration mismatches)
function createSeededRandom(initialSeed: number) {
  let s = initialSeed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Crisp, high-contrast celestial stars palette matching the user's galaxy animation
const STAR_COLORS = [
  "#ffffff",
  "#ffffff",
  "#ffffff",
  "rgba(255, 255, 255, 0.95)",
  "rgba(225, 240, 255, 0.95)", // Celestial ice-white
  "rgba(200, 230, 255, 0.90)", // Cyan-blue spark
  "rgba(255, 220, 180, 0.85)", // Warm focus ember
];

// Generate box shadows for seamless multi-star layers
const generateBoxShadows = (count: number, hasGlow: boolean = false, seed: number = 42) => {
  const rand = createSeededRandom(seed);
  const shadows: string[] = [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * 2560);
    const y = Math.floor(rand() * 2560);
    const color = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];

    if (hasGlow) {
      const blur = Math.floor(rand() * 3) + 2;
      shadows.push(`${x}px ${y}px ${blur}px ${color}`);
    } else {
      shadows.push(`${x}px ${y}px ${color}`);
    }
  }
  return shadows.join(", ");
};

export function ParallaxStarsBackground({
  title,
  children,
  className = "",
  speed = 1,
  theme = "dark",
  interactiveParallax = true,
  asBackgroundOnly = true,
}: ParallaxStarsBackgroundProps) {
  // Cursor parallax coordinates
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactiveParallax) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMouseOffset({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [interactiveParallax]);

  // Deterministic star distributions: 650 micro-stars, 220 medium stars, 90 glowing beacons
  const shadowsSmall = useMemo(() => generateBoxShadows(650, false, 101), []);
  const shadowsMedium = useMemo(() => generateBoxShadows(220, true, 202), []);
  const shadowsBig = useMemo(() => generateBoxShadows(90, true, 303), []);

  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 bg-bg ${className}`}
      aria-hidden="true"
    >
      {/* Keyframe animations and gradients */}
      <style>{`
        @keyframes animGalaxyDrift {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-2560px); }
        }
        @keyframes celestialTwinkle {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        .bg-radial-deep-space {
          background: radial-gradient(ellipse 100% 70% at 50% 60%, rgba(15, 23, 42, 0.45) 0%, rgba(5, 5, 5, 0.98) 100%);
        }
      `}</style>

      {/* Deep Space Cosmic Atmosphere Glow */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-radial-deep-space" />

      {/* Layer 1: Small Fast Micro-Stardust (650 stars) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(${mouseOffset.x * 12}px, ${mouseOffset.y * 12}px, 0)`,
          transition: "transform 0.3s ease-out",
        }}
      >
        <div
          className="absolute left-0 top-0 w-[1.5px] h-[1.5px] bg-transparent will-change-transform animate-[animGalaxyDrift_50s_linear_infinite]"
          style={{
            boxShadow: shadowsSmall,
            animationDuration: `${50 / speed}s`,
          }}
        >
          {/* Seamless 2560px duplicate for infinite scroll loop */}
          <div
            className="absolute top-[2560px] w-[1.5px] h-[1.5px] bg-transparent"
            style={{ boxShadow: shadowsSmall }}
          />
        </div>
      </div>

      {/* Layer 2: Medium Floating Galaxy Stars (220 stars with glow) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(${mouseOffset.x * 24}px, ${mouseOffset.y * 24}px, 0)`,
          transition: "transform 0.4s ease-out",
        }}
      >
        <div
          className="absolute left-0 top-0 w-[2.5px] h-[2.5px] bg-transparent will-change-transform animate-[animGalaxyDrift_100s_linear_infinite]"
          style={{
            boxShadow: shadowsMedium,
            animationDuration: `${100 / speed}s`,
          }}
        >
          {/* Seamless 2560px duplicate */}
          <div
            className="absolute top-[2560px] w-[2.5px] h-[2.5px] bg-transparent"
            style={{ boxShadow: shadowsMedium }}
          />
        </div>
      </div>

      {/* Layer 3: Large Radiant Cosmic Beacons & Sparks (90 glowing stars) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate3d(${mouseOffset.x * 38}px, ${mouseOffset.y * 38}px, 0)`,
          transition: "transform 0.5s ease-out",
        }}
      >
        <div
          className="absolute left-0 top-0 w-[3.5px] h-[3.5px] bg-transparent will-change-transform animate-[animGalaxyDrift_150s_linear_infinite]"
          style={{
            boxShadow: shadowsBig,
            animationDuration: `${150 / speed}s`,
          }}
        >
          {/* Seamless 2560px duplicate */}
          <div
            className="absolute top-[2560px] w-[3.5px] h-[3.5px] bg-transparent"
            style={{ boxShadow: shadowsBig }}
          />
        </div>
      </div>

      {/* Center Content & Title (only when not used as background only) */}
      {!asBackgroundOnly && title && (
        <div className="relative z-10 pointer-events-auto flex h-full flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white">
            {title.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                <span>{line}</span>
                {i < title.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </h1>

          {children && <div className="mt-8">{children}</div>}
        </div>
      )}
    </div>
  );
}

export default ParallaxStarsBackground;
