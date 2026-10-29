"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getDashboardStats,
  getLiveFocusMetrics,
  fetchGoals,
  fetchTasksApi,
  fetchNextActionApi,
  fetchWeeklyReviewApi,
  type DashboardStats,
  type GoalItem,
  type TaskItem,
  type NextActionResponse,
  type WeeklyReviewData,
} from "@/lib/api";
import { getRealInsights, type Insight } from "@/lib/api-extra";
import { useEntitlements } from "@/lib/useEntitlements";
import { ProBadge, FreeBadge } from "@/components/ui/ProLockCard";
import FocusScoreGauge from "@/components/FocusScoreGauge";
import CountUp from "@/components/ui/CountUp";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  HelpCircle,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
  Users,
  Radio,
  FolderGit2,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { token, user } = useAuth();
  const { isPro, getLimitInfo } = useEntitlements();
  const planLimit = getLimitInfo("aiPlanGenerations");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [nextActionData, setNextActionData] = useState<NextActionResponse | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskCounts, setTaskCounts] = useState<{ todo: number; overdue: number } | null>(null);
  const [currentGoal, setCurrentGoal] = useState<GoalItem | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewData | null>(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = (await getDashboardStats()) as {
        success?: boolean;
        stats?: DashboardStats;
        message?: string;
      };

      if (!response.success) {
        setError(response.message || "Failed to load dashboard data.");
        return;
      }

      setStats(response.stats || null);

      // Real live score for the active session
      try {
        const live = await getLiveFocusMetrics();
        const avg = live.metrics?.focusScore;
        setLiveScore(typeof avg === "number" && Number.isFinite(avg) ? avg : null);
      } catch {
        setLiveScore(null);
      }

      // Smart Next Action ("What should I focus on now?")
      try {
        const naRes = await fetchNextActionApi();
        if (naRes.success && naRes.hasTask && naRes.task) {
          setNextActionData(naRes);
          setSelectedTask(naRes.task);
        } else {
          // Fallback to fetchTasksApi to populate task counts and check for open tasks
          const tRes = await fetchTasksApi({ sortBy: "due_date", order: "asc" });
          if (tRes.success) {
            const open = (tRes.tasks || []).filter((t) => t.status !== "completed");
            setSelectedTask(open[0] || null);
            setTaskCounts({
              todo: tRes.counts?.todo ?? open.length,
              overdue: tRes.counts?.overdue ?? 0,
            });
          }
        }
      } catch {
        // Honest empty state
      }

      // Personal Weekly Focus Review
      try {
        const wrRes = await fetchWeeklyReviewApi();
        if (wrRes.success && wrRes.hasData && wrRes.review) {
          setWeeklyReview(wrRes.review);
        } else {
          setWeeklyReview(null);
        }
      } catch {
        setWeeklyReview(null);
      }

      // Current active goal
      try {
        const gRes = await fetchGoals();
        if (gRes.success && Array.isArray(gRes.goals)) {
          const open = gRes.goals
            .filter((g) => g.computedStatus !== "Completed")
            .sort((a, b) => (a.target || "").localeCompare(b.target || ""));
          setCurrentGoal(open[0] || null);
        }
      } catch {
        // Honest empty state
      }

      // Real AI insight
      try {
        const iRes = await getRealInsights();
        if (iRes.success && iRes.insights?.insights?.length) {
          setInsight(iRes.insights.insights[0]);
        }
      } catch {
        // Honest empty state
      }
    } catch (err) {
      console.warn("Dashboard fetch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the server. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(fetchAll, 0);
    return () => window.clearTimeout(id);
  }, [fetchAll]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-48 w-full animate-pulse rounded-3xl bg-white/5" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-white/5" />
          <div className="h-64 animate-pulse rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-card p-8 text-center shadow-lg text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-serif font-bold text-white">Unable to load dashboard</h2>
          <p className="mt-2 mb-6 text-sm text-gray-400">{error}</p>
          <button onClick={fetchAll} className="btn btn-primary mx-auto">
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const avgScore = stats?.avgFocusScore ?? null;
  const headlineScore = liveScore ?? avgScore;
  const todaySeconds = stats?.todayStudySeconds || 0;
  const todayMinutes = Math.round(todaySeconds / 60);
  const totalHours = Math.round((stats?.totalStudySeconds || 0) / 3600);
  const streak = stats?.streakDays || 0;
  const todayTabSwitches = stats?.totalTabSwitches ?? 0;
  const todayWarnings = stats?.totalWarnings ?? 0;

  const weekly = (stats?.weeklyData || []).map((w) => ({
    day: w.day,
    hours: w.hours || 0,
    score: w.score ?? null,
  }));

  return (
    <div className="space-y-8 font-inter text-white">
      {/* Collaboration Ecosystem Hub */}
      <section className="rounded-3xl border border-white/10 bg-[#0a0a0c]/85 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500]">
              <Users className="w-4 h-4" />
              <span>COLLABORATION ECOSYSTEM</span>
              <span className="text-[10px] bg-[#FF4500]/15 text-[#FF4500] px-2 py-0.5 rounded-full border border-[#FF4500]/30 font-medium">
                Live
              </span>
            </div>
            <h2 className="text-lg font-serif font-bold text-white">
              Work together, maintain accountability, ship projects, and resolve blockers.
            </h2>
          </div>
          <div className="text-xs font-mono text-gray-400">
            {isPro ? (
              <span className="text-emerald-400 font-semibold">Pro Collaboration Limits Active</span>
            ) : (
              <span>Free Tier Limits · Guests Welcome</span>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Focus Rooms */}
          <Link
            href="/dashboard/focus-rooms"
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4.5 hover:border-[#FF4500]/50 hover:bg-white/8 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/25 flex items-center justify-center text-[#FF4500] group-hover:scale-110 transition-transform">
                  <Radio className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                  Coworking
                </span>
              </div>
              <h3 className="text-sm font-serif font-bold text-white group-hover:text-[#FF4500] transition-colors">
                Focus Rooms
              </h3>
              <p className="mt-1 text-xs text-gray-400 leading-snug">
                Host up to {isPro ? 12 : 4} peers with synchronized timers and voluntary session outcomes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-[#FF4500]">
              <span>Join or Host</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Focus Circles */}
          <Link
            href="/dashboard/focus-circles"
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4.5 hover:border-[#FF4500]/50 hover:bg-white/8 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/25 flex items-center justify-center text-[#FF4500] group-hover:scale-110 transition-transform">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/5">
                  Habits
                </span>
              </div>
              <h3 className="text-sm font-serif font-bold text-white group-hover:text-[#FF4500] transition-colors">
                Focus Circles
              </h3>
              <p className="mt-1 text-xs text-gray-400 leading-snug">
                Own {isPro ? "up to 10 Circles (12 members)" : "1 Circle (up to 4 members)"} for weekly accountability.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono font-bold text-[#FF4500]">
              <span>View Circles</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

                  </div>
      </section>

      {/* ==============================================================
          HERO FOCAL SECTION: "WHAT SHOULD I FOCUS ON NOW?"
          ============================================================== */}
      <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-card p-7 shadow-2xl backdrop-blur-2xl sm:p-9">
        {/* Soft Background Radial Diffusions */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#FF4500]/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#FF4500]/5 blur-[90px]" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF4500]/30 bg-[#FF4500]/10 px-3 py-1 text-xs font-mono font-bold text-[#FF4500]">
                <Sparkles className="h-3.5 w-3.5 text-[#FF4500]" />
                <span>{greeting}, {user?.name?.split(" ")[0] || "Explorer"}</span>
              </div>
              {isPro ? <ProBadge /> : <FreeBadge />}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-gray-300">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF4500]" />
                AI Plans Today: <strong className="text-white">{planLimit?.used ?? 0}</strong> / {isPro ? 200 : 5}
              </span>
            </div>

            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              What should I focus on now?
            </h2>

            {selectedTask ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#FF4500]/15 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF4500] border border-[#FF4500]/30">
                        Priority · {selectedTask.priority || "High"}
                      </span>
                      {selectedTask.due_date && (
                        <span className="text-xs font-mono text-gray-400">
                          Due {new Date(selectedTask.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className="text-xs font-mono text-gray-400">
                        Est: {selectedTask.estimated_duration || 25}m
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-white">{selectedTask.title}</h3>
                    {selectedTask.goal_name && (
                      <p className="text-xs text-gray-400 font-medium">Goal: {selectedTask.goal_name}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 mt-2 sm:mt-0">
                    <Link
                      href={`/dashboard/sessions?taskId=${selectedTask.id}&title=${encodeURIComponent(selectedTask.title)}&duration=${(selectedTask.estimated_duration || 25) * 60}`}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Start Focus</span>
                    </Link>
                    {nextActionData?.alternativeTasks && nextActionData.alternativeTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowTaskPicker(!showTaskPicker)}
                        className="btn btn-ghost btn-sm text-xs text-gray-300 hover:text-white border border-white/10"
                      >
                        <span>Choose another</span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${showTaskPicker ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Explanatory rationale for recommendation */}
                <div className="mt-3 rounded-xl border border-white/5 bg-white/5 px-3.5 py-2 text-xs leading-relaxed text-gray-300">
                  <span className="font-semibold text-[#FF4500]">Why FocusFlow recommends this: </span>
                  {nextActionData?.reason || "Highest priority actionable task aligned with your active timeline."}
                </div>

                {/* Alternative tasks selector */}
                {showTaskPicker && nextActionData?.alternativeTasks && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Alternative Tasks in Queue</span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {nextActionData.alternativeTasks.map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => {
                            setSelectedTask(alt);
                            setShowTaskPicker(false);
                          }}
                          className="w-full flex items-center justify-between text-left text-xs p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                        >
                          <span className="truncate pr-2 text-white font-medium">{alt.title}</span>
                          <span className="text-[10px] font-mono text-[#FF4500] shrink-0">{alt.priority || "Medium"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-gray-400">
                  No active tasks right now. Create a milestone in Goals or ask the AI Planner to schedule your next sprint.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Link href="/dashboard/planner" className="btn btn-primary btn-sm">
                    Open AI Planner
                  </Link>
                  <Link href="/dashboard/goals?view=tasks" className="btn btn-ghost btn-sm">
                    Add New Task
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Capsule Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Today Focused</span>
              <p className="mt-1 font-serif text-2xl font-bold text-white">
                <CountUp value={todayMinutes} suffix="m" />
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Day Streak</span>
              <p className="mt-1 flex items-center gap-1 font-serif text-2xl font-bold text-amber-400">
                <Flame className="h-5 w-5 fill-amber-400" />
                <CountUp value={streak} suffix="d" />
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Focus Score</span>
              <p className="mt-1 font-serif text-2xl font-bold text-[#FF4500]">
                {headlineScore != null ? `${headlineScore}` : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Total Hours</span>
              <p className="mt-1 font-serif text-2xl font-bold text-white">
                <CountUp value={totalHours} suffix="h" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          MAIN WORKSPACE GRID: VISUAL HIERARCHY DUAL COLUMNS
          ============================================================== */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: ACTIVE GOAL & TODAY'S PLAN & RECENT SESSIONS */}
        <div className="space-y-6 lg:col-span-7">
          {/* Current Goal Anchor */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF4500]/10 text-[#FF4500]">
                  <Target className="h-4 w-4" />
                </span>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Active Goal</span>
                  <h3 className="text-base font-serif font-bold text-white">
                    {currentGoal ? currentGoal.name : "No Active Goal"}
                  </h3>
                </div>
              </div>
              <Link
                href="/dashboard/goals"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF4500] hover:underline"
              >
                <span>View Roadmap</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {currentGoal ? (
              <div className="mt-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  {currentGoal.description || "Milestones linked to current curriculum & task priorities."}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>Target Deadline</span>
                  <span className="font-mono font-semibold text-white">
                    {currentGoal.target
                      ? new Date(currentGoal.target).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                      : "Open Timeline"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                <p>You haven&apos;t set a goal yet. Setting a goal gives your focus sessions purpose.</p>
                <Link href="/dashboard/goals" className="btn btn-primary btn-sm mt-3">
                  Create First Goal
                </Link>
              </div>
            )}
          </div>

          {/* Recent Sessions Timeline */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FF4500]" />
                <span>Recent Focus Sessions</span>
              </h3>
              <Link
                href="/dashboard/sessions"
                className="text-xs font-semibold text-[#FF4500] hover:underline"
              >
                All Sessions →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                stats.recentSessions.slice(0, 4).map((session) => (
                  <div
                    key={session.id || session._id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3.5 transition-colors hover:bg-white/10"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {session.title || "Focus Session"}
                      </p>
                      <p className="text-[11px] font-mono text-gray-400">
                        {session.startTime
                          ? new Date(session.startTime).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Completed"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-[#FF4500]/15 px-2.5 py-0.5 text-xs font-mono font-bold text-[#FF4500]">
                        Score {session.avgFocusScore != null ? session.avgFocusScore : "—"}
                      </span>
                      <p className="mt-0.5 text-[10px] font-mono text-gray-400">
                        {session.durationSeconds ? `${Math.round(session.durationSeconds / 60)} min` : "—"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  <p>No focus sessions recorded yet.</p>
                  <Link href="/dashboard/sessions" className="btn btn-primary btn-sm mt-3">
                    Start a Focus Session
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FOCUS INTELLIGENCE & AI INSIGHT & TREND CHART */}
        <div className="space-y-6 lg:col-span-5">
          {/* Focus Score Gauge Card */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 text-center shadow-md backdrop-blur-xl">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Personal Focus Intelligence
            </span>
            <div className="mt-4 flex flex-col items-center justify-center">
              <FocusScoreGauge score={headlineScore} size={150} />
              <p className="mt-3 max-w-xs text-xs text-gray-400">
                {headlineScore == null
                  ? "No scored sessions yet — start a session to generate real telemetry."
                  : liveScore != null
                  ? "Live score calculating from your active study session."
                  : "All-time average score across your completed sessions."}
              </p>
            </div>
          </div>

          {/* AI Insight Card (Observation → Evidence → Impact → Recommendation) */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF4500]" />
                <h3 className="font-serif text-sm font-bold text-white">AI Focus Insight</h3>
              </div>
              <Link href="/dashboard/insights" className="text-xs font-semibold text-[#FF4500] hover:underline">
                View All →
              </Link>
            </div>

            {insight ? (
              <div className="mt-4 rounded-2xl border border-[#FF4500]/20 bg-[#FF4500]/10 p-4 text-xs leading-relaxed">
                <p className="font-bold text-[#FF4500]">{insight.title}</p>
                <p className="mt-1.5 text-gray-300">{insight.body}</p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                <p>No telemetry recorded yet to derive insights.</p>
                <p className="mt-1 text-[11px] text-gray-500">Insights appear after your first completed study sessions.</p>
              </div>
            )}
          </div>

          {/* Personal Weekly Focus Review Card */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-[#FF4500]" />
                <h3 className="font-serif text-sm font-bold text-white">Weekly Focus Review</h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">Past 7 Days</span>
            </div>

            {weeklyReview ? (
              <div className="mt-4 space-y-4">
                {/* 4 Core Quantitative Pillars */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Focus Time</span>
                    <p className="mt-1 font-serif text-lg font-bold text-white">
                      {weeklyReview.totalFocusMinutes}m
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {weeklyReview.totalSessions} session{weeklyReview.totalSessions === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Tasks Completed</span>
                    <p className="mt-1 font-serif text-lg font-bold text-emerald-400">
                      {weeklyReview.completedTasks}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {weeklyReview.taskCompletionRate}% rate
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Goals Status</span>
                    <p className="mt-1 font-serif text-lg font-bold text-amber-400">
                      {weeklyReview.goals.progressing} Active
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {weeklyReview.goals.atRisk > 0 ? `${weeklyReview.goals.atRisk} at risk` : "On track"}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Task Duration</span>
                    <p className="mt-1 font-serif text-lg font-bold text-white">
                      {weeklyReview.durationVariancePercent != null
                        ? `${weeklyReview.durationVariancePercent > 0 ? "+" : ""}${weeklyReview.durationVariancePercent}%`
                        : "0%"}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      actual vs planned
                    </span>
                  </div>
                </div>

                {/* Prior Period Trend Comparison */}
                {weeklyReview.priorPeriod.hasPriorPeriod && weeklyReview.priorPeriod.focusTimeChangePercent != null && (
                  <div className="flex items-center justify-between text-xs font-mono rounded-xl bg-white/5 px-3 py-2 border border-white/5">
                    <span className="text-gray-400">vs Previous 7 Days</span>
                    <span className={weeklyReview.priorPeriod.focusTimeChangePercent >= 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {weeklyReview.priorPeriod.focusTimeChangePercent >= 0 ? "+" : ""}{weeklyReview.priorPeriod.focusTimeChangePercent}% focus time
                    </span>
                  </div>
                )}

                {/* Evidence-grounded Recommendations */}
                {weeklyReview.recommendations && weeklyReview.recommendations.length > 0 && (
                  <div className="space-y-2">
                    {weeklyReview.recommendations.slice(0, 2).map((rec, idx) => (
                      <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                        <p className="text-gray-300 font-medium leading-relaxed">
                          <strong className="text-amber-400 font-semibold">Evidence: </strong>{rec.observation}
                        </p>
                        <p className="mt-1.5 text-white/90 leading-relaxed">
                          <strong className="text-[#FF4500] font-semibold">Recommendation: </strong>{rec.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">
                <p>No focus sessions or completed tasks recorded in the past 7 days.</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  Complete focus sessions and tasks to generate your personal weekly review.
                </p>
              </div>
            )}
          </div>

          {/* Weekly Focus Trend Chart */}
          {weekly.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl">
              <h3 className="font-serif text-sm font-bold text-white mb-4">
                Weekly Focus Volume
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#FF4500"
                    fill="#FF4500"
                    fillOpacity={0.2}
                    name="Hours"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#ff8c66"
                    strokeWidth={2}
                    dot={false}
                    name="Focus Score"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
