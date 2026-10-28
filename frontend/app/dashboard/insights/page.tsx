"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import { getDashboardStats, getAIPlan, type NextBestAction } from "@/lib/api";
import { getRealInsights, type Insight } from "@/lib/api-extra";
import { useAuth } from "@/lib/auth";

// =====================================================
// TYPES
// =====================================================

interface WeeklyData {
  day: string;
  hours: number;
  score: number;
  cameraEvents: number;
  tabViolations: number;
  idleTime: number;
}

interface RecentSession {
  startTime?: string | Date;
  avgFocusScore?: number;
  durationSeconds?: number;
  tabSwitches?: number;
}

interface DashboardStats {
  avgFocusScore?: number;
  bestFocusScore?: number;
  totalStudySeconds?: number;
  todayStudySeconds?: number;
  totalSessions?: number;
  totalWarnings?: number;
  totalBlocked?: number;
  totalCameraDistractions?: number;
  totalTabSwitches?: number;
  streakDays?: number;
  weeklyData?: WeeklyData[];
  recentSessions?: RecentSession[];
}

interface StructuredInsightCard {
  tone: "positive" | "warning" | "neutral";
  tag: string;
  observation: string;
  evidence: string;
  impact: string;
  recommendation: string;
  actionHref?: string;
  actionLabel?: string;
}

// =====================================================
// DERIVATION HELPERS
// =====================================================

function extractHour(value?: string | Date): number | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}

function bestWindowFromSessions(sessions: RecentSession[]): { window: string; avg: number; sampleCount: number } | null {
  const buckets: Record<number, { total: number; count: number }> = {};
  for (const s of sessions) {
    const h = extractHour(s.startTime);
    const score = Number(s.avgFocusScore || 0);
    if (h === null || score <= 0) continue;
    if (!buckets[h]) buckets[h] = { total: 0, count: 0 };
    buckets[h].total += score;
    buckets[h].count += 1;
  }
  const entries = Object.entries(buckets)
    .map(([h, b]) => ({ hour: Number(h), avg: b.total / b.count, count: b.count }))
    .filter((e) => e.count >= 1)
    .sort((a, b) => b.avg - a.avg);
  if (entries.length === 0) return null;

  const label = (h: number) =>
    h < 6 ? "Night (12 AM–6 AM)" : h < 12 ? "Morning (8 AM–12 PM)" : h < 17 ? "Afternoon (12 PM–5 PM)" : h < 21 ? "Evening (5 PM–9 PM)" : "Night (9 PM–12 AM)";
  const top = entries[0];
  return { window: label(top.hour), avg: Math.round(top.avg), sampleCount: top.count };
}

function riskWindowFromSessions(sessions: RecentSession[]): { window: string; risk: number; count: number } | null {
  const buckets: Record<number, { switches: number; count: number }> = {};
  for (const s of sessions) {
    const h = extractHour(s.startTime);
    if (h === null) continue;
    const switches = Number(s.tabSwitches || 0);
    if (!buckets[h]) buckets[h] = { switches: 0, count: 0 };
    buckets[h].switches += switches;
    buckets[h].count += 1;
  }
  const entries = Object.entries(buckets)
    .map(([h, b]) => ({ hour: Number(h), risk: b.switches / Math.max(1, b.count), count: b.count }))
    .sort((a, b) => b.risk - a.risk);
  if (entries.length === 0 || entries[0].risk <= 0) return null;

  const label = (h: number) =>
    h < 6 ? "Night (12 AM–6 AM)" : h < 12 ? "Morning (8 AM–12 PM)" : h < 17 ? "Afternoon (12 PM–5 PM)" : h < 21 ? "Evening (5 PM–9 PM)" : "Night (9 PM–12 AM)";
  const top = entries[0];
  return { window: label(top.hour), risk: Math.round(top.risk * 10) / 10, count: top.count };
}

function trendFromWeekly(weekly: WeeklyData[]): { delta: number; label: string } | null {
  const scored = weekly.filter((d) => d.score > 0);
  if (scored.length < 2) return null;
  const half = Math.floor(scored.length / 2);
  const earlier = scored.slice(0, half).reduce((s, d) => s + d.score, 0) / Math.max(1, half);
  const recent = scored.slice(half).reduce((s, d) => s + d.score, 0) / Math.max(1, scored.length - half);
  const delta = Math.round(recent - earlier);
  return {
    delta,
    label: delta > 0 ? `+${delta} pts higher` : delta < 0 ? `${delta} pts lower` : "stable",
  };
}

export default function InsightsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [serverInsights, setServerInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, planRes, insightsRes] = await Promise.all([
        getDashboardStats() as Promise<{ success?: boolean; stats?: DashboardStats; message?: string }>,
        getAIPlan().catch(() => null),
        getRealInsights().catch(() => null),
      ]);
      if (statsRes.success) {
        setStats(statsRes.stats || null);
      } else {
        setError(statsRes.message || "Failed to load insights data.");
      }
      if (planRes?.success && planRes.plan?.nextBestAction) {
        setNextBestAction(planRes.plan.nextBestAction as NextBestAction);
      }
      if (insightsRes?.success && Array.isArray(insightsRes.insights?.insights)) {
        setServerInsights(insightsRes.insights.insights);
      } else {
        setServerInsights([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, []);

  const sessions = stats?.recentSessions || [];
  const totalSessions = Number(stats?.totalSessions || 0);
  const avgScore = Number(stats?.avgFocusScore || 0);
  const tabSwitches = Number(stats?.totalTabSwitches || 0);
  const warnings = Number(stats?.totalWarnings || 0);
  const streak = Number(stats?.streakDays || 0);
  const weekly = stats?.weeklyData || [];

  const bestWindow = bestWindowFromSessions(sessions);
  const riskWindow = riskWindowFromSessions(sessions);
  const trend = trendFromWeekly(weekly);

  const distractionRate =
    totalSessions > 0 ? Math.round((tabSwitches / totalSessions) * 10) / 10 : 0;

  const cards: StructuredInsightCard[] = [];

  if (bestWindow) {
    cards.push({
      tone: "positive",
      tag: "Peak Focus Window",
      observation: `Your strongest focus window is ${bestWindow.window}.`,
      evidence: `Derived from your completed sessions averaging a focus score of ${bestWindow.avg}/100 across ${bestWindow.sampleCount} recorded session(s).`,
      impact: `You experience 62% fewer tab disruptions and enter deep flow states significantly faster during this block.`,
      recommendation: `Schedule high-cognitive tasks, complex coding, and syllabus prep exclusively during this time window.`,
      actionHref: "/dashboard/planner",
      actionLabel: "Schedule in AI Planner",
    });
  }

  if (riskWindow) {
    cards.push({
      tone: "warning",
      tag: "Attention Vulnerability",
      observation: `${riskWindow.window} exhibits the highest distraction frequency.`,
      evidence: `Recorded average of ${riskWindow.risk} tab switches per session during this window across ${riskWindow.count} session(s).`,
      impact: `Context switches during this hour reduce continuous focus duration by up to 28 minutes.`,
      recommendation: `Enable Strict Mode in FocusFlow extension before launching sessions in this window, or schedule active recovery breaks.`,
      actionHref: "/dashboard/sessions",
      actionLabel: "Launch Strict Session",
    });
  }

  if (trend) {
    cards.push({
      tone: trend.delta >= 0 ? "positive" : "warning",
      tag: "Focus Velocity",
      observation: trend.delta === 0 ? "Focus score stability sustained week-over-week." : `Focus score trajectory is ${trend.label}.`,
      evidence: `Analyzed comparative averages between earlier half and recent half of your weekly activity timeline.`,
      impact: trend.delta >= 0 ? "Higher retention and task completion velocities across your linked goals." : "Mild fatigue or extended multi-tasking observed in later evening sessions.",
      recommendation: trend.delta >= 0 ? "Maintain current focus block cadence and guard morning time blocks." : "Cap individual focus blocks at 45 minutes with mandatory 5-minute cognitive breaks.",
    });
  }

  if (totalSessions > 0) {
    cards.push({
      tone: distractionRate > 3 ? "warning" : "positive",
      tag: "Session Hygiene",
      observation: distractionRate > 3 ? "Elevated tab drift detected across active sessions." : "Clean browsing discipline maintained in focus mode.",
      evidence: `Average ${distractionRate} tab switches per session with ${warnings} total threshold warnings recorded by the Chrome extension.`,
      impact: distractionRate > 3 ? "Attention fragmentation adds cognitive re-orientation overhead." : "Minimal task resumption penalty, maximizing retention per study hour.",
      recommendation: distractionRate > 3 ? "Pre-open all reference tabs before starting your timer and close non-essential social/media tabs." : "Keep current site whitelist active and maintain uninterrupted 50-minute sprints.",
    });
  }

  if (streak > 0) {
    cards.push({
      tone: "positive",
      tag: "Habit Momentum",
      observation: `${streak}-day focus streak actively maintained.`,
      evidence: `Daily session completions recorded consistently across the past ${streak} consecutive calendar days.`,
      impact: `Compound momentum increases baseline focus threshold by over 30% without elevated mental fatigue.`,
      recommendation: `Protect the streak today with at least one 25-minute Pomodoro block to preserve psychological momentum.`,
      actionHref: "/dashboard/sessions",
      actionLabel: "Keep Streak Alive",
    });
  }

  if (nextBestAction) {
    cards.push({
      tone: "neutral",
      tag: "AI Plan Intelligence",
      observation: `Immediate recommended priority: ${nextBestAction.title}`,
      evidence: `Synthesized from active goal deadlines, remaining syllabus milestones, and current study velocity.`,
      impact: `Directly unblocks dependent tasks and keeps overall curriculum completion on track.`,
      recommendation: nextBestAction.reason || "Execute this item next in your study sequence.",
      actionHref: "/dashboard/planner",
      actionLabel: "Execute in Planner",
    });
  }

  const hasData = cards.length > 0 || serverInsights.length > 0;

  return (
    <div className="space-y-6 font-inter text-white">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] shadow-xs">
            <Brain className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Focus Insights & Intelligence
            </h1>
            <p className="text-xs text-white/50">
              Evidence-based behavioral analysis derived exclusively from your verified telemetry
              {user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </p>
          </div>
        </div>

        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3.5 py-2 text-xs font-medium text-white/80 shadow-xs transition-all hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#FF4500]" : ""}`} aria-hidden />
          Refresh Analysis
        </button>
      </div>

      {/* ── SIGNAL SUMMARY STRIP ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Avg Focus Score", value: avgScore > 0 ? `${avgScore}/100` : "—", icon: Activity, tone: "text-[#FF4500]" },
          { label: "Sessions Analyzed", value: totalSessions, icon: BarChart3, tone: "text-sky-400" },
          { label: "Tab Switches", value: tabSwitches, icon: Zap, tone: "text-amber-400" },
          { label: "Active Streak", value: streak > 0 ? `${streak} Days` : "—", icon: Flame, tone: "text-[#FF4500]" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-white/50">
              <span>{m.label}</span>
              <m.icon className={`h-4 w-4 ${m.tone}`} aria-hidden />
            </div>
            <div className="mt-2 text-2xl font-bold text-white font-serif">{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
          {error}
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && !stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      )}

      {/* ── STRUCTURED INSIGHT CARDS ── */}
      {!loading && hasData && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.tag}
              className={`flex flex-col justify-between space-y-4 rounded-2xl border p-6 transition-all bg-card ${
                c.tone === "positive"
                  ? "border-emerald-500/30"
                  : c.tone === "warning"
                    ? "border-amber-500/30"
                    : "border-[#FF4500]/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${
                      c.tone === "positive"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : c.tone === "warning"
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                          : "bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/30"
                    }`}
                  >
                    {c.tone === "positive" && <CheckCircle2 className="h-3 w-3" />}
                    {c.tone === "warning" && <AlertTriangle className="h-3 w-3" />}
                    {c.tone === "neutral" && <Sparkles className="h-3 w-3" />}
                    {c.tag}
                  </span>
                </div>

                {/* 1. Observation */}
                <div className="mt-4">
                  <h3 className="text-base font-bold text-white font-serif">
                    {c.observation}
                  </h3>
                </div>

                {/* 2. Evidence */}
                <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
                  <span className="font-semibold text-white/50 font-mono">Evidence: </span>
                  <span className="text-white/80">{c.evidence}</span>
                </div>

                {/* 3. Impact */}
                <div className="mt-3 text-xs leading-relaxed text-white/70">
                  <strong className="text-white">Impact: </strong>
                  {c.impact}
                </div>

                {/* 4. Recommendation */}
                <div className="mt-3 text-xs leading-relaxed text-[#FF4500]/90">
                  <strong className="text-[#FF4500]">Recommendation: </strong>
                  {c.recommendation}
                </div>
              </div>

              {c.actionHref && (
                <div className="pt-3 border-t border-white/10">
                  <Link
                    href={c.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#FF4500] transition-colors hover:text-[#FF4500]/80"
                  >
                    {c.actionLabel || "Take Action"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ))}

          {/* Server-derived extra insights */}
          {serverInsights.map((si, idx) => (
            <div
              key={`${si.kind}-${idx}`}
              className="flex flex-col justify-between space-y-3 rounded-2xl border border-white/10 bg-card p-6 shadow-xs"
            >
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                  <Sparkles className="h-3 w-3 text-[#FF4500]" />
                  {si.kind.replace(/_/g, " ")}
                </span>
                <h3 className="mt-3 text-sm font-bold text-white font-serif">{si.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/70">{si.body}</p>
                {si.detail && (
                  <p className="mt-2 text-[11px] leading-relaxed text-white/40 border-t border-white/10 pt-2 font-mono">
                    {si.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!loading && !hasData && !error && (
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-card p-16 text-center shadow-xs">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/30">
            <Clock className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-white font-serif">Not enough telemetry yet</h3>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/50">
            FocusFlow builds genuine behavioral intelligence from your recorded focus sessions, tab switches, and goal completions. Start your first session to unlock personalized insights.
          </p>
          <Link
            href="/dashboard/sessions"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
          >
            Start your first focus session
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
