"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Bell,
  BellOff,
  Flame,
  Play,
  LogOut,
  Menu,
  Camera,
  CheckCheck,
  Trash2,
  Zap,
  Trophy,
  AlertTriangle,
  Target,
  Sparkles,
  X,
  ExternalLink,
  ChevronRight,
  Settings,
} from "lucide-react";
import { ProBadge } from "@/components/ui/ProLockCard";
import { useCameraMonitoring } from "@/context/CameraContext";
import { useNotifications } from "@/context/NotificationContext";
import { BrandWordmark } from "@/components/brand";

interface TopHeaderProps {
  activeSession?: boolean;
  currentScore?: number | null;
  onMenuClick?: () => void;
  streakDays?: number;
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "Recently";
  }
}

export default function TopHeader({
  activeSession = false,
  currentScore = null,
  onMenuClick,
  streakDays,
}: TopHeaderProps) {
  const { user, logout, isPro } = useAuth();
  const { cameraEnabled, cameraStatus } = useCameraMonitoring();
  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    browserPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    sendTestNotification,
    requestBrowserPermission,
  } = useNotifications();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cameraStreaming = cameraStatus === "active";

  const [notifOpen, setNotifOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const [testSending, setTestSending] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const viewParam = searchParams.get("view");

  const pageTitle =
    pathname === "/dashboard/goals"
      ? viewParam === "tasks"
        ? "Tasks"
        : viewParam === "habits"
        ? "Habits & Streaks"
        : viewParam === "achievements"
        ? "Achievements"
        : viewParam === "calendar"
        ? "Chronos Flow"
        : "Goals"
      : ({
          "/dashboard": "Overview",
          "/dashboard/sessions": "Study Sessions",
          "/dashboard/analytics": "Analytics & Trends",
          "/dashboard/distractions": "Distraction Log",
          "/dashboard/insights": "AI Insights",
          "/dashboard/reports": "Reports & Export",
          "/dashboard/planner": "AI Planner",
          "/dashboard/focus-rooms": "Focus Rooms",
          "/dashboard/focus-circles": "Focus Circles",
          "/dashboard/project-pods": "Project Pods",
          "/dashboard/unblock-exchange": "Unblock Exchange",
          "/dashboard/settings": "Settings",
        }[pathname] || "Workspace");

  const hasScore = typeof currentScore === "number" && Number.isFinite(currentScore);
  const score = hasScore ? Math.max(0, Math.min(100, currentScore as number)) : null;
  const scoreColor = !hasScore
    ? "text-gray-400"
    : (score as number) >= 80
    ? "text-emerald-400"
    : (score as number) >= 60
    ? "text-[#FF4500]"
    : "text-rose-400";

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  const filteredNotifications =
    filterTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleSendTest = async () => {
    try {
      setTestSending(true);
      await sendTestNotification();
    } finally {
      setTimeout(() => setTestSending(false), 400);
    }
  };

  const handleNotificationClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.link) {
      setNotifOpen(false);
      router.push(notif.link);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "focus":
        return <Zap className="h-3.5 w-3.5 text-[#FF4500]" />;
      case "achievement":
        return <Trophy className="h-3.5 w-3.5 text-amber-400" />;
      case "distraction":
        return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
      case "streak":
        return <Flame className="h-3.5 w-3.5 text-orange-400" />;
      case "goal":
        return <Target className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-cyan-400" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "focus":
        return "bg-[#FF4500]/15 border-[#FF4500]/30 text-[#FF4500]";
      case "achievement":
        return "bg-amber-500/15 border-amber-500/30 text-amber-400";
      case "distraction":
        return "bg-rose-500/15 border-rose-500/30 text-rose-400";
      case "streak":
        return "bg-orange-500/15 border-orange-500/30 text-orange-400";
      case "goal":
        return "bg-purple-500/15 border-purple-500/30 text-purple-400";
      default:
        return "bg-cyan-500/15 border-cyan-500/30 text-cyan-400";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/85 px-4 backdrop-blur-xl sm:px-6 text-white">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open dashboard menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden flex items-center pr-2 border-r border-white/10 shrink-0">
          <BrandWordmark size="sm" href="/dashboard" />
        </div>

        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-white font-serif truncate">
            {pageTitle}
          </h1>
          {isPro ? (
            <ProBadge />
          ) : (
            <Link
              href="/pricing"
              className="group flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono font-semibold text-gray-300 hover:border-[#FF4500]/50 hover:text-[#FF4500] transition-all"
            >
              <span>FREE</span>
              <span className="text-[#FF4500] font-bold group-hover:underline">Upgrade</span>
            </Link>
          )}
        </div>

        {typeof streakDays === "number" && streakDays > 0 && (
          <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-amber-300 sm:flex">
            <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>{streakDays} Day Streak</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Camera Monitoring Badge */}
        <div
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium lg:flex ${
            cameraStreaming
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : cameraEnabled
              ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
              : "border-white/10 bg-white/5 text-gray-400"
          }`}
        >
          {cameraStreaming ? (
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <Camera className={`h-3.5 w-3.5 ${cameraEnabled ? "text-amber-400" : "text-gray-400"}`} />
          )}
          <span>
            {cameraStreaming ? "Monitoring Active" : cameraEnabled ? "Camera Enabled" : "Camera Off"}
          </span>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                activeSession ? "bg-[#FF4500]" : "bg-gray-500"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                activeSession ? "bg-[#FF4500]" : "bg-gray-400"
              }`}
            />
          </span>
          <span className="hidden font-mono text-xs text-gray-300 sm:inline">
            {activeSession ? "Focus Mode Active" : "No Session"}
          </span>
          <span className="font-mono text-xs text-gray-300 sm:hidden">
            {activeSession ? "Focus" : "Idle"}
          </span>
        </div>

        {/* Focus Score Pill */}
        <div
          className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono font-semibold md:flex"
          title={hasScore ? "Live focus score for active session" : "No session telemetry yet"}
        >
          <span className="text-gray-400">Score:</span>
          <span className={`text-xs font-bold ${scoreColor}`}>
            {hasScore ? `${score}/100` : "—"}
          </span>
        </div>

        {/* Start Session CTA */}
        <Link
          href="/dashboard/sessions"
          id="header-start-session"
          className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-[#FF4500]/25"
        >
          <Play className="h-3 w-3 fill-current" />
          <span className="hidden sm:inline">Focus Session</span>
        </Link>

        {/* Real-time Notifications Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            id="notifications-btn"
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative rounded-xl border p-2 transition-all duration-200 ${
              notifOpen
                ? "border-[#FF4500]/60 bg-[#FF4500]/15 text-white shadow-lg shadow-[#FF4500]/20"
                : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <Bell className={`h-4 w-4 transition-transform duration-200 ${unreadCount > 0 ? "text-[#FF4500]" : ""}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4500] px-1 text-[9px] font-bold text-white shadow-md shadow-[#FF4500]/60 ring-2 ring-[#0a0a0a]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF4500] opacity-40" />
                <span className="relative">{unreadCount > 99 ? "99+" : unreadCount}</span>
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0e0e12]/95 p-0 shadow-2xl backdrop-blur-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#FF4500]">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[#FF4500]/20 border border-[#FF4500]/40 px-1.5 py-0.2 text-[9px] text-[#FF4500] font-bold">
                          {unreadCount} new
                        </span>
                      )}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      title="Mark all as read"
                      aria-label="Mark all as read"
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <CheckCheck className="h-3 w-3 text-emerald-400" />
                      <span className="hidden sm:inline">Read all</span>
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearAll()}
                      title="Clear all notifications"
                      aria-label="Clear all notifications"
                      className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications popover"
                    className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Trigger & Filter Bar */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 bg-black/20 text-xs">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      filterTab === "all"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("unread")}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      filterTab === "unread"
                        ? "bg-white/10 text-white font-semibold"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {/* Instant Test Alert Button */}
                <button
                  type="button"
                  id="btn-test-notification"
                  disabled={testSending}
                  onClick={handleSendTest}
                  title="Dispatch a real-time notification to test alert delivery"
                  className="group flex items-center gap-1 rounded-md bg-[#FF4500]/15 border border-[#FF4500]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF4500] hover:bg-[#FF4500]/25 transition-all disabled:opacity-50"
                >
                  <Zap className={`h-2.5 w-2.5 ${testSending ? "animate-spin" : "group-hover:scale-110"}`} />
                  <span>{testSending ? "Pinging…" : "Test Alert"}</span>
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-85 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
                {notifLoading && notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#FF4500]/30 border-t-[#FF4500] mb-2" />
                    Connecting to live alert stream…
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400 mb-2">
                      <BellOff className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-gray-300">
                      {filterTab === "unread" ? "No unread alerts" : "No notifications yet"}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 max-w-60 mx-auto">
                      Real-time events from focus blocks, milestones, and achievements will stream here.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendTest}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs font-mono font-semibold text-[#FF4500] hover:bg-[#FF4500]/20 transition-all"
                    >
                      <Zap className="h-3 w-3" />
                      Send Test Alert
                    </button>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`group relative flex items-start gap-2.5 rounded-xl p-2.5 transition-all ${
                        notif.read
                          ? "bg-transparent hover:bg-white/4 text-gray-400"
                          : "bg-white/5 hover:bg-white/8 text-white border border-white/10 shadow-sm"
                      }`}
                    >
                      {/* Type Icon Pill */}
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${getTypeStyle(
                          notif.type
                        )}`}
                      >
                        {getTypeIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs font-bold truncate ${
                              notif.read ? "text-gray-300" : "text-white"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="shrink-0 text-[10px] font-mono text-gray-500">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400 line-clamp-2">
                          {notif.message}
                        </p>

                        {notif.link && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono font-bold text-[#FF4500] group-hover:underline">
                            <span>View details</span>
                            <ChevronRight className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            title="Mark as read"
                            aria-label="Mark notification as read"
                            className="p-1 rounded-md text-gray-400 hover:text-emerald-400 hover:bg-white/10"
                          >
                            <CheckCheck className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          title="Dismiss"
                          aria-label="Dismiss notification"
                          className="p-1 rounded-md text-gray-500 hover:text-rose-400 hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Unread dot */}
                      {!notif.read && (
                        <span className="absolute top-2.5 right-2 h-1.5 w-1.5 rounded-full bg-[#FF4500] group-hover:hidden" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer */}
              <div className="border-t border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between text-[11px]">
                {browserPermission === "granted" ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Desktop alerts active
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => requestBrowserPermission()}
                    className="flex items-center gap-1 text-[10px] font-mono text-amber-300 hover:text-amber-200 hover:underline"
                  >
                    <span>Enable desktop alerts</span>
                  </button>
                )}

                <Link
                  href="/dashboard/settings"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-[10px] font-mono"
                >
                  <Settings className="h-3 w-3" />
                  <span>Alert Preferences</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User initials & logout */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF4500]/15 border border-[#FF4500]/30 text-xs font-mono font-bold text-[#FF4500]">
              {user.initials}
            </div>
            <button
              type="button"
              id="header-logout"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:bg-rose-950/40 hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
