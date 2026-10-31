"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Clock,
  Compass,
  Flame,
  Globe,
  MousePointerClick,
  Moon,
  RefreshCw,
  Shield,
  ShieldAlert,
  Timer,
  Zap,
} from "lucide-react";

import { type DashboardStats, getDashboardStats } from "@/lib/api";
import {
  getDistractionLog,
  getDistractionStats,
  type DistractionEvent,
  type DistractionStats,
} from "@/lib/api-extra";
import { useEntitlements } from "@/lib/useEntitlements";
import ProLockCard, { ProBadge, FreeBadge } from "@/components/ui/ProLockCard";

type DistractionFilter = "all" | "blocked" | "warning" | "distraction" | "idle" | "camera";

export default function DistractionsPage() {
  const { isPro, canAccess } = useEntitlements();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subStats, setSubStats] = useState<DistractionStats | null>(null);
  const [events, setEvents] = useState<DistractionEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const page = 1;
  const pageSize = 50;
  const [typeFilter, setTypeFilter] = useState<DistractionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  const load = useCallback(async (distractionOnly = false) => {
    setLoading(true);
    setError(null);
    try {
      if (!distractionOnly) {
        const res = await getDashboardStats();
        if (res.success && res.stats) {
          setStats(res.stats);
        }
      }

      const [logRes, statsRes] = await Promise.all([
        getDistractionLog({
          page,
          limit: pageSize,
          type: typeFilter === "all" ? undefined : typeFilter,
        }),
        getDistractionStats(),
      ]);

      if (logRes.success) {
        setEvents(logRes.events || []);
        setTotal(logRes.total || 0);
      } else {
        setError(logRes.message || "Failed to load distraction events.");
      }

      if (statsRes.success && statsRes.stats) {
        setSubStats(statsRes.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const totalTabSwitches = subStats?.tabSwitches ?? stats?.totalTabSwitches ?? 0;
  const totalWarnings = subStats?.warnings ?? stats?.totalWarnings ?? 0;
  const totalBlocked = subStats?.blockedAttempts ?? stats?.totalBlocked ?? 0;
  const totalCamera = subStats?.cameraEvents ?? stats?.totalCameraDistractions ?? 0;
  const totalSessions = stats?.totalSessions ?? 0;

  const totalViolations = totalTabSwitches + totalWarnings + totalBlocked + totalCamera;
  const distractionLoad = totalSessions > 0 ? Math.round(totalViolations / totalSessions) : totalViolations;
  const loadLabel = distractionLoad === 0 ? "Clean" : distractionLoad <= 3 ? "Low" : distractionLoad <= 8 ? "Moderate" : "High";

  const weekly = useMemo(() => {
    return (stats?.weeklyData || []).map((w) => ({
      day: w.day,
      tabViolations: w.tabViolations || 0,
    }));
  }, [stats]);

  return (
    <div className="space-y-6 font-inter text-white">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-xs">
            <ShieldAlert className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
                Distraction Log
              </h1>
              {isPro ? <ProBadge /> : <FreeBadge />}
            </div>
            <p className="text-xs text-white/50">
              {isPro
                ? "Full Distraction Intelligence: real-time chronological timeline, classifications, and shielding telemetry."
                : "Free Tier: 7-day chronological history of genuine extension distraction events."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-[#262832] bg-[#12131A] p-1 shadow-xs">
            <button
              onClick={() => setViewMode("timeline")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "timeline" ? "bg-[#FF4500] text-white shadow-xs" : "text-white/60 hover:text-white"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "table" ? "bg-[#FF4500] text-white shadow-xs" : "text-white/60 hover:text-white"
              }`}
            >
              Table
            </button>
          </div>

          {(["all", "blocked", "warning", "distraction"] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setTypeFilter(filterKey)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                typeFilter === filterKey
                  ? "bg-[#FF4500] text-white border-[#FF4500] shadow-xs"
                  : "bg-[#12131A] text-white/60 border-[#262832] hover:bg-white/5 hover:text-white"
              }`}
            >
              {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
            </button>
          ))}
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#262832] bg-[#12131A] px-3 py-1.5 text-xs font-medium text-white/80 shadow-xs transition-all hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#FF4500]" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {/* ── SUMMARY METRICS ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#262832] bg-[#12131A] p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-white/50">
            <span>Tab Switches</span>
            <MousePointerClick className="h-4 w-4 text-amber-400" aria-hidden />
          </div>
          <div className="text-3xl font-bold tracking-tight text-amber-400 font-serif">{totalTabSwitches}</div>
          <p className="text-[11px] text-white/40 font-mono">
            {totalSessions > 0 ? `Across ${totalSessions} sessions` : "No sessions yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#262832] bg-[#12131A] p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-white/50">
            <span>Warnings Issued</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden />
          </div>
          <div className="text-3xl font-bold tracking-tight text-rose-400 font-serif">{totalWarnings}</div>
          <p className="text-[11px] text-white/40 font-mono">
            {totalBlocked > 0 ? `${totalBlocked} blocked attempts total` : "No blocked attempts yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#262832] bg-[#12131A] p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-white/50">
            <span>Blocked Sites</span>
            <Shield className="h-4 w-4 text-rose-400" aria-hidden />
          </div>
          <div className="text-3xl font-bold tracking-tight text-rose-400 font-serif">{totalBlocked}</div>
          <p className="text-[11px] text-white/40 font-mono">Strict mode blocks enforced</p>
        </div>

        <div className="rounded-2xl border border-[#262832] bg-[#12131A] p-5 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-white/50">
            <span>Camera Look-aways</span>
            <Moon className="h-4 w-4 text-sky-400" aria-hidden />
          </div>
          <div className="text-3xl font-bold tracking-tight text-sky-400 font-serif">{totalCamera}</div>
          <p className="text-[11px] text-white/40 font-mono">Attention telemetry recorded</p>
        </div>
      </div>

      {/* ── DISTRACTION LOAD INDICATOR ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#262832] bg-[#12131A] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Flame className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-serif">Overall distraction load</p>
            <p className="text-xs text-white/50">
              Combined switches, warnings and camera events per session
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-white font-serif">{distractionLoad}</div>
            <div
              className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                loadLabel === "Clean" || loadLabel === "Low"
                  ? "text-emerald-400"
                  : loadLabel === "Moderate"
                    ? "text-amber-400"
                    : "text-rose-400"
              }`}
            >
              {totalSessions > 0 ? loadLabel : "No sessions yet"}
            </div>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                loadLabel === "High"
                  ? "bg-rose-500"
                  : loadLabel === "Moderate"
                    ? "bg-amber-400"
                    : "bg-[#FF4500]"
              }`}
              style={{ width: `${Math.min(100, Math.max(8, distractionLoad * 12))}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── TIMELINE / INCIDENT HISTORY ── */}
      <div className="space-y-4 rounded-2xl border border-[#262832] bg-[#12131A] p-6">
        <div className="flex items-center justify-between border-b border-[#262832] pb-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-white font-serif">
            <ShieldAlert className="h-4 w-4 text-rose-400" aria-hidden />
            Distraction Event Timeline
          </h2>
          <span className="text-xs font-mono text-white/50">
            {events && events.length > 0 ? `${total || events.length} recorded events` : "Real-time stream"}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            {error}
          </div>
        )}

        {loading && (!events || events.length === 0) ? (
          <div className="py-16 text-center text-xs text-white/50">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#FF4500]" />
            Loading distraction telemetry from Supabase...
          </div>
        ) : !events || events.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#262832] bg-white/5 text-white/30">
              <Ban className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-base font-bold text-white font-serif">No distractions recorded yet</p>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/50">
              When you browse with the FocusFlow extension active, events like unauthorized tab switches, off-task warnings, and blocked domains appear here in real time.
            </p>
            <Link
              href="/dashboard/sessions"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all"
            >
              Start a Focus Session
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {events.map((evt) => {
              const dateObj = new Date(evt.occurredAt || evt.timestamp);
              const when = dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const dateStr = dateObj.toLocaleDateString([], {
                month: "short",
                day: "numeric",
              });
              const isBlocked = evt.type === "site_blocked" || evt.action === "blocked";
              const isWarning = evt.type === "site_warning" || evt.action === "warning";
              const domain = evt.domain || evt.fromDomain || "General browsing";
              const category = evt.classification || (isBlocked ? "Distraction" : isWarning ? "Suspicious" : "Switch");
              const linkedSession = evt.session ? evt.session.title : "Active Session";

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline node */}
                  <span
                    className={`absolute -left-6.75 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card shadow-xs transition-transform group-hover:scale-125 ${
                      isBlocked ? "bg-rose-500" : isWarning ? "bg-amber-400" : "bg-sky-400"
                    }`}
                  />
                  <div className="rounded-xl border border-[#262832] bg-[#0a0a0a] p-4 shadow-xs transition-all hover:border-white/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isBlocked
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                              : isWarning
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                          }`}
                        >
                          {evt.action || (isBlocked ? "Blocked" : isWarning ? "Warning" : "Logged")}
                        </span>
                        <span className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-white/40" />
                          {domain}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-white/40">
                        {dateStr} · {when}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <p className="text-white/70">
                        <span className="font-medium text-white/40">Reason:</span>{" "}
                        {evt.reason || "Distraction policy violation"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-white/50 font-mono">
                        <span>
                          <strong className="text-white/70">Category:</strong> {category}
                        </span>
                        <span>·</span>
                        <span>
                          <strong className="text-white/70">Session:</strong> {linkedSession}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="bg-white/5 text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 border-b border-[#262832]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Domain</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map((evt) => {
                  const when = new Date(evt.occurredAt || evt.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const isBlocked = evt.type === "site_blocked" || evt.action === "blocked";
                  const isWarning = evt.type === "site_warning" || evt.action === "warning";

                  return (
                    <tr key={evt.id} className="transition-colors hover:bg-white/5">
                      <td className="p-3 font-mono text-white/50">{when}</td>
                      <td className="p-3 font-mono font-medium text-white">
                        {evt.domain || evt.fromDomain || "General browsing"}
                      </td>
                      <td className="p-3 font-medium text-white/80">
                        {evt.classification || (isBlocked ? "Distraction" : "Switch")}
                      </td>
                      <td className="p-3 max-w-xs truncate text-white/50">
                        {evt.reason || "Policy violation"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${
                            isBlocked
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                              : isWarning
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                          }`}
                        >
                          {evt.action || "Logged"}
                        </span>
                      </td>
                      <td className="p-3 text-white/50">
                        {evt.session ? evt.session.title : "Active"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── WEEKLY VIOLATION TREND ── */}
      {weekly.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[#262832] bg-[#12131A] p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-white font-serif">
            <Timer className="h-4 w-4 text-[#FF4500]" aria-hidden />
            Weekly Violation Distribution
          </h2>
          <div className="flex items-end justify-between gap-2 pt-2">
            {weekly.map((d) => {
              const max = Math.max(...weekly.map((w) => w.tabViolations || 0), 1);
              const height = Math.round(((d.tabViolations || 0) / max) * 100);
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-white/70 font-mono">
                    {d.tabViolations || 0}
                  </span>
                  <div className="flex h-24 w-full items-end rounded-lg bg-white/5">
                    <div
                      className="w-full rounded-lg bg-linear-to-t from-[#FF4500]/60 to-[#FF4500] transition-all"
                      style={{ height: `${Math.max(4, height)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-white/50">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pro Lock Card for Free Users */}
      {!isPro && (
        <ProLockCard
          title="Full Distraction Intelligence"
          description="Unlock advanced domain categorization, distraction impact scoring, automatic shielding rules, and unlimited event history with FocusFlow Pro."
          featureKey="distraction_intelligence"
          compact
        />
      )}
    </div>
  );
}
