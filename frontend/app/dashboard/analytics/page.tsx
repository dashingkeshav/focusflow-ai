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
import { BarChart3, PieChart as PieIcon, TrendingUp, Video, Lock, Activity, Brain, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, DashboardStats } from '@/lib/api';

const TooltipStyle = {
  backgroundColor: '#0f111a',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: '12px',
  fontSize: '11px',
};

type ChartView = 'overview' | 'timeline' | 'distractions';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [activeView, setActiveView] = useState<ChartView>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardStats(token);
      if (res.success) {
        setStats(res.stats);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-96 bg-white/5 rounded-xl" />
        <div className="h-72 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-white">{error}</p>
        <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const weeklyData = stats?.weeklyData || [];
  const timeline = stats?.recentTimeline || [];
  const breakdown = stats?.distractionBreakdown || [];
  const hasData = stats?.totalSessions && stats.totalSessions > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Focus Analytics & Trends</h1>
          <p className="text-xs text-gray-400 mt-1">
            {hasData
              ? `Based on ${stats!.totalSessions} completed sessions · ${formatDuration(stats!.totalStudySeconds)} total study time`
              : 'Complete focus sessions to populate your analytics.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStats} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {([
              { key: 'overview', label: 'Weekly', icon: BarChart3 },
              { key: 'timeline', label: 'Timeline', icon: Activity },
              { key: 'distractions', label: 'Distractions', icon: Brain },
            ] as { key: ChartView; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === key ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats summary cards */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Avg Focus Score', value: `${stats!.avgFocusScore}`, unit: '/100', color: 'text-violet-400', icon: TrendingUp },
            { label: 'Best Session', value: `${stats!.bestFocusScore}`, unit: '/100', color: 'text-emerald-400', icon: Activity },
            { label: 'Camera Events', value: `${stats!.totalCameraDistractions}`, unit: 'total', color: 'text-cyan-400', icon: Video },
            { label: 'Blocked Attempts', value: `${stats!.totalBlocked}`, unit: 'total', color: 'text-rose-400', icon: Lock },
          ].map(({ label, value, unit, color, icon: Icon }) => (
            <div key={label} className="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{label}</span><Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className={`text-2xl font-extrabold font-mono ${color}`}>
                {value} <span className="text-[11px] text-gray-400 font-normal">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {activeView === 'overview' && (
        <>
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" /> Weekly Performance
            </h2>
            <div className="h-72 w-full">
              {weeklyData.some((d) => d.score > 0 || d.hours > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} domain={[0, 15]} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="score" name="Focus Score" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
                    <Bar yAxisId="right" dataKey="cameraEvents" name="Camera Events" fill="#06b6d4" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Bar yAxisId="right" dataKey="tabViolations" name="Tab Violations" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Complete focus sessions to see weekly trends.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-400" /> Study Hours vs Focus Score
              </h2>
              <div className="h-52 w-full">
                {weeklyData.some((d) => d.hours > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="hours" name="Study Hours" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="score" name="Avg Focus Score" fill="#06b6d4" radius={[6, 6, 0, 0]} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data yet.</div>
                )}
              </div>
            </div>

            {/* Distraction breakdown pie */}
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" /> Distraction Sources
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
                      <div key={i} className="flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-mono font-bold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500 text-xs">No distraction data yet.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TIMELINE ── */}
      {activeView === 'timeline' && (
        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Session Timeline
          </h2>
          <p className="text-xs text-gray-400">Focus score and events across recent sessions</p>
          <div className="h-72 w-full">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeline}>
                  <defs>
                    <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                  <YAxis yAxisId="score" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                  <YAxis yAxisId="events" orientation="right" stroke="#6b7280" fontSize={11} domain={[0, 10]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area yAxisId="score" type="monotone" dataKey="score" name="Focus Score" stroke="#7c3aed" strokeWidth={2.5} fill="url(#timelineGrad)" />
                  <Line yAxisId="events" type="monotone" dataKey="camera" name="Camera Events" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 4 }} strokeDasharray="5 3" />
                  <Line yAxisId="events" type="monotone" dataKey="tabSwitch" name="Tab Switches" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                No session data available yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DISTRACTIONS ── */}
      {activeView === 'distractions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" /> Distraction Breakdown
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
                      <div key={i} className="flex items-center gap-2 text-gray-300 bg-white/5 p-2 rounded-lg">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div>
                          <div className="font-semibold text-white">{item.value}%</div>
                          <div className="text-[10px] text-gray-400">{item.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">No distraction data available.</div>
              )}
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400" /> Camera vs Tab Violations
              </h2>
              <div className="h-48 w-full">
                {weeklyData.some((d) => d.cameraEvents > 0 || d.tabViolations > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={11} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="cameraEvents" name="Camera Events" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tabViolations" name="Tab Violations" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">No event data yet.</div>
                )}
              </div>
              {hasData && (
                <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-500/30 text-xs text-violet-200">
                  <span className="font-bold text-violet-300">Data note:</span> All values are calculated
                  from your real session history — no demo values.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
