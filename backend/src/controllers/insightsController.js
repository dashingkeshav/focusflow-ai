const { pool } = require("../config/db");
const express = require("express");

function toDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function tasksFromRow(tasks) {
  try {
    return Array.isArray(tasks) ? JSON.parse(JSON.stringify(tasks) ?? "[]") : [];
  } catch {
    return [];
  }
}

function completedTaskCount(tasks) {
  return tasks.reduce((acc, t) => (t.completed ? acc + 1 : acc), 0);
}

async function getUserGoals(userId) {
  const rows = await pool.query(
    `SELECT id, name, status, category, habit, habit_streak, target_value, start_date, target_date, tasks
     FROM goals
     WHERE user_id = $1
     ORDER BY start_date ASC NULLS LAST, created_at ASC
     LIMIT 200`,
    [userId]
  );
  return rows.rows;
}

async function getRecentSessions(userId, limit) {
  const rows = await pool.query(
    `SELECT id, start_time, duration_seconds, avg_focus_score, tab_switches, idle_time_seconds,
            camera_distractions, warning_count, blocked_attempts, productive_seconds
     FROM sessions
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY start_time DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.rows;
}

async function distractionCounts(userId) {
  const rows = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE event_type = 'site_blocked')::int AS blocked,
        COUNT(*) FILTER (WHERE event_type = 'site_warning')::int AS warnings,
        COUNT(*) FILTER (WHERE event_type = 'distraction_detected')::int AS distractions,
        COUNT(*) FILTER (WHERE event_type IN ('idle_detected'))::int AS idle,
        COUNT(*) FILTER (WHERE event_type IN ('camera_absent','camera_multiple'))::int AS camera
      FROM activity_events WHERE user_id = $1`,
    [userId]
  );
  const r = rows.rows[0];
  return {
    blocked: Number(r.blocked || 0),
    warnings: Number(r.warnings || 0),
    distractions: Number(r.distractions || 0),
    idle: Number(r.idle || 0),
    camera: Number(r.camera || 0),
  };
}

async function distractionByType(userId) {
  const rows = await pool.query(
    `SELECT event_type, COUNT(*)::int AS c
     FROM activity_events
     WHERE user_id = $1 AND event_type IN ('site_blocked','site_warning','distraction_detected','idle_detected','camera_absent','camera_multiple')
     GROUP BY event_type
     ORDER BY c DESC`,
    [userId]
  );
  const acc = {};
  for (const r of rows.rows) acc[r.event_type] = Number(r.c);
  return acc;
}

async function topDistractionDomains(userId, limit) {
  const rows = await pool.query(
    `SELECT domain, COUNT(*)::int AS c, MAX(timestamp) AS last_at
     FROM activity_events
     WHERE user_id = $1 AND event_type IN ('site_blocked','site_warning','distraction_detected')
       AND domain IS NOT NULL
     GROUP BY domain
     ORDER BY c DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.rows.map((r) => ({
    domain: r.domain,
    count: Number(r.c),
    lastAt: r.last_at ? new Date(r.last_at) : null,
  }));
}

function bestWindowFromSessions(sessions) {
  const buckets = {};
  for (const s of sessions) {
    const h = toDate(s.start_time).getHours();
    const score = s.avg_focus_score == null ? null : Number(s.avg_focus_score);
    if (score == null) continue;
    const k = (buckets[h] = buckets[h] || { total: 0, count: 0 });
    k.total += score;
    k.count += 1;
  }
  const entries = Object.entries(buckets)
    .map(([h, b]) => ({ hour: Number(h), avg: b.total / Math.max(1, b.count), count: b.count }))
    .filter((e) => e.count >= 1)
    .sort((a, b) => b.avg - a.avg);
  if (entries.length === 0) return null;
  const top = entries[0];
  const label = (hour) =>
    hour < 6 || hour >= 21 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return { window: label(top.hour), avg: Math.round(top.avg), count: top.count };
}

function riskWindowFromSessions(sessions) {
  const buckets = {};
  for (const s of sessions) {
    const h = toDate(s.start_time).getHours();
    const switches = Number(s.tab_switches || 0);
    const k = (buckets[h] = buckets[h] || { switches: 0, count: 0 });
    k.switches += switches;
    k.count += 1;
  }
  const entries = Object.entries(buckets)
    .map(([h, b]) => ({ hour: Number(h), risk: b.switches / Math.max(1, b.count), count: b.count }))
    .sort((a, b) => b.risk - a.risk);
  if (entries.length === 0 || entries[0].risk <= 0) return null;
  const top = entries[0];
  const label = (hour) =>
    hour < 6 || hour >= 21 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return { window: label(top.hour), risk: Math.round((top.risk * 10) / 10), count: top.count };
}

function trendFromWeekly(weekly) {
  const scored = weekly.filter((d) => d.score != null);
  if (scored.length < 2) return null;
  const half = Math.floor(scored.length / 2);
  const earlier = scored.slice(0, half).reduce((s, d) => s + Number(d.score), 0) / Math.max(1, half);
  const recent = scored.slice(half).reduce((s, d) => s + Number(d.score), 0) / Math.max(1, scored.length - half);
  const delta = Math.round(recent - earlier);
  return {
    delta,
    label:
      delta > 0
        ? `up ${delta} pts`
        : delta < 0
          ? `down ${Math.abs(delta)} pts`
          : "holding steady",
  };
}

async function generateInsights(userId) {
  const [goals, sessions, dc, distractionByTypeResult, topDomains] = await Promise.all([
    getUserGoals(userId),
    getRecentSessions(userId, 50),
    distractionCounts(userId),
    distractionByType(userId),
    topDistractionDomains(userId, 8),
  ]);

  const totalSessions = sessions.length;
  const totalSeconds = sessions.reduce((s, r) => s + Number(r.duration_seconds || 0), 0);
  const scoredSessions = sessions.filter((r) => r.avg_focus_score != null);
  const totalTabSwitches = sessions.reduce((s, r) => s + Number(r.tab_switches || 0), 0);
  const totalIdleSeconds = sessions.reduce((s, r) => s + Number(r.idle_time_seconds || 0), 0);
  const totalCamera = sessions.reduce((s, r) => s + Number(r.camera_distractions || 0), 0);

  const avgFocusScore =
    scoredSessions.length > 0
      ? Math.round(scoredSessions.reduce((s, r) => s + Number(r.avg_focus_score), 0) / scoredSessions.length)
      : null;
  const bestFocusScore =
    scoredSessions.length > 0
      ? Math.max(...scoredSessions.map((r) => Number(r.avg_focus_score)))
      : null;

  const distractionRate = totalSessions > 0 ? Math.round((totalTabSwitches / totalSessions) * 10) / 10 : 0;

  const topDomainsList = topDomains.length > 0;
  const topDomain = topDomains.length > 0 ? topDomains[0].domain : null;
  const topDomainCount = topDomains.length > 0 ? topDomains[0].count : 0;

  const bestWindow = bestWindowFromSessions(sessions);
  const riskWindow = riskWindowFromSessions(sessions);

  const byDay = new Map();
  for (const s of sessions) {
    const day = toDate(s.start_time).toISOString().slice(0, 10);
    const score = s.avg_focus_score == null ? null : Number(s.avg_focus_score);
    let bucket = byDay.get(day);
    if (!bucket) {
      bucket = [];
      byDay.set(day, bucket);
    }
    if (score != null) bucket.push(score);
  }
  const weeklyScores = [];
  const sortedDays = [...byDay.keys()].sort().slice(-7);
  for (const day of sortedDays) {
    const bucket = byDay.get(day);
    if (bucket.length > 0) weeklyScores.push(Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length));
  }
  const trend = trendFromWeekly(weeklyScores.map((s) => ({ score: s })));

  const activeGoals = goals.filter((g) => g.status === "Active");
  const goalsWithTasks = goals.filter((g) => Array.isArray(g.tasks) && g.tasks.length > 0);
  const totalGoalTasks = goalsWithTasks.reduce((acc, g) => acc + tasksFromRow(g.tasks).length, 0);
  const completedGoalTasks = goalsWithTasks.reduce((acc, g) => acc + completedTaskCount(tasksFromRow(g.tasks)), 0);
  const habitGoals = goals.filter((g) => g.habit);
  const bestHabitStreak =
    habitGoals.length > 0 ? Math.max(...habitGoals.map((g) => Number(g.habit_streak || 0))) : 0;

  const insights = [];

  if (bestWindow) {
    insights.push({
      kind: "peak_window",
      tone: "positive",
      title: `${bestWindow.window} is your strongest window`,
      body: `Sessions started in the ${bestWindow.window.toLowerCase()} average a focus score of ${bestWindow.avg}/100 across ${bestWindow.count} session${bestWindow.count === 1 ? "" : "s"}.`,
      detail: "Schedule your hardest work in this window — shorter or lighter blocks elsewhere.",
      observation: `Your highest verified focus scores occur during the ${bestWindow.window.toLowerCase()} window.`,
      evidence: `Recorded average focus score of ${bestWindow.avg}/100 across ${bestWindow.count} session(s) in this window.`,
      impact: `You sustain flow states longer and experience fewer task interruptions during this period.`,
      recommendation: `Schedule your highest-priority tasks and deep study blocks during this window.`,
    });
  }

  if (riskWindow) {
    insights.push({
      kind: "risk_window",
      tone: "warning",
      title: `${riskWindow.window} shows the most tab switching`,
      body: `Sessions in the ${riskWindow.window.toLowerCase()} average ${riskWindow.risk} tab switches across ${riskWindow.count} session${riskWindow.count === 1 ? "" : "s"} — your highest of any window.`,
      detail: "Plan lighter or shorter blocks here, or take a deliberate break before long sessions.",
      observation: `${riskWindow.window} exhibits the highest distraction frequency across your sessions.`,
      evidence: `Averaged ${riskWindow.risk} tab switches per session across ${riskWindow.count} session(s) in this window.`,
      impact: `Frequent context switching disrupts deep work and increases cognitive fatigue.`,
      recommendation: `Keep browser protection active or take a deliberate break before working in this window.`,
    });
  }

  if (trend) {
    insights.push({
      kind: "trend",
      tone: trend.delta >= 0 ? "positive" : "warning",
      title: trend.delta === 0 ? "Your focus is holding steady" : `Your focus is trending ${trend.label}`,
      body: `Comparing the earlier and recent halves of this week, your scores ${trend.delta === 0 ? "are level" : trend.delta > 0 ? "moved up" : "moved down"} by ${Math.abs(trend.delta)} point${Math.abs(trend.delta) === 1 ? "" : "s"}.`,
      detail:
        trend.delta > 0
          ? "Keep the current routine going — it is working."
          : trend.delta < 0
            ? "Consider shorter focus blocks earlier in the day; fatigue is the usual culprit."
            : "Try a new focus-block length to find your next improvement.",
      observation: trend.delta === 0 ? "Focus score consistency sustained across recent days." : `Focus score trajectory is trending ${trend.label}.`,
      evidence: `Compared verified session scores from the earlier half vs. the recent half of your activity.`,
      impact: trend.delta >= 0 ? "Momentum compounds task completion and strengthens daily habits." : "Score dip indicates potential cognitive fatigue or overly long session blocks.",
      recommendation: trend.delta >= 0 ? "Protect your current daily focus routine." : "Cap sessions at 45 minutes with mandatory 5-minute recovery intervals.",
    });
  }

  if (totalSessions > 0) {
    insights.push({
      kind: "session_hygiene",
      tone: distractionRate > 3 ? "warning" : "positive",
      title: distractionRate > 3 ? "Distraction rate is running high" : "Distraction rate is under control",
      body: `Averaging ${distractionRate} tab switches per session with ${dc.warnings} warnings and ${dc.blocked} blocked attempt${dc.blocked === 1 ? "" : "s"}.`,
      detail:
        distractionRate > 3
          ? "Enable stricter blocking for your next session and keep only task-related tabs open."
          : "Your blocking setup is doing its job — stay consistent.",
      observation: distractionRate > 3 ? "Elevated tab switching observed during focus sprints." : "Disciplined browsing maintained throughout focus sessions.",
      evidence: `Recorded ${distractionRate} average tab switches, ${dc.warnings} warnings, and ${dc.blocked} blocked site attempts.`,
      impact: distractionRate > 3 ? "Frequent interruptions increase task completion time." : "Minimal interruption overhead maximizes knowledge retention per study hour.",
      recommendation: distractionRate > 3 ? "Close non-essential tabs before starting and enable strict extension blocking." : "Keep current site rules active for all upcoming sprints.",
    });
  }

  if (dc.camera > 0) {
    insights.push({
      kind: "camera",
      tone: "warning",
      title: "Look-aways recorded",
      body: `${dc.camera} camera look-away event${dc.camera === 1 ? "" : "s"} were logged across your sessions.`,
      detail: "This is from your opt-in camera monitor only; no video is stored or uploaded.",
      observation: "Gaze sensor detected attention drift away from your primary screen.",
      evidence: `Logged ${dc.camera} look-away events across completed focus sessions.`,
      impact: "Physical glance shifts signal emerging mental fatigue or ambient distractions.",
      recommendation: "Take a 5-minute break away from screens between sessions to refresh visual focus.",
    });
  }

  if (topDomainsList) {
    const others = topDomains.filter((d) => d.domain !== topDomain).slice(0, 4);
    insights.push({
      kind: "distraction_profile",
      tone: dc.blocked >= 2 ? "warning" : "neutral",
      title: `Your most common distraction source`,
      body: `Across your distraction events, ${topDomain} (${topDomainCount}x) is the single most repeated source.`,
      detail:
        others.length > 0
          ? `Other frequent sources: ${others.map((d) => `${d.domain} (${d.count})`).join(", ")}.`
          : "No other repeated sources yet.",
      observation: `${topDomain} is your most frequent distraction domain.`,
      evidence: `Triggered ${topDomainCount} warning or blocking events during active study sessions.`,
      impact: `Repeated visits to this domain account for the majority of recorded interruptions.`,
      recommendation: `Add ${topDomain} to your blocked list in Focus Settings to eliminate the temptation.`,
    });
  }

  if (activeGoals.length > 0) {
    insights.push({
      kind: "goal_progress",
      tone: "neutral",
      title: `${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}`,
      body: `You have ${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}. Across goals with tasks, ${completedGoalTasks} of ${totalGoalTasks} task${totalGoalTasks === 1 ? "" : "s"} are done.`,
      detail:
        totalGoalTasks > 0
          ? `Goal task completion is at ${Math.round((completedGoalTasks / totalGoalTasks) * 100)}%.`
          : "No tasks are attached to goals yet — adding them sharpens planning.",
      observation: `You have ${activeGoals.length} active goal(s) in your workspace roadmap.`,
      evidence: `${completedGoalTasks} of ${totalGoalTasks} goal-linked tasks are marked completed.`,
      impact: totalGoalTasks > 0 ? `Overall goal task completion is at ${Math.round((completedGoalTasks / totalGoalTasks) * 100)}%.` : "Goals without linked tasks lack tangible progress tracking.",
      recommendation: totalGoalTasks > 0 ? "Keep checking off priority tasks to advance your goals." : "Use the AI Planner or Goals page to break goals into concrete tasks.",
    });
  }

  if (habitGoals.length > 0) {
    insights.push({
      kind: "habit_streak",
      tone: "positive",
      title: `Best habit streak: ${bestHabitStreak} day${bestHabitStreak === 1 ? "" : "s"}`,
      body: `${habitGoals.length} habit${habitGoals.length === 1 ? "" : "s"} tracked with a best streak of ${bestHabitStreak} day${bestHabitStreak === 1 ? "" : "s"}.`,
      detail:
        bestHabitStreak >= 7
          ? "You are building real consistency — keep the chain."
          : "Consistency compounds; a few short sessions help.",
      observation: `${bestHabitStreak}-day streak maintained across active habits.`,
      evidence: `Tracked across ${habitGoals.length} daily habit goal(s) in your workspace.`,
      impact: bestHabitStreak >= 7 ? "Consistent daily practice establishes long-term cognitive discipline." : "Early-stage streak is forming; consistency compounds rapidly.",
      recommendation: "Log at least one focus session today to protect and extend your streak.",
    });
  }

  return {
    stats: {
      totalSessions,
      totalSeconds,
      totalTabSwitches,
      totalWarnings: dc.warnings,
      totalBlocked: dc.blocked,
      totalIdleSeconds,
      totalCamera,
      avgFocusScore,
      bestFocusScore,
      distractionRate,
      distractionByType: dc,
      topDomains,
    },
    insights,
  };
}

async function handleInsights(req, res) {
  try {
    const userId = req.user.id;
    const result = await generateInsights(userId);
    const { recordFeatureUsage } = require("../utils/entitlements");
    await recordFeatureUsage(userId, "ai_insights_generate");
    return res.json({ success: true, insights: result });
  } catch (err) {
    console.error("generateInsights error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate insights." });
  }
}

module.exports = { handleInsights, generateInsights };
