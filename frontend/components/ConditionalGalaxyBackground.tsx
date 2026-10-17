"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ParallaxStarsBackground from "@/components/ui/ParallaxStarsBackground";

/**
 * Renders the moving galaxy background across black-background public pages.
 * Excluded on /dashboard and the dedicated light-theme /download Extension product page.
 */
export default function ConditionalGalaxyBackground() {
  const pathname = usePathname();

  // Exclude dashboard routes
  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <ParallaxStarsBackground
      asBackgroundOnly
      speed={1}
      interactiveParallax={true}
      className="fixed inset-0 pointer-events-none z-0 opacity-100"
    />
  );
}
