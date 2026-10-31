"use client";

import { useState, useEffect, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Timer,
  BarChart3,
  ShieldAlert,
  Sparkles,
  FileText,
  Target,
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bot,
  X,
  Users,
  CircleDot,
  FolderKanban,
  LifeBuoy,
  Camera,
} from "lucide-react";
import { ProBadge, FreeBadge } from "@/components/ui/ProLockCard";
import { BrandWordmark } from "@/components/brand";

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export interface NavItemDef {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string;
  group: "Command & Focus" | "Insights & Protection" | "Collaboration" | "Hardware & Workspace";
}

export const NAV_ITEMS: NavItemDef[] = [
  // 1. Command & Focus
  { name: "Command Center", href: "/dashboard", icon: LayoutDashboard, group: "Command & Focus" },
  { name: "Focus Mode", href: "/dashboard/sessions", icon: Timer, group: "Command & Focus" },
  { name: "Tasks & Goals", href: "/dashboard/goals", icon: Target, group: "Command & Focus" },
  { name: "AI Planner", href: "/dashboard/planner", icon: Bot, badge: "Gemini", group: "Command & Focus" },

  // 2. Insights & Protection
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, group: "Insights & Protection" },
  { name: "Distraction Shield", href: "/dashboard/distractions", icon: ShieldAlert, group: "Insights & Protection" },
  { name: "AI Insights", href: "/dashboard/insights", icon: Sparkles, badge: "AI", group: "Insights & Protection" },
  { name: "Reports", href: "/dashboard/reports", icon: FileText, group: "Insights & Protection" },

  // 3. Collaboration
  { name: "Focus Rooms", href: "/dashboard/focus-rooms", icon: Users, group: "Collaboration" },
  { name: "Focus Circles", href: "/dashboard/focus-circles", icon: CircleDot, group: "Collaboration" },
  { name: "Project Pods", href: "/dashboard/project-pods", icon: FolderKanban, group: "Collaboration" },
  { name: "Unblock Exchange", href: "/dashboard/unblock-exchange", icon: LifeBuoy, group: "Collaboration" },

  // 4. Hardware & Workspace
  { name: "Camera Attention AI", href: "/dashboard/sessions#camera", icon: Camera, badge: "MediaPipe", group: "Hardware & Workspace" },
  { name: "Settings & Cloud", href: "/dashboard/settings", icon: Settings, group: "Hardware & Workspace" },
];

const GROUPS = [
  "Command & Focus",
  "Insights & Protection",
  "Collaboration",
  "Hardware & Workspace",
] as const;

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isPro } = useAuth();
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const initials = user?.initials || user?.name?.slice(0, 2).toUpperCase() || "SD";
  const displayName = user?.name || "Member";

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#0E0F15] text-[#F4F4F5] border-r border-[#262832]">
      <div className="overflow-y-auto">
        {/* Brand Header */}
        <div className="border-b border-[#262832] p-4 flex items-center justify-between">
          <BrandWordmark size="sm" href="/" onClick={onClose} />
          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation — 4 Expandable Groups */}
        <nav className="p-2.5 space-y-3" aria-label="Dashboard Navigation">
          {GROUPS.map((group) => {
            const isCollapsed = collapsedGroups[group];
            const items = NAV_ITEMS.filter((item) => item.group === group);
            return (
              <div key={group} className="space-y-0.5">
                {/* Group Header with toggle */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <span>{group}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-zinc-600" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-zinc-600" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pt-0.5">
                    {items.map((item) => {
                      const [itemPath] = item.href.split("#");
                      const isActive =
                        pathname === itemPath ||
                        (item.href === "/dashboard" && pathname === "/dashboard");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                            isActive
                              ? "border border-[#FF4500]/40 bg-[#FF4500]/10 text-white font-semibold shadow-xs"
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0 truncate">
                            <Icon
                              className={`h-4 w-4 shrink-0 ${isActive ? "text-[#FF4500]" : "text-zinc-400"}`}
                              aria-hidden
                            />
                            <span className="truncate">{item.name}</span>
                          </span>
                          {item.badge && (
                            <span className="shrink-0 rounded-md border border-[#FF4500]/30 bg-[#FF4500]/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-[#FF4500]">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Extension Status & User Card */}
      <div className="space-y-2.5 border-t border-[#262832] p-3 bg-[#08090D]/50">
        {/* Extension Pill */}
        <div className="rounded-xl border border-[#262832] bg-[#12131A] p-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isExtensionConnected
                    ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "bg-zinc-600"
                }`}
              />
              <span className={isExtensionConnected ? "text-emerald-400" : "text-zinc-400"}>
                {isExtensionConnected ? "Shielding Online" : "Extension Idle"}
              </span>
            </span>
            <Link
              href="/download"
              onClick={onClose}
              className="text-[#FF4500] hover:underline font-bold text-[10px]"
            >
              {isExtensionConnected ? "Sync" : "Install"}
            </Link>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 text-xs font-mono font-bold text-[#FF4500]">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 text-xs truncate">
              <div className="flex items-center gap-1 truncate">
                <span className="truncate font-semibold text-white text-xs">
                  {displayName}
                </span>
                {isPro ? <ProBadge className="scale-75 origin-left" /> : <FreeBadge className="scale-75 origin-left" />}
              </div>
              <span className="truncate text-[10px] text-zinc-500 font-mono">
                {user?.email || "Member"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (compact w-60) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60 lg:flex-col shadow-2xl">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
