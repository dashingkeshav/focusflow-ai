'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  PieChart,
  Pie,
  Cell,
  Line,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp, Video, Lock, Activity, Brain, RefreshCw, AlertTriangle, Sparkles, Compass, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, DashboardStats } from '@/lib/api';
import { useEntitlements } from '@/lib/useEntitlements';
import ProLockCard, { ProBadge, FreeBadge, ProLockModal } from '@/components/ui/ProLockCard';

type DashboardStatsResponse = { success?: boolean; stats?: DashboardStats; message?: string };

const TooltipStyle = {
  backgroundColor: '#111111',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#ffffff',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
};

type ChartView = 'overview' | 'timeline' | 'distractions' | 'intelligence';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const { isPro, canAccess } = useEntitlements();
  const [activeView, setActiveView] = useState<ChartView>('overview');
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockModal, setLockModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    featureName: string;
    bulletPoints?: string[];
  }>({
    isOpen: false,
    title: '',
    description: '',
    featureName: '',
  });

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardStats() as DashboardStatsResponse;
      if (res.success) {
        setStats(res.stats ?? null);
      } else {
        setError('Failed to load analytics.');
      }
    } catch {
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-96 bg-white/5 rounded-2xl border border-white/5" />
        <div className="h-72 bg-white/5 rounded-3xl border border-white/5" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-white/5 rounded-3xl border border-white/5" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-white/80 text-sm font-medium">{error}</p>
        <button onClick={fetchStats} className="px-4 py-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  const weeklyData = stats?.weeklyData || [];
  const timeline = stats?.recentTimeline || [];
  const breakdown = stats?.distractionBreakdown || [];
  const hasData = stats?.totalSessions && stats.totalSessions > 0;

  return (
    <div className="space-y-8 font-inter text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 px-3 py-1 text-xs font-mono font-medium text-[#FF4500]">
            <Sparkles className="h-3.5 w-3.5 text-[#FF4500]" />
            <span>TELEMETRY_ENGINE</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight font-serif">
            Focus Analytics & Trends
          </h1>
          <p className="text-xs text-white/50 mt-1">
            {hasData
              ? `Based on ${stats!.totalSessions} completed sessions · ${formatDuration(stats!.totalStudySeconds ?? 0)} total study time`
              : 'Complete focus sessions to populate your telemetry.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-card p-1 rounded-2xl border border-white/10 text-xs">
            <button
              onClick={() => setSelectedRange('7d')}
              className={`px-2.5 py-1 rounded-xl font-mono text-[11px] transition ${
                selectedRange === '7d' ? 'bg-white/15 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => {
                if (!canAccess('advanced_analytics')) {
                  setLockModal({
                    isOpen: true,
                    title: 'Advanced Analytics — 30 Day History',
                    description: 'Free accounts include a 7-day focus history. Upgrade to FocusFlow Pro to unlock 30-day, 90-day, and all-time date ranges to analyze long-term focus trends.',
                    featureName: 'Advanced Analytics — Pro',
                    bulletPoints: [
                      'Historical analysis beyond 7 days',
                      'Custom date range filtering with aggregated trends',
                      'Full multi-month session history',
                    ],
                  });
                  return;
                }
                setSelectedRange('30d');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-[11px] transition ${
                selectedRange === '30d' ? 'bg-white/15 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>30 Days</span>
              {!isPro && <ProBadge className="scale-75 origin-left" />}
            </button>
            <button
              onClick={() => {
                if (!canAccess('advanced_analytics')) {
                  setLockModal({
                    isOpen: true,
                    title: 'Advanced Analytics — All-Time History',
                    description: 'Free accounts include a 7-day focus history. Upgrade to FocusFlow Pro to unlock all-time date ranges and long-term trends.',
                    featureName: 'Advanced Analytics — Pro',
                    bulletPoints: [
                      'Historical analysis across all recorded sessions',
                      'Year-to-date and all-time focus trajectory',
                      'Uncapped telemetry metrics and export access',
                    ],
                  });
                  return;
                }
                setSelectedRange('all');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-[11px] transition ${
                selectedRange === 'all' ? 'bg-white/15 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>All Time</span>
              {!isPro && <ProBadge className="scale-75 origin-left" />}
            </button>
          </div>

          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-card border border-white/10 text-white/60 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View switcher */}
          <div className="flex gap-1 bg-card p-1 rounded-2xl border border-white/10">
            {([
              { key: 'overview', label: 'Weekly', icon: BarChart3 },
              { key: 'timeline', label: 'Timeline', icon: Activity },
              { key: 'distractions', label: 'Distractions', icon: Brain },
              { key: 'intelligence', label: 'Focus Intelligence', icon: Compass, pro: true },
            ] as { key: ChartView; label: string; icon: React.ComponentType<{ className?: string }>; pro?: boolean }[]).map(({ key, label, icon: Icon, pro }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeView === key
                    ? 'bg-[#FF4500] text-white shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                {pro && !isPro && <ProBadge className="scale-75 origin-left" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Avg Focus Score', value: stats!.avgFocusScore != null ? `${stats!.avgFocusScore}` : '—', unit: stats!.avgFocusScore != null ? '/100' : 'no data', color: 'text-[#FF4500]', icon: TrendingUp },
            { label: 'Best Session', value: stats!.bestFocusScore != null ? `${stats!.bestFocusScore}` : '—', unit: stats!.bestFocusScore != null ? '/100' : 'no data', color: 'text-emerald-400', icon: Activity },
            { label: 'Warnings', value: `${stats!.totalWarnings}`, unit: 'issued', color: 'text-amber-400', icon: Brain },
            { label: 'Blocked Attempts', value: `${stats!.totalBlocked}`, unit: 'total', color: 'text-rose-400', icon: Lock },
          ].map(({ label, value, unit, color, icon: Icon }) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-card p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50 font-mono uppercase tracking-wider">
                <span>{label}</span>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className={`text-2xl font-bold font-serif ${color}`}>
                {value} <span className="text-[11px] text-white/40 font-mono font-normal">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OVERVIEW VIEW ── */}
      {activeView === 'overview' && (
        <>
          <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
            <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FF4500]" />
              <span>Weekly Focus Performance</span>
            </h2>
            <div className="h-72 w-full">
              {weeklyData.some((d) => d.score > 0 || d.hours > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4500" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF4500" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} domain={[0, 15]} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="score" name="Focus Score" stroke="#FF4500" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
                    <Bar yAxisId="right" dataKey="cameraEvents" name="Camera Events" fill="#38bdf8" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Bar yAxisId="right" dataKey="tabViolations" name="Tab Violations" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-white/40 text-sm font-mono">
                  Complete focus sessions to see weekly trends.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
              <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF4500]" />
                <span>Study Hours vs Focus Score</span>
              </h2>
              <div className="h-52 w-full">
                {weeklyData.some((d) => d.hours > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="hours" name="Study Hours" fill="#FF4500" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="score" name="Avg Focus Score" fill="#fb923c" radius={[6, 6, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm font-mono">No data yet.</div>
                )}
              </div>
            </div>

            {/* Distraction breakdown pie */}
            <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
              <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#FF4500]" />
                <span>Distraction Sources</span>
              </h2>
              {breakdown.length > 0 ? (
                <>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={4}>
                          {breakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-white/70">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-white">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-white/40 text-xs font-mono">No distraction data yet.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TIMELINE VIEW ── */}
      {activeView === 'timeline' && (
        <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
          <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FF4500]" />
            <span>Session Timeline</span>
          </h2>
          <p className="text-xs text-white/50">Focus score and telemetry across recent sessions</p>
          <div className="h-72 w-full">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeline}>
                  <defs>
                    <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF4500" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF4500" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                  <YAxis yAxisId="score" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                  <YAxis yAxisId="events" orientation="right" stroke="#6b7280" fontSize={11} domain={[0, 10]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area yAxisId="score" type="monotone" dataKey="score" name="Focus Score" stroke="#FF4500" strokeWidth={2.5} fill="url(#timelineGrad)" />
                  <Line yAxisId="events" type="monotone" dataKey="camera" name="Camera Events" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 4 }} strokeDasharray="5 3" />
                  <Line yAxisId="events" type="monotone" dataKey="tabSwitch" name="Tab Switches" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-sm font-mono">
                No session data available yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DISTRACTIONS VIEW ── */}
      {activeView === 'distractions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
              <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#FF4500]" />
                <span>Distraction Breakdown</span>
              </h2>
              {breakdown.length > 0 ? (
                <>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4}
                          label={({ value }: { value: number }) => `${value}%`} labelLine={false}>
                          {breakdown.map((entry, index) => (
                            <Cell key={`dist-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {breakdown.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/80 bg-white/5 border border-white/5 p-2 rounded-xl">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div>
                          <div className="font-semibold text-white">{item.value}%</div>
                          <div className="text-[10px] text-white/40">{item.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-white/40 text-sm font-mono">No distraction data available.</div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
              <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                <Video className="w-4 h-4 text-[#FF4500]" />
                <span>Camera vs Tab Violations</span>
              </h2>
              <div className="h-48 w-full">
                {weeklyData.some((d) => d.cameraEvents > 0 || d.tabViolations > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="cameraEvents" name="Camera Events" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tabViolations" name="Tab Violations" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm font-mono">No event data yet.</div>
                )}
              </div>
              {hasData && (
                <div className="p-3 rounded-2xl bg-[#FF4500]/10 border border-[#FF4500]/20 text-xs text-white/80">
                  <span className="font-bold text-[#FF4500]">Real telemetry:</span> All metrics are calculated
                  from recorded focus sessions. No fabricated data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOCUS INTELLIGENCE VIEW (Pro Feature) ── */}
      {activeView === 'intelligence' && (
        <div className="space-y-6">
          {!canAccess('focus_intelligence') ? (
            <ProLockCard
              title="Focus Intelligence System"
              description="Discover evidence-based patterns derived from your real focus history. Observe planned versus actual duration adherence, hourly productivity heatmaps, and optimal block length recommendations."
              featureKey="focus_intelligence"
            />
          ) : (
            <>
              {/* Adherence & Recommendations Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Planned vs Actual Duration Adherence */}
                <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FF4500]" />
                      <span>Planned vs Actual Adherence</span>
                    </h2>
                    <span className="text-xs font-mono font-bold text-[#FF4500]">
                      {stats?.focusIntelligence?.plannedVsActual?.adherencePercent != null
                        ? `${stats.focusIntelligence.plannedVsActual.adherencePercent}% Adherence`
                        : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    Compares your total planned focus time from AI plans against actual verified focus duration.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Total Planned</span>
                      <span className="text-xl font-bold font-serif text-white mt-1 block">
                        {stats?.focusIntelligence?.plannedVsActual?.totalPlannedMinutes != null
                          ? `${(stats.focusIntelligence.plannedVsActual.totalPlannedMinutes / 60).toFixed(1)}h`
                          : '—'}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-center">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Total Actual</span>
                      <span className="text-xl font-bold font-serif text-[#FF4500] mt-1 block">
                        {stats?.focusIntelligence?.plannedVsActual?.totalActualMinutes != null
                          ? `${(stats.focusIntelligence.plannedVsActual.totalActualMinutes / 60).toFixed(1)}h`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence-Based Recommendations */}
                <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#FF4500]" />
                      <span>Focus Intelligence Recommendations</span>
                    </h2>
                    <ProBadge />
                  </div>
                  <p className="text-xs text-white/50">
                    Derived from verified sessions and historical telemetry.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Optimal Block Duration:</span>
                        <span className="font-bold text-white">
                          {stats?.focusIntelligence?.recommendations?.optimalBlockDuration || 'Not available'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-gray-400">Peak Window:</span>
                        <span className="font-bold text-[#FF4500]">
                          {stats?.focusIntelligence?.recommendations?.optimalTimeWindow || 'Not available'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#FF4500]/20 bg-[#FF4500]/5 p-3.5 text-xs text-gray-300 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#FF4500] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        {stats?.focusIntelligence?.recommendations?.evidence || 'Requires at least 3 completed focus sessions with telemetry to compute personalized patterns.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24-Hour Productivity Distribution */}
              <div className="rounded-3xl border border-white/10 bg-card p-6 shadow-md backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white font-serif flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#FF4500]" />
                    <span>Hourly Productivity Distribution (24-Hour Window)</span>
                  </h2>
                  <span className="text-[11px] font-mono text-gray-400">
                    Productivity by time of day
                  </span>
                </div>
                <div className="h-64 w-full">
                  {stats?.focusIntelligence?.hourlyProductivity && stats.focusIntelligence.hourlyProductivity.some((h) => h.studyMinutes > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.focusIntelligence.hourlyProductivity}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
                        <XAxis dataKey="label" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={11} />
                        <Tooltip contentStyle={TooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="studyMinutes" name="Study Minutes" fill="#FF4500" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="avgScore" name="Avg Focus Score" fill="#fb923c" radius={[4, 4, 0, 0]} opacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white/40 text-sm font-mono">
                      No hourly focus records available yet. Complete sessions to build your productivity map.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pro Lock Modal */}
      <ProLockModal
        isOpen={lockModal.isOpen}
        onClose={() => setLockModal((prev) => ({ ...prev, isOpen: false }))}
        title={lockModal.title}
        description={lockModal.description}
        featureName={lockModal.featureName}
        bulletPoints={lockModal.bulletPoints}
      />
    </div>
  );
}
