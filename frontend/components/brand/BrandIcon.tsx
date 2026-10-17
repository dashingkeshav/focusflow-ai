import React from "react";
import Image from "next/image";

export interface BrandIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  variant?: "image" | "svg";
  glow?: boolean;
}

const sizeMap = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

export default function BrandIcon({
  size = "md",
  className = "",
  glow = false,
}: BrandIconProps) {
  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 32;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${
        glow ? "drop-shadow-[0_0_16px_rgba(255,69,0,0.45)]" : ""
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src="/brand/focusflow-icon.png"
        alt="FocusFlow Icon"
        width={pixelSize}
        height={pixelSize}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
}
