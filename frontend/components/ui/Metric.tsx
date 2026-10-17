import type { ReactNode } from "react";

interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "default" | "ai" | "success" | "warning" | "danger";
  className?: string;
}

const accentClass: Record<NonNullable<MetricProps["accent"]>, string> = {
  default: "text-slate-900",
  ai: "text-teal-600",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

export default function Metric({
  label,
  value,
  hint,
  accent = "default",
  className = "",
}: MetricProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${accentClass[accent]}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
