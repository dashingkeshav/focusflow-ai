/**
 * FocusFlow AI logo mark — an "orbit" monogram that reads on any canvas.
 * A gradient ring (drawn with a gap) orbits a glowing core dot.
 * Optional continuous rotation when `animated` is set.
 */
export default function Logo({
  size = 34,
  animated = false,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-[30%] bg-linear-to-br from-tide-100 via-white to-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_18px_-8px_rgba(13, 138, 125,0.45)]"
      />
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full p-[12%]">
        <defs>
          <linearGradient id="ff-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d8a7d" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="url(#ff-orbit)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="40 10"
          className={animated ? "origin-center animate-spin-slow" : undefined}
        />
      </svg>
      <span className="relative h-[22%] w-[22%] rounded-full bg-linear-to-b from-tide-500 to-sky-500 shadow-[0_0_10px_rgba(33, 162, 148,0.7)]" />
    </span>
  );
}
