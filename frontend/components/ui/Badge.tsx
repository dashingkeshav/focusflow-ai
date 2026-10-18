import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

export default function Badge({ children, accent = false, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-wide ${
        accent
          ? "border-[#FF4500]/40 bg-[#FF4500]/10 text-[#FF4500] shadow-xs"
          : "border-white/10 bg-white/5 text-gray-300 shadow-xs"
      } ${className}`}
    >
      {accent && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF4500] shadow-[0_0_8px_rgba(255,69,0,0.6)]" aria-hidden />
      )}
      {children}
    </span>
  );
}
