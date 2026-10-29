"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Timer,
  BarChart3,
  AlertTriangle,
  Sparkles,
  FileText,
  Target,
  Settings,
  Puzzle,
  ChevronRight,
  LogOut,
  Bot,
  X,
  Users,
  CircleDot,
  FolderKanban,
  LifeBuoy,
} from "lucide-react";
import { ProBadge, FreeBadge } from "@/components/ui/ProLockCard";
import { BrandWordmark } from "@/components/brand";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const NAV_ITEMS: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  group: string;
}> = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, group: "Main" },
  { name: "Study Sessions", href: "/dashboard/sessions", icon: Timer, group: "Main" },
  { name: "Analytics & Trends", href: "/dashboard/analytics", icon: BarChart3, group: "Insights" },
  { name: "Distraction Log", href: "/dashboard/distractions", icon: AlertTriangle, group: "Insights" },
  { name: "AI Insights", href: "/dashboard/insights", icon: Sparkles, badge: "AI", group: "Insights" },
  { name: "Reports & Export", href: "/dashboard/reports", icon: FileText, group: "Insights" },
  { name: "Goals & Tasks", href: "/dashboard/goals", icon: Target, group: "Goals & Tasks" },
  { name: "AI Planner", href: "/dashboard/planner", icon: Bot, badge: "AI", group: "Goals & Tasks" },
  { name: "Focus Rooms", href: "/dashboard/focus-rooms", icon: Users, group: "COLLABORATION" },
  { name: "Focus Circles", href: "/dashboard/focus-circles", icon: CircleDot, group: "COLLABORATION" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, group: "System" },
];

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout, isPro } = useAuth();
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const w = window as unknown as { __focusflowExtension?: boolean };
      if (w.__focusflowExtension || document.documentElement.dataset.focusflowExtension === "true") {
        setIsExtensionConnected(true);
      }
    };
    check();
    const onHello = () => setIsExtensionConnected(true);
    window.addEventListener("FOCUSFLOW_EXTENSION_HELLO", onHello);
    return () => window.removeEventListener("FOCUSFLOW_EXTENSION_HELLO", onHello);
  }, []);

  const initials = user?.initials || user?.name?.slice(0, 2).toUpperCase() || "SD";
  const displayName = user?.name || "Member";

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#0a0a0a] text-white">
      <div>
        {/* Brand */}
        <div className="border-b border-white/10 p-5 flex items-center justify-between">
          <BrandWordmark size="sm" href="/" onClick={onClose} />
        </div>

        {/* Navigation — Grouped */}
        <nav className="p-3" aria-label="Dashboard">
          {[...new Set(NAV_ITEMS.map((i) => i.group))].map((group) => (
            <div key={group} className="mb-3">
              <div className="px-3.5 pb-1 pt-2 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-gray-500">
                {group}
              </div>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                  const [itemPath, itemQuery] = item.href.split("?");
                  const isActive =
                    item.href === "/dashboard/goals"
                      ? pathname === "/dashboard/goals"
                      : pathname === itemPath &&
                        (!itemQuery
                          ? !searchParams.get("view")
                          : itemQuery === `view=${searchParams.get("view")}`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? "border border-[#FF4500]/40 bg-[#FF4500]/10 text-white font-bold shadow-xs"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${isActive ? "text-[#FF4500]" : "text-gray-400"}`}
                          aria-hidden
                        />
                        <span>{item.name}</span>
                      </span>
                      {item.badge && (
                        <span className="rounded-md border border-[#FF4500]/30 bg-[#FF4500]/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#FF4500]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Extension & User status */}
      <div className="space-y-3 border-t border-white/10 p-4">
        {/* Extension Status Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-[#FF4500]">
            <Puzzle className="h-4 w-4" aria-hidden />
            <span>Chrome Extension</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed font-light">
            Live site shielding during focus sprints.
          </p>
          <div className="flex items-center justify-between pt-2 text-[10px] text-gray-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isExtensionConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-gray-500"}`} />
              <span className={isExtensionConnected ? "text-gray-300" : "text-gray-500"}>
                {isExtensionConnected ? "Connected" : "Not Connected"}
              </span>
            </span>
            <Link
              href={isExtensionConnected ? "/dashboard/settings" : "/download"}
              onClick={onClose}
              className="flex items-center font-semibold text-[#FF4500] hover:underline"
            >
              {isExtensionConnected ? "Config" : "Install"} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 text-xs font-mono font-bold text-[#FF4500]">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden text-xs">
              <div className="flex items-center gap-1.5">
                <span className="max-w-20 truncate font-semibold text-white">
                  {displayName}
                </span>
                {isPro ? <ProBadge className="scale-90" /> : <FreeBadge className="scale-90" />}
              </div>
              <span className="max-w-28 truncate text-[10px] text-gray-400 font-mono">
                {user?.email || "Signed in"}
              </span>
            </div>
          </div>
          <button
            id="logout-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-rose-950/40 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0a0a0a] lg:block">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#0a0a0a] shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-3 top-4 z-10 rounded-lg p-2 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          {navContent}
        </aside>
      </div>
    </>
  );
}
