"use client";

import { useEffect } from "react";

/**
 * Delegated in-page anchor scrolling.
 *
 * Native anchor navigation (`/#section`, `#section`) is flaky inside the
 * Next.js App Router — clicks can be swallowed, and native `scrollIntoView`
 * smooth animations can be canceled by client-side re-renders. This
 * capture-phase listener intercepts same-page hash links and runs a
 * requestAnimationFrame tween that re-issues the scroll every frame, so
 * nothing can leave it half-finished. The offset respects
 * `scroll-padding-top` on <html> (96px) so the fixed navbar never covers
 * the target. Full page loads with a hash (direct links, refresh) keep
 * working natively.
 */

function getScrollPaddingTop(): number {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop;
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}

function smoothScrollTo(targetY: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const clamped = Math.max(0, Math.min(targetY, max));
  const startY = window.scrollY;
  const diff = clamped - startY;
  if (Math.abs(diff) < 2) return;

  // Honor reduced-motion preference: jump instantly.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, clamped);
    return;
  }

  const duration = Math.min(900, Math.max(350, Math.abs(diff) * 0.35));
  const start = performance.now();
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + diff * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function AnchorScroll() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only same-page hash links: "#section" or "/#section" while on "/"
      let hash: string | null = null;
      if (href.startsWith("#")) {
        hash = href.slice(1);
      } else if (href.startsWith("/#") && window.location.pathname === "/") {
        hash = href.slice(2);
      }
      if (!hash) return;

      const target = document.getElementById(hash);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();

      const offset = getScrollPaddingTop();
      const y = target.getBoundingClientRect().top + window.scrollY - offset;
      smoothScrollTo(y);
      window.history.pushState(null, "", `#${hash}`);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
