'use client';

import React from 'react';

interface FocusScoreGaugeProps {
  score: number;
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
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let scoreColor = '#10b981'; // Green
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let statusText = 'Optimal Focus';

  if (clampedScore < 60) {
    scoreColor = '#f43f5e'; // Red/Rose
    glowColor = 'rgba(244, 63, 94, 0.4)';
    statusText = 'Distracted';
  } else if (clampedScore < 80) {
    scoreColor = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.4)';
    statusText = 'Moderate Focus';
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
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
          <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
            {clampedScore}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">
            / 100
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-col items-center">
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/10" style={{ color: scoreColor, backgroundColor: `${scoreColor}15` }}>
          {statusText}
        </span>
        <span className="text-[11px] text-gray-400 mt-1">{label}</span>
      </div>
    </div>
  );
}
