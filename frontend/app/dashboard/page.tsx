'use client';

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import { useAuth } from '@/lib/auth';

import {
  getDashboardStats,
} from '@/lib/api';

import FocusScoreGauge from '@/components/FocusScoreGauge';

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Line,
} from 'recharts';

import {
  Timer,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Play,
  ChevronRight,
  ArrowUpRight,
  Video,
  Lock,
  Activity,
  RefreshCw,
} from 'lucide-react';


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

interface FocusSession {
  id?: string;
  _id?: string;
  title?: string;
  startTime?: string | Date;
  durationSeconds?: number;
  avgFocusScore?: number;
  status?: string;
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

  recentSessions?: FocusSession[];
}


// =====================================================
// TOOLTIP STYLE
// =====================================================

const TooltipStyle = {
  backgroundColor: '#0f111a',
  borderColor: 'rgba(255,255,255,0.1)',
  borderRadius: '12px',
  fontSize: '11px',
};


// =====================================================
// HELPERS
// =====================================================

function formatDuration(
  seconds: number
): string {
  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(0, seconds)
      : 0;

  const h =
    Math.floor(
      safeSeconds / 3600
    );

  const m =
    Math.floor(
      (safeSeconds % 3600) / 60
    );

  if (h > 0) {
    return `${h}h ${m}m`;
  }

  return `${m}m`;
}


function formatSessionDate(
  value?: string | Date
): string {

  if (!value) {
    return 'Unknown';
  }

  const d =
    new Date(value);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return 'Unknown';
  }

  const today =
    new Date();

  const yesterday =
    new Date(today);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const time =
    d.toLocaleTimeString(
      'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

  if (
    d.toDateString() ===
    today.toDateString()
  ) {
    return `Today, ${time}`;
  }

  if (
    d.toDateString() ===
    yesterday.toDateString()
  ) {
    return `Yesterday, ${time}`;
  }

  return (
    d.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    ) +
    `, ${time}`
  );
}


function getScoreLabel(
  score: number
): string {

  if (score >= 80) {
    return 'Optimal Focus Zone';
  }

  if (score >= 60) {
    return 'Moderate Focus';
  }

  if (score > 0) {
    return 'Needs Improvement';
  }

  return 'No sessions yet';
}


function getSessionId(
  session: FocusSession,
  index: number
): string {
  return (
    session.id ||
    session._id ||
    `session-${index}`
  );
}


// =====================================================
// DASHBOARD PAGE
// =====================================================

export default function DashboardOverviewPage() {

  const {
    user,
    token,
  } = useAuth();


  const firstName =
    user?.name
      ?.split(' ')[0] ||
    'Student';


  const hour =
    new Date().getHours();


  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening';


  const [
    stats,
    setStats,
  ] =
    useState<DashboardStats | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  // ===================================================
  // FETCH DASHBOARD DATA
  // ===================================================

  const fetchStats =
    useCallback(
      async () => {

        if (!token) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        try {

          const response =
            await getDashboardStats();


          const data =
            response as {
              success?: boolean;
              stats?: DashboardStats;
              message?: string;
            };


          if (
            !data.success
          ) {

            setError(
              data.message ||
              'Failed to load dashboard data.'
            );

            return;
          }


          setStats(
            data.stats || null
          );


        } catch (err) {

          console.error(
            'Dashboard fetch error:',
            err
          );


          setError(
            err instanceof Error
              ? err.message
              : 'Could not connect to the server. Please ensure the backend is running.'
          );

        } finally {

          setLoading(false);
        }

      },
      [token]
    );


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {

    fetchStats();

  }, [fetchStats]);


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div className="space-y-8">

        <div className="h-24 bg-white/5 rounded-2xl animate-pulse" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {[1, 2, 3, 4].map(
            (item) => (

              <div
                key={item}
                className="h-32 bg-white/5 rounded-2xl animate-pulse"
              />

            )
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 h-72 bg-white/5 rounded-2xl animate-pulse" />

          <div className="h-72 bg-white/5 rounded-2xl animate-pulse" />

        </div>

      </div>

    );
  }


  // ===================================================
  // ERROR
  // ===================================================

  if (error) {

    return (

      <div className="min-h-[60vh] flex items-center justify-center">

        <div className="max-w-md w-full text-center glass-card p-8 rounded-2xl border border-rose-500/20">

          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">

            <AlertTriangle className="w-7 h-7 text-amber-400" />

          </div>


          <h2 className="text-lg font-bold text-white mb-2">
            Unable to load dashboard
          </h2>


          <p className="text-sm text-gray-400 mb-6">
            {error}
          </p>


          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>

        </div>

      </div>

    );
  }


  // ===================================================
  // SAFE DATA
  // ===================================================

  const recentSessions:
    FocusSession[] =
    stats?.recentSessions ||
    [];


  const avgScore =
    Number(
      stats?.avgFocusScore || 0
    );


  const todaySeconds =
    Number(
      stats?.todayStudySeconds || 0
    );


  const totalBlocked =
    Number(
      stats?.totalBlocked || 0
    );


  const totalCamera =
    Number(
      stats?.totalCameraDistractions || 0
    );


  const totalWarnings =
    Number(
      stats?.totalWarnings || 0
    );


  const totalTabSwitches =
    Number(
      stats?.totalTabSwitches || 0
    );


  const totalSessions =
    Number(
      stats?.totalSessions || 0
    );


  const streakDays =
    Number(
      stats?.streakDays || 0
    );


  const totalStudySeconds =
    Number(
      stats?.totalStudySeconds || 0
    );


  const bestFocusScore =
    Number(
      stats?.bestFocusScore || 0
    );


  const weeklyData:
    WeeklyData[] =
    stats?.weeklyData || [];


  const dailyGoalHours =
    Number(
      user?.dailyGoalHours || 0
    );


  const goalPercentage =
    dailyGoalHours > 0
      ? Math.min(
          100,
          Math.round(
            (
              todaySeconds /
              (
                dailyGoalHours *
                3600
              )
            ) * 100
          )
        )
      : 0;


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div className="space-y-8">

      {/* =============================================
          WELCOME
      ============================================== */}

      <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-violet-950/40 via-purple-950/20 to-slate-900/60">

        <div>

          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            {greeting}, {firstName} 👋
          </h1>

          <p className="text-xs text-gray-400 mt-1">

            {totalSessions > 0
              ? `${totalSessions} completed session${totalSessions === 1 ? '' : 's'} · ${streakDays} day streak`
              : 'Start your first focus session to begin building your personal focus history.'}

          </p>

        </div>


        <div className="flex items-center gap-3">

          <button
            onClick={fetchStats}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >

            <RefreshCw className="w-4 h-4" />

          </button>


          <Link
            href="/dashboard/sessions"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 hover:scale-[1.02] transition-all flex items-center gap-2"
          >

            <Play className="w-3.5 h-3.5 fill-current" />

            Start New Session

          </Link>

        </div>

      </div>


      {/* =============================================
          METRICS
      ============================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Focus */}

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">

          <div className="flex items-center justify-between text-xs text-gray-400">

            <span>
              Avg Focus Score
            </span>

            <TrendingUp className="w-4 h-4 text-emerald-400" />

          </div>


          <div className="text-3xl font-extrabold text-white font-mono">

            {avgScore}

            <span className="text-xs text-gray-400 font-normal">
              {' '}/ 100
            </span>

          </div>


          <div className="text-[11px] text-emerald-400 font-medium">

            {getScoreLabel(avgScore)}

          </div>

        </div>


        {/* Study Time */}

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">

          <div className="flex items-center justify-between text-xs text-gray-400">

            <span>
              Today's Study Time
            </span>

            <Timer className="w-4 h-4 text-cyan-400" />

          </div>


          <div className="text-3xl font-extrabold text-white font-mono">

            {todaySeconds > 0
              ? formatDuration(todaySeconds)
              : '—'}

          </div>


          <div className="text-xs text-gray-400">

            {dailyGoalHours > 0
              ? `Goal: ${dailyGoalHours}h (${goalPercentage}% complete)`
              : 'Set a daily goal in Settings'}

          </div>

        </div>


        {/* Blocked */}

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">

          <div className="flex items-center justify-between text-xs text-gray-400">

            <span>
              Blocked Attempts
            </span>

            <Lock className="w-4 h-4 text-rose-400" />

          </div>


          <div className="text-3xl font-extrabold text-rose-400 font-mono">

            {totalBlocked}

            <span className="text-xs text-gray-400 font-normal">
              {' '}total
            </span>

          </div>


          <div className="text-[11px] text-amber-400 font-medium">

            {totalBlocked > 0
              ? 'Browser blocking recorded'
              : 'No blocked attempts yet'}

          </div>

        </div>


        {/* Camera */}

        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">

          <div className="flex items-center justify-between text-xs text-gray-400">

            <span>
              Camera Events
            </span>

            <Video className="w-4 h-4 text-cyan-400" />

          </div>


          <div className="text-3xl font-extrabold text-cyan-400 font-mono">

            {totalCamera}

            <span className="text-xs text-gray-400 font-normal">
              {' '}look-aways
            </span>

          </div>


          <div className="text-[11px] text-gray-400">

            {totalCamera > 0
              ? 'Recorded across your sessions'
              : 'No camera events recorded yet'}

          </div>

        </div>

      </div>


      {/* =============================================
          SECONDARY METRICS
      ============================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="glass-card p-4 rounded-2xl border border-white/10">

          <div className="text-[11px] text-gray-400">
            Warnings
          </div>

          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
            {totalWarnings}
          </div>

        </div>


        <div className="glass-card p-4 rounded-2xl border border-white/10">

          <div className="text-[11px] text-gray-400">
            Tab Switches
          </div>

          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
            {totalTabSwitches}
          </div>

        </div>


        <div className="glass-card p-4 rounded-2xl border border-white/10">

          <div className="text-[11px] text-gray-400">
            Best Focus Score
          </div>

          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {bestFocusScore}
          </div>

        </div>

      </div>


      {/* =============================================
          CHART + GAUGE
      ============================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}

        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/10 space-y-4">

          <div>

            <h2 className="text-base font-bold text-white flex items-center gap-2">

              <Activity className="w-4 h-4 text-violet-400" />

              Weekly Focus Performance

            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Focus score, camera events and tab violations from your last 7 days
            </p>

          </div>


          <div className="h-64 w-full pt-2">

            {weeklyData.some(
              (item) =>
                item.score > 0 ||
                item.hours > 0
            ) ? (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <ComposedChart
                  data={weeklyData}
                >

                  <defs>

                    <linearGradient
                      id="scoreGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >

                      <stop
                        offset="5%"
                        stopColor="#7c3aed"
                        stopOpacity={0.7}
                      />

                      <stop
                        offset="95%"
                        stopColor="#06b6d4"
                        stopOpacity={0}
                      />

                    </linearGradient>

                  </defs>


                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />


                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    fontSize={11}
                  />


                  <YAxis
                    yAxisId="score"
                    stroke="#6b7280"
                    fontSize={11}
                    domain={[0, 100]}
                  />


                  <YAxis
                    yAxisId="events"
                    orientation="right"
                    stroke="#6b7280"
                    fontSize={11}
                    domain={[0, 12]}
                  />


                  <Tooltip
                    contentStyle={
                      TooltipStyle
                    }
                  />


                  <Legend
                    wrapperStyle={{
                      fontSize: '11px',
                      paddingTop: '8px',
                    }}
                  />


                  <Area
                    yAxisId="score"
                    type="monotone"
                    dataKey="score"
                    name="Focus Score"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />


                  <Line
                    yAxisId="events"
                    type="monotone"
                    dataKey="cameraEvents"
                    name="Camera Events"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{
                      fill: '#06b6d4',
                      r: 3,
                    }}
                    strokeDasharray="5 3"
                  />


                  <Bar
                    yAxisId="events"
                    dataKey="tabViolations"
                    name="Tab Violations"
                    fill="#f43f5e"
                    radius={[
                      3,
                      3,
                      0,
                      0,
                    ]}
                    opacity={0.85}
                  />

                </ComposedChart>

              </ResponsiveContainer>

            ) : (

              <div className="h-full flex items-center justify-center text-gray-500 text-sm text-center">

                Complete your first focus session to see your weekly performance.

              </div>

            )}

          </div>

        </div>


        {/* Gauge */}

        <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-4 text-center">

          <h3 className="text-sm font-bold text-white">
            Average Focus Score
          </h3>


          <FocusScoreGauge
            score={avgScore}
            size={170}
            strokeWidth={14}
            label="All-time average"
          />


          <div className="w-full space-y-2 text-xs">

            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/5">

              <span className="flex items-center gap-1.5 text-cyan-300">

                <Video className="w-3.5 h-3.5" />

                Camera Events

              </span>

              <span className="font-bold font-mono text-white">
                {totalCamera}
              </span>

            </div>


            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/5">

              <span className="flex items-center gap-1.5 text-rose-300">

                <Lock className="w-3.5 h-3.5" />

                Blocked Attempts

              </span>

              <span className="font-bold font-mono text-white">
                {totalBlocked}
              </span>

            </div>


            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/5">

              <span className="text-amber-300">
                🔥 Day Streak
              </span>

              <span className="font-bold font-mono text-white">
                {streakDays}
              </span>

            </div>

          </div>


          <Link
            href="/dashboard/analytics"
            className="text-xs text-violet-400 hover:underline flex items-center gap-1"
          >

            Full Analytics

            <ArrowUpRight className="w-3.5 h-3.5" />

          </Link>

        </div>

      </div>


      {/* =============================================
          RECENT SESSIONS + INSIGHTS
      ============================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Sessions */}

        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/10 space-y-4">

          <div className="flex items-center justify-between">

            <h3 className="text-base font-bold text-white">
              Recent Study Sessions
            </h3>

            <Link
              href="/dashboard/sessions"
              className="text-xs text-cyan-400 hover:underline flex items-center"
            >

              View All

              <ChevronRight className="w-3.5 h-3.5" />

            </Link>

          </div>


          {recentSessions.length === 0 ? (

            <div className="text-center py-10 text-gray-500 text-sm">

              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">

                <Timer className="w-5 h-5 text-gray-500" />

              </div>


              <p>
                No focus sessions yet.
              </p>


              <Link
                href="/dashboard/sessions"
                className="inline-flex items-center gap-1 mt-2 text-cyan-400 hover:underline"
              >

                Start your first session

                <ArrowUpRight className="w-3.5 h-3.5" />

              </Link>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-xs text-gray-300">

                <thead className="text-[11px] uppercase bg-white/5 text-gray-400">

                  <tr>

                    <th className="p-3">
                      Session
                    </th>

                    <th className="p-3">
                      When
                    </th>

                    <th className="p-3">
                      Duration
                    </th>

                    <th className="p-3">
                      Score
                    </th>

                    <th className="p-3">
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-white/5">

                  {recentSessions.map(
                    (
                      session,
                      index
                    ) => {

                      const score =
                        Number(
                          session.avgFocusScore ||
                          0
                        );


                      const status =
                        session.status ||
                        'unknown';


                      return (

                        <tr
                          key={getSessionId(
                            session,
                            index
                          )}
                          className="hover:bg-white/5 transition-colors"
                        >

                          <td className="p-3 font-semibold text-white">

                            {session.title ||
                              'Study Focus Session'}

                          </td>


                          <td className="p-3">

                            {formatSessionDate(
                              session.startTime
                            )}

                          </td>


                          <td className="p-3">

                            {Number(
                              session.durationSeconds ||
                              0
                            ) > 0
                              ? formatDuration(
                                  Number(
                                    session.durationSeconds
                                  )
                                )
                              : '—'}

                          </td>


                          <td
                            className={`p-3 font-mono font-bold ${
                              score >= 80
                                ? 'text-emerald-400'
                                : score >= 60
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                            }`}
                          >

                            {score} / 100

                          </td>


                          <td className="p-3">

                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                                status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : status === 'cancelled'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              }`}
                            >

                              {status
                                .charAt(0)
                                .toUpperCase() +
                                status.slice(1)}

                            </span>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* Insights */}

        <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 bg-gradient-to-br from-violet-950/30 via-slate-900/50 to-slate-900/80">

          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">

            <Sparkles className="w-4 h-4" />

            Session Insights

          </div>


          {totalSessions > 0 ? (

            <>

              <h4 className="text-lg font-bold text-white">
                Your Focus Summary
              </h4>


              <div className="space-y-3 text-xs">

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">

                  <span className="text-gray-400">
                    Best session score
                  </span>

                  <div className="text-emerald-400 font-bold text-lg font-mono mt-1">
                    {bestFocusScore} / 100
                  </div>

                </div>


                <div className="p-3 rounded-xl bg-white/5 border border-white/10">

                  <span className="text-gray-400">
                    Total study time
                  </span>

                  <div className="text-cyan-300 font-bold mt-1">
                    {formatDuration(
                      totalStudySeconds
                    )}
                  </div>

                </div>


                <div className="p-3 rounded-xl bg-white/5 border border-white/10">

                  <span className="text-gray-400">
                    Sessions completed
                  </span>

                  <div className="text-violet-300 font-bold mt-1">
                    {totalSessions}
                  </div>

                </div>

              </div>

            </>

          ) : (

            <>

              <h4 className="text-lg font-bold text-white">
                Get Started
              </h4>


              <p className="text-xs text-gray-300 leading-relaxed">

                Complete your first focus session to build real personal analytics and unlock meaningful focus insights.

              </p>


              <Link
                href="/dashboard/sessions"
                className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
              >

                <Play className="w-3.5 h-3.5 fill-current" />

                Start Focus Session

              </Link>

            </>

          )}


          <Link
            href="/dashboard/analytics"
            className="inline-flex items-center gap-1.5 text-xs text-violet-400 font-semibold hover:underline"
          >

            View Detailed Analytics

            <ArrowUpRight className="w-3.5 h-3.5" />

          </Link>

        </div>

      </div>

    </div>

  );
}