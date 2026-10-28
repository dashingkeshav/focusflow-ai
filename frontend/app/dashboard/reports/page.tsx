"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";

import { getDateRangeReport, type ReportStats } from "@/lib/api-extra";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/useEntitlements";
import { ProBadge, FreeBadge, ProLockModal } from "@/components/ui/ProLockCard";

// =====================================================
// HELPERS
// =====================================================

function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(value?: string | Date): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Last 7 days", start: isoDay(-6), end: isoDay(0) },
  { label: "Last 30 days", start: isoDay(-29), end: isoDay(0) },
  { label: "This month", start: isoDay(new Date().getDate() - 1), end: isoDay(0) },
] as const;

export default function ReportsPage() {
  const { user } = useAuth();
  const { isPro, canAccess } = useEntitlements();
  const [start, setStart] = useState(isoDay(-6));
  const [end, setEnd] = useState(isoDay(0));
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lockModal, setLockModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    featureName: string;
    bulletPoints?: string[];
  }>({
    isOpen: false,
    title: "",
    description: "",
    featureName: "",
  });

  const handlePresetSelect = (p: { label: string; start: string; end: string }) => {
    if (p.label !== "Last 7 days" && !canAccess("advanced_analytics")) {
      setLockModal({
        isOpen: true,
        title: "Custom Reporting Windows",
        description: "Free accounts include 7-day reporting periods. Upgrade to FocusFlow Pro to generate reports across 30 days, 90 days, or custom time spans.",
        featureName: "Advanced Analytics — Pro",
        bulletPoints: [
          "Generate reports beyond 7 days (30d, 90d, All-Time)",
          "Custom start and end date selector without date limits",
          "Full historical audit logs for compliance or reflection",
        ],
      });
      return;
    }
    setStart(p.start);
    setEnd(p.end);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDateRangeReport(start, end);
      if (res.success) {
        setStats(res.stats || null);
      } else {
        setError(res.message || "Failed to load report data.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3000);
  };

  // ── CSV EXPORT ──
  const handleExportCSV = () => {
    if (!stats) return;

    const rows: string[] = [];
    rows.push(
      [csvEscape("Generated"), csvEscape(new Date().toISOString())].join(","),
      [csvEscape("User"), csvEscape(user?.name || "unknown")].join(","),
      [csvEscape("Date Range"), csvEscape(`${start} to ${end}`)].join(","),
      "\n"
    );

    rows.push("== SUMMARY ==");
    rows.push(["Metric", "Value"].map(csvEscape).join(","));
    rows.push(["Sessions", stats.dateRange.sessionCount ?? 0].map(csvEscape).join(","));
    rows.push(["Total Focus Time (seconds)", stats.totalStudySeconds ?? 0].map(csvEscape).join(","));
    rows.push(["Average Focus Score", stats.avgFocusScore ?? "no scored sessions"].map(csvEscape).join(","));
    rows.push(["Tab Switches", stats.totalTabSwitches ?? 0].map(csvEscape).join(","));
    rows.push(["Idle Time (seconds)", stats.totalIdleSeconds ?? 0].map(csvEscape).join(","));
    rows.push(["Camera Events", stats.totalCameraDistractions ?? 0].map(csvEscape).join(","));
    rows.push(["Warnings", stats.totalWarnings ?? 0].map(csvEscape).join(","));
    rows.push(["Blocked Attempts", stats.totalBlocked ?? 0].map(csvEscape).join(","));
    rows.push(["Distraction Events", stats.totalEvents ?? 0].map(csvEscape).join(","));
    rows.push("\n");

    rows.push("== DAILY BREAKDOWN ==");
    rows.push(["Day", "Hours", "Focus Score", "Camera Events", "Tab Violations", "Idle (min)"].map(csvEscape).join(","));
    for (const d of stats.weeklyData || []) {
      rows.push([d.day, d.hours, d.score ?? "not scored", d.cameraEvents, d.tabViolations, d.idleTime].map(csvEscape).join(","));
    }
    rows.push("\n");

    rows.push("== SESSION LOG ==");
    rows.push(["Session", "Started", "Duration (s)", "Focus Score", "Status"].map(csvEscape).join(","));
    for (const s of stats.sessions || []) {
      rows.push(
        [
          s.title || "Focus Session",
          s.startedAt ? new Date(s.startedAt).toISOString() : "",
          s.durationSeconds ?? 0,
          s.avgFocusScore ?? "not scored",
          s.status || "unknown",
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    downloadBlob(
      new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }),
      `focusflow-report-${start}-to-${end}.csv`
    );
    flash("CSV report exported with your real session data.");
  };

  // ── PRINTABLE PDF ──
  const handleDownloadPDF = () => {
    if (!canAccess("advanced_reports_pdf")) {
      setLockModal({
        isOpen: true,
        title: "Executive PDF Reports",
        description: "Export beautifully formatted PDF performance reports with summary KPIs, daily breakdowns, and full session telemetry. Free users can export unlimited raw CSV datasets.",
        featureName: "Advanced Reports — Pro",
        bulletPoints: [
          "Executive-ready printable PDF reports",
          "Formatted daily performance breakdown & session audit log",
          "Unlimited raw CSV export included on both Free and Pro",
        ],
      });
      return;
    }

    if (!stats) return;

    const daily = stats.weeklyData || [];
    const sessions = (stats.sessions || []).slice(0, 20);

    const win = window.open("", "_blank", "width=820,height=960");
    if (!win) {
      setError("Your browser blocked the report window. Allow pop-ups and try again.");
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>FocusFlow Performance Report</title>
  <style>
    body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #ffffff; margin: 40px; background: #050505; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #ffffff; }
    h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 2px solid #FF4500; padding-bottom: 6px; color: #ffffff; }
    .meta { color: #9ca3af; font-size: 12px; margin-bottom: 20px; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .card { border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; background: #111111; }
    .card .label { font-size: 10px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; font-weight: 600; font-family: monospace; }
    .card .value { font-size: 20px; font-weight: 700; margin-top: 4px; color: #FF4500; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; background: #111111; }
    th { text-align: left; background: #1a1a1a; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #FF4500; font-family: monospace; }
    td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #d1d5db; }
    .footer { margin-top: 32px; font-size: 10px; color: #6b7280; text-align: center; font-family: monospace; }
    @media print { body { margin: 20px; background: #050505; color: #fff; } }
  </style>
</head>
<body>
  <h1>FocusFlow Performance Report</h1>
  <div class="meta">Generated for ${user?.name || "User"} · ${start} to ${end} · ${new Date().toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    )}</div>

  <h2>Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">Sessions</div><div class="value">${stats.dateRange.sessionCount ?? 0}</div></div>
    <div class="card"><div class="label">Total Focus Time</div><div class="value">${formatDuration(
      Number(stats.totalStudySeconds || 0)
    )}</div></div>
    <div class="card"><div class="label">Avg Focus Score</div><div class="value">${
      stats.avgFocusScore != null ? `${stats.avgFocusScore}/100` : "Not available"
    }</div></div>
    <div class="card"><div class="label">Tab Switches</div><div class="value">${stats.totalTabSwitches ?? 0}</div></div>
    <div class="card"><div class="label">Idle Time</div><div class="value">${formatDuration(
      Number(stats.totalIdleSeconds || 0)
    )}</div></div>
    <div class="card"><div class="label">Distraction Events</div><div class="value">${stats.totalEvents ?? 0}</div></div>
  </div>

  <h2>Daily Breakdown</h2>
  <table>
    <thead><tr><th>Day</th><th>Hours</th><th>Focus Score</th><th>Camera Events</th><th>Tab Violations</th><th>Idle (min)</th></tr></thead>
    <tbody>
      ${
        daily.length > 0
          ? daily
              .map(
                (d) =>
                  `<tr><td>${d.day}</td><td>${d.hours}</td><td>${
                    d.score != null ? d.score : "—"
                  }</td><td>${d.cameraEvents}</td><td>${d.tabViolations}</td><td>${d.idleTime}</td></tr>`
              )
              .join("")
          : '<tr><td colspan="6">No daily data recorded in this range.</td></tr>'
      }
    </tbody>
  </table>

  <h2>Session Log</h2>
  <table>
    <thead><tr><th>Session</th><th>Started</th><th>Duration</th><th>Score</th><th>Status</th></tr></thead>
    <tbody>
      ${
        sessions.length > 0
          ? sessions
              .map(
                (s) =>
                  `<tr><td>${s.title || "Focus Session"}</td><td>${formatDateTime(
                    s.startedAt
                  )}</td><td>${formatDuration(s.durationSeconds || 0)}</td><td>${
                    s.avgFocusScore != null ? `${s.avgFocusScore}/100` : "—"
                  }</td><td>${s.status || "—"}</td></tr>`
              )
              .join("")
          : '<tr><td colspan="5">No individual sessions recorded in this range.</td></tr>'
      }
    </tbody>
  </table>

  <div class="footer">FocusFlow AI · Verified Telemetry Report · Confidential</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const hasAnyData =
    Boolean(stats) &&
    ((stats?.dateRange?.sessionCount ?? 0) > 0 ||
      (stats?.totalStudySeconds ?? 0) > 0 ||
      (stats?.sessions && stats.sessions.length > 0));

  return (
    <div className="space-y-6 font-inter text-white">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500] shadow-xs">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Reports & Data Export
            </h1>
            <p className="text-xs text-white/50">
              Generate custom date-range performance summaries, raw CSV telemetry, and printable PDFs.
            </p>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#111111] px-3.5 py-2 text-xs font-medium text-white/80 shadow-xs transition-all hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#FF4500]" : ""}`} aria-hidden />
          Refresh Report
        </button>
      </div>

      {/* ── NOTICE / ERROR ── */}
      {(notice || error) && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-medium ${
            error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error ? <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> : <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />}
          {error || notice}
        </div>
      )}

      {/* ── DATE RANGE BUILDER ── */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-[#FF4500]" aria-hidden />
          <h2 className="text-base font-bold text-white font-serif">Select Date Range</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => {
            const active = start === p.start && end === p.end;
            const isProPreset = p.label !== "Last 7 days";
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetSelect(p)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-[#FF4500] bg-[#FF4500] text-white shadow-xs"
                    : "border-white/10 bg-[#111111] text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{p.label}</span>
                {isProPreset && !isPro && <ProBadge className="scale-75 origin-left" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <label className="text-xs font-mono font-medium text-white/60">
            From
            <input
              type="date"
              className="mt-1 block rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white shadow-xs outline-none focus:border-[#FF4500]"
              value={start}
              max={end}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-xs font-mono font-medium text-white/60">
            To
            <input
              type="date"
              className="mt-1 block rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white shadow-xs outline-none focus:border-[#FF4500]"
              value={end}
              min={start}
              max={isoDay(0)}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Calendar className="h-3.5 w-3.5" aria-hidden />}
            Apply Range
          </button>
        </div>
      </div>

      {/* ── EXPORT CARDS ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* PDF Card */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
                <Printer className="h-5 w-5" aria-hidden />
              </div>
              {!isPro && <ProBadge />}
            </div>
            <h2 className="mt-3 text-lg font-bold text-white font-serif">Performance Report (PDF)</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              A formatted report for <strong>{start}</strong> → <strong>{end}</strong>: sessions, focus time, average score,
              daily breakdown, and the session log — verified data.
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={loading || !stats}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 py-3 text-xs font-bold text-white shadow-md shadow-[#FF4500]/20 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            <span>Generate PDF Report</span>
            {!isPro && <ProBadge className="scale-75" />}
          </button>
        </div>

        {/* CSV Card */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mt-3 text-lg font-bold text-white font-serif">Raw Telemetry Dataset (CSV)</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              Complete export for the selected range: summary metrics, the daily breakdown (hours,
              scores, camera events, tab violations, idle time), and every session with timestamps.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={loading || !stats}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0a0a0a] py-3 text-xs font-bold text-white/80 shadow-xs transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV Data
          </button>
        </div>
      </div>

      {/* ── REPORT PREVIEW ── */}
      {stats && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white font-serif">
              <Calendar className="h-4 w-4 text-[#FF4500]" aria-hidden />
              Report Data Preview
            </h2>
            <span className="text-xs font-mono text-white/50">
              {stats.dateRange?.sessionCount ?? 0} sessions ·{" "}
              {formatDuration(Number(stats.totalStudySeconds || 0))} focused
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Avg Focus Score",
                value: stats.avgFocusScore != null ? `${stats.avgFocusScore}/100` : "Not available",
              },
              { label: "Tab Switches", value: String(stats.totalTabSwitches ?? 0) },
              { label: "Warnings", value: String(stats.totalWarnings ?? 0) },
              { label: "Idle Time", value: formatDuration(Number(stats.totalIdleSeconds || 0)) },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-white/5 bg-white/5 p-3.5">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50">{m.label}</div>
                <div className="mt-1 text-base font-serif font-bold text-white">{m.value}</div>
              </div>
            ))}
          </div>

          {/* daily table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="bg-white/5 text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 border-b border-white/10">
                <tr>
                  <th className="p-3">Day</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Focus Score</th>
                  <th className="p-3">Tab Violations</th>
                  <th className="p-3">Idle (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(stats.weeklyData || []).length > 0 ? (
                  (stats.weeklyData || []).map((d) => (
                    <tr key={d.day} className="hover:bg-white/5">
                      <td className="p-3 font-semibold text-white font-mono">{d.day}</td>
                      <td className="p-3 font-mono">{d.hours}</td>
                      <td className="p-3 font-mono font-medium text-[#FF4500]">{d.score != null ? d.score : "—"}</td>
                      <td className="p-3 font-mono text-amber-400">{d.tabViolations}</td>
                      <td className="p-3 font-mono text-white/50">{d.idleTime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-white/40 font-mono">
                      No data recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-white/40 font-mono">
            Both exports contain authentic database telemetry. Days without scored sessions show “—” instead of fabricated numbers.
          </p>
        </div>
      )}

      {!loading && !hasAnyData && !error && (
        <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#111111] p-16 text-center shadow-xs">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/30">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="text-base font-bold text-white font-serif">No telemetry for {start} → {end}</h3>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-white/50">
            Sessions and distraction incidents completed in this period will appear here with complete verifiable metrics.
          </p>
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
