import type { CSSProperties, ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full loop of the content. */
  duration?: number;
  reverse?: boolean;
  className?: string;
}

/**
 * Infinite horizontal ticker. Content is duplicated (second copy
 * aria-hidden) and the track translates -50% for a seamless loop.
 * Pauses on hover. Pure CSS — safe in server components.
 */
export default function Marquee({
  children,
  duration = 34,
  reverse = false,
  className = "",
}: MarqueeProps) {
  return (
    <div
      className={`marquee ${reverse ? "marquee-reverse" : ""} ${className}`}
      style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
    >
      <div className="marquee-track">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
