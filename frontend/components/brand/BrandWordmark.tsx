"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface BrandWordmarkProps {
  href?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  onClick?: () => void;
  showBadge?: boolean;
  badgeText?: string;
  showIcon?: boolean;
}

const sizeClasses: Record<string, string> = {
  xs: "h-5 sm:h-6",
  sm: "h-7 sm:h-8",
  md: "h-8 sm:h-9 md:h-9.5",
  lg: "h-10 sm:h-12",
  xl: "h-12 sm:h-14 md:h-16",
};

export default function BrandWordmark({
  href = "/",
  size = "md",
  className = "",
  imageClassName = "",
  priority = true,
  onClick,
}: BrandWordmarkProps) {
  const heightClass = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div
      className={`group inline-flex items-center shrink-0 select-none transition-transform duration-200 ${className}`}
    >
      <Image
        src="/brand/focusflow-logo.png"
        alt="FocusFlow AI"
        width={900}
        height={177}
        priority={priority}
        className={`w-auto shrink-0 object-contain transition-transform duration-300 group-hover:scale-[1.02] active:scale-[0.98] ${heightClass} ${imageClassName}`}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="inline-flex items-center focus:outline-hidden"
        aria-label="FocusFlow AI Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
