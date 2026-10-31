"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";

import {
  ArrowLeft,
  Timer,
  ShieldCheck,
} from "lucide-react";

import FocusTimer from "@/components/FocusTimer";

const TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export default function SessionsPage() {
  const searchParams = useSearchParams();

  const rawTaskId = searchParams.get("taskId")?.trim() ?? "";
  const plannerTaskId = TASK_ID_PATTERN.test(rawTaskId) ? rawTaskId : null;
  const hasInvalidTaskId = rawTaskId.length > 0 && !plannerTaskId;

  const plannerTaskTitle = React.useMemo(() => {
    const raw = (searchParams.get("title") ?? searchParams.get("task") ?? "")
      .replace(CONTROL_CHARACTERS, "")
      .trim();
    return raw.length >= 3 && raw.length <= 160 ? raw : null;
  }, [searchParams]);

  const plannerDurationSeconds = React.useMemo(() => {
    const plannedSeconds = searchParams.get("plannedDurationSeconds");
    if (plannedSeconds !== null) {
      if (!/^\d+$/.test(plannedSeconds)) return null;
      const parsed = Number(plannedSeconds);
      return Number.isSafeInteger(parsed) && parsed >= 60 && parsed <= 28800 ? parsed : null;
    }

    const durationSeconds = searchParams.get("durationSeconds");
    if (durationSeconds !== null) {
      if (!/^\d+$/.test(durationSeconds)) return null;
      const parsed = Number(durationSeconds);
      return Number.isSafeInteger(parsed) && parsed >= 60 && parsed <= 28800 ? parsed : null;
    }

    const legacyMinutes = searchParams.get("duration");
    if (legacyMinutes === null || !/^\d+$/.test(legacyMinutes)) return null;
    const minutes = Number(legacyMinutes);
    return Number.isSafeInteger(minutes) && minutes >= 1 && minutes <= 480 ? minutes * 60 : null;
  }, [searchParams]);
  const hasInvalidDuration = ["plannedDurationSeconds", "durationSeconds", "duration"].some(
    (key) => searchParams.has(key)
  ) && plannerDurationSeconds === null;

  return (
    <div>
      {/* =================================================
          HEADER
      ================================================= */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#262832] bg-[#12131A] px-3 py-1.5 text-xs font-mono font-semibold text-gray-300 shadow-xs transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF4500]/15 text-[#FF4500] shadow-sm border border-[#FF4500]/30">
                <Timer className="h-5 w-5" aria-hidden />
              </div>

              <h1 className="text-2xl font-serif font-bold tracking-tight text-white">
                Study Sessions
              </h1>
            </div>

            <p className="max-w-2xl text-sm text-gray-400 leading-relaxed">
              Start a real focus session with smart browser shielding — allowing verified research, warning on potential drifts, and blocking known distractions until your timer concludes.
            </p>
            <p className="mt-1.5 max-w-2xl text-xs text-gray-500 font-mono">
              Browser shielding integrates via the FocusFlow Chrome Extension. On mobile, session timing and telemetry run seamlessly in-app.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
            <span className="text-xs font-semibold text-emerald-400">
              Session data secured locally
            </span>
          </div>
        </div>
      </div>

      {/* =================================================
          FOCUS TIMER
      ================================================= */}
      <div className="glass-card overflow-hidden rounded-[22px] border border-[#262832]">
        {hasInvalidTaskId && (
          <p className="border-b border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-700" role="status">
            The planner task link was invalid, so this session will start without linking a task.
          </p>
        )}
        {plannerTaskId && (
          <p className="border-b border-leaf-300/20 bg-leaf-300/5 px-5 py-3 text-xs text-leaf-300" role="status">
            Planner task selected. Review the task and duration below, then start the session when ready.
          </p>
        )}
        {hasInvalidDuration && (
          <p className="border-b border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-700" role="status">
            The planner duration was invalid, so the default session duration is selected.
          </p>
        )}
        <FocusTimer
          initialTaskId={plannerTaskId}
          initialTaskTitle={plannerTaskTitle}
          initialDurationSeconds={plannerDurationSeconds}
        />
      </div>
    </div>
  );
}
