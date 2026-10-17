"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

/**
 * The marketing footer belongs on public pages only — inside the dashboard
 * it is clutter. Renders nothing under /dashboard.
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return <Footer />;
}
