'use client';

import React from 'react';

interface FocusScoreGaugeProps {
  // null = no real telemetry has been measured yet → display "Not available"
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function FocusScoreGauge({
  score,
  size = 180,
  strokeWidth = 14,
  label = 'Focus Score',
}: FocusScoreGaugeProps) {
  const hasScore = typeof score === 'number' && Number.isFinite(score);
  const clampedScore = hasScore ? Math.max(0, Math.min(100, score as number)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasScore
    ? circumference - (clampedScore / 100) * circumference
    : circumference; // empty arc when there is no measured score

  let scoreColor = '#FF4500'; // FocusFlow Accent
  let glowColor = 'rgba(255, 69, 0, 0.45)';
  let statusText = 'Optimal Flow';

  if (!hasScore) {
    scoreColor = '#6b7280'; // Gray
    glowColor = 'rgba(107, 114, 128, 0.2)';
    statusText = 'Not available';
  } else if (clampedScore < 50) {
    scoreColor = '#f43f5e'; // Rose
    glowColor = 'rgba(244, 63, 94, 0.35)';
    statusText = 'Distracted';
  } else if (clampedScore < 75) {
    scoreColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.35)';
    statusText = 'Moderate Focus';
  } else {
    scoreColor = '#FF4500';
    glowColor = 'rgba(255, 69, 0, 0.45)';
    statusText = 'Optimal Flow';
  }

  return (
    <div className="relative flex flex-col items-center justify-center font-inter">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Score Indicator Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 10px ${glowColor})`,
            }}
          />
        </svg>
        {/* Inner Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold tracking-tight text-white font-serif">
            {hasScore ? clampedScore : '—'}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5 font-mono">
            {hasScore ? '/ 100' : 'No data yet'}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center">
        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border border-white/10" style={{ color: scoreColor, backgroundColor: `${scoreColor}18` }}>
          {statusText}
        </span>
        <span className="text-[11px] font-mono text-gray-400 mt-1">{label}</span>
      </div>
    </div>
  );
}
