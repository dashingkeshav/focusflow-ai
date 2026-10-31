'use client';

/**
 * FocusTimer — Real focus session with:
 * - Persistent backend session record
 * - Real 3-strike warning system
 * - Browser tab-lock (page-level, not OS-level)
 * - Extension integration via chrome.storage
 * - No simulation/demo buttons
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import FocusScoreGauge from './FocusScoreGauge';
import CameraTracker from './CameraTracker';
import AmbientSoundPlayer from './AmbientSoundPlayer';
import FocusProtectionCore, { type CoreMood } from '@/components/three/FocusProtectionCore';
import { api, getLiveFocusMetrics, startFocusSession } from '@/lib/api';
import { useFocusState } from '@/lib/useFocusState';
import { useAuth } from '@/lib/auth';
import { useCameraMonitoring } from '@/context/CameraContext';

// Safely access the chrome extension API (only available when the extension is installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeExt = (): any => (typeof chrome !== 'undefined' ? chrome : null);

// Reads the extension's real session counters (privacy-safe counts only) so a
// web-initiated end never loses the last unsynced measurements.
function readExtensionCounters(): Promise<{
  tabSwitches: number;
  idleTimeSeconds: number;
  blockedAttempts: number;
  keyboardEvents: number;
  mouseEvents: number;
}> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ tabSwitches: 0, idleTimeSeconds: 0, blockedAttempts: 0, keyboardEvents: 0, mouseEvents: 0 });
      return;
    }

    let resolved = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('FOCUSFLOW_COUNTERS_RESPONSE', handler);
        resolve({ tabSwitches: 0, idleTimeSeconds: 0, blockedAttempts: 0, keyboardEvents: 0, mouseEvents: 0 });
      }
    }, 450);

    const handler = (event: Event) => {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('FOCUSFLOW_COUNTERS_RESPONSE', handler);
      const data = ((event as CustomEvent<Record<string, unknown>>).detail || {}) as Record<string, unknown>;
      resolve({
        tabSwitches: Number(data.tabSwitches) || 0,
        idleTimeSeconds: Number(data.idleTimeSeconds) || 0,
        blockedAttempts: Number(data.blockedAttempts) || 0,
        keyboardEvents: Number(data.keyboardEvents) || 0,
        mouseEvents: Number(data.mouseEvents) || 0,
      });
    };

    window.addEventListener('FOCUSFLOW_COUNTERS_RESPONSE', handler);
    window.dispatchEvent(new CustomEvent('FOCUSFLOW_GET_COUNTERS'));
  });
}
import {
  Play,
  AlertTriangle,
  Radio,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Video,
  Flame,
  ShieldAlert,
  Pause,
  Square,
  Globe,
  ShieldCheck,
  History,
} from 'lucide-react';

const DURATION_OPTIONS = [
  { label: '5 Min (Quick)', value: 300 },
  { label: '15 Min', value: 900 },
  { label: '25 Min (Pomodoro)', value: 1500 },
  { label: '45 Min (Deep Work)', value: 2700 },
  { label: '60 Min', value: 3600 },
];

const TASK_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WARNING_MESSAGES: Record<number, { title: string; body: string; color: string }> = {
  1: {
    title: 'Focus Warning 1 of 3',
    body: 'Your activity indicates a possible distraction. Please return to your study task.',
    color: 'border-amber-500/50 bg-amber-50/90 text-amber-700',
  },
  2: {
    title: 'Focus Warning 2 of 3',
    body: 'Another distraction detected. One more will activate browser tab blocking.',
    color: 'border-amber-400/50 bg-amber-50/95 text-amber-800',
  },
  3: {
    title: 'Final Warning — Tab Blocking Activated',
    body: 'Maximum warnings reached. Tab switching is now blocked by the Chrome Extension.',
    color: 'border-rose-500/60 bg-rose-50 text-rose-600',
  },
};

export default function FocusTimer({
  showUI = true,
  initialTaskId = null,
  initialTaskTitle = null,
  initialDurationSeconds = null,
}: {
  showUI?: boolean;
  initialTaskId?: string | null;
  initialTaskTitle?: string | null;
  initialDurationSeconds?: number | null;
}) {
  const { user, token } = useAuth();

  // ── Smart Focus state (backend + extension + socket sync) ───────────────────
  const smartFocus = useFocusState();

  // ── Session state ────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ── Timer state ──────────────────────────────────────────────────────────────
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(() =>
    typeof initialDurationSeconds === 'number' && Number.isInteger(initialDurationSeconds) && initialDurationSeconds >= 60 && initialDurationSeconds <= 28800
      ? initialDurationSeconds
      : 1500
  );
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    typeof initialDurationSeconds === 'number' && Number.isInteger(initialDurationSeconds) && initialDurationSeconds >= 60 && initialDurationSeconds <= 28800
      ? initialDurationSeconds
      : 1500
  );
  const [customMinutes, setCustomMinutes] = useState('');
  const [durationError, setDurationError] = useState('');
  const [taskTitle, setTaskTitle] = useState(() =>
    typeof initialTaskTitle === 'string'
      ? initialTaskTitle.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
      : ''
  );
  const [subject, setSubject] = useState('');
  const [strictness, setStrictness] = useState<'balanced' | 'strict' | 'custom'>('balanced');
  const [browserProtection, setBrowserProtection] = useState(true);
  const [allowedSitesText, setAllowedSitesText] = useState('');
  const [blockedSitesText, setBlockedSitesText] = useState('');
  const [warningSitesText, setWarningSitesText] = useState('');

  // ── Telemetry metrics ────────────────────────────────────────────────────────
  const [tabSwitches, setTabSwitches] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [cameraDistractions, setCameraDistractions] = useState(0);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [, setScoreHistory] = useState<number[]>([]);
  const [finalAvgScore, setFinalAvgScore] = useState<number | null>(null);

  // ── Warning system ───────────────────────────────────────────────────────────
  const [warningCount, setWarningCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<number | null>(null);
  const [blockedAttempts, setBlockedAttempts] = useState(0);
  const [tabLockActive, setTabLockActive] = useState(false);

  // ── Camera ───────────────────────────────────────────────────────────────────
  const { cameraEnabled, enableCamera, disableCamera } = useCameraMonitoring();
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  // ── End-of-Session Review ────────────────────────────────────────────────────
  const [endSessionSummary, setEndSessionSummary] = useState<{
    plannedMinutes: number;
    actualMinutes: number;
    score: number | null;
    tabSwitches: number;
    warnings: number;
    blockedAttempts: number;
    keyboardEvents: number;
    mouseEvents: number;
    taskTitle: string;
    taskId: string | null;
  } | null>(null);
  const [taskOutcome, setTaskOutcome] = useState<'completed' | 'in_progress' | 'todo'>('completed');
  const [sessionNotes, setSessionNotes] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  // ── Extension status ─────────────────────────────────────────────────────────
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [currentSite, setCurrentSite] = useState<{ domain: string; category: string; reason: string } | null>(null);

  // ── Refs to avoid stale closures ─────────────────────────────────────────────
  const warningCountRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const isActiveRef = useRef(false);
  const tokenRef = useRef(token);
  const scoreHistoryRef = useRef<number[]>([]);
  const tabSwitchesRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const cameraDistractionsRef = useRef(0);
  const blockedAttemptsRef = useRef(0);
  const lastWarningReasonRef = useRef<string | null>(null);
  const lastWarningAtRef = useRef(0);
  const secondsRemainingRef = useRef(0);

  // Sync refs
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { warningCountRef.current = warningCount; }, [warningCount]);
  useEffect(() => { tabSwitchesRef.current = tabSwitches; }, [tabSwitches]);
  useEffect(() => { idleSecondsRef.current = idleSeconds; }, [idleSeconds]);
  useEffect(() => { cameraDistractionsRef.current = cameraDistractions; }, [cameraDistractions]);
  useEffect(() => { blockedAttemptsRef.current = blockedAttempts; }, [blockedAttempts]);
  useEffect(() => { secondsRemainingRef.current = secondsRemaining; }, [secondsRemaining]);

  useEffect(() => {
    setIsCameraEnabled(cameraEnabled);
  }, [cameraEnabled]);

  // Read task, duration, and subject from URL search params (e.g. from AI Planner)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTask = params.get('task');
      const urlSubject = params.get('subject') || params.get('goal');
      const urlDuration = params.get('duration');
      if (urlTask || urlSubject || urlDuration) {
        queueMicrotask(() => {
          if (urlTask) setTaskTitle(urlTask);
          if (urlSubject) setSubject(urlSubject);
          if (urlDuration) {
            const mins = Number(urlDuration);
            if (!isNaN(mins) && mins > 0) {
              setTargetDurationSeconds(mins * 60);
              setSecondsRemaining(mins * 60);
            }
          }
        });
      }
    }
  }, []);

  // ── Format time ──────────────────────────────────────────────────────────────
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return hrs > 0
      ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Restore active session from localStorage + backend state ────────────────
  useEffect(() => {
    const storedEnd = Number(localStorage.getItem('focusflow_lock_ends_at'));
    const storedSessionId = localStorage.getItem('focusflow_active_session_id');
    const storedTaskTitle = localStorage.getItem('focusflow_active_task_title');
    const storedSubject = localStorage.getItem('focusflow_active_subject');

    const restore = () => {
      const backendState = smartFocus.focusState;

      if (storedEnd > Date.now() && (storedSessionId || backendState?.sessionId)) {
        const remaining = Math.ceil((storedEnd - Date.now()) / 1000);
        setSecondsRemaining(remaining);
        setTargetDurationSeconds((prev) => (prev > remaining ? prev : remaining));
        setIsActive(true);
        setTabLockActive(backendState?.browserProtection !== false);
        if (storedSessionId) {
          setSessionId(storedSessionId);
          sessionIdRef.current = storedSessionId;
        }
        setTaskTitle(backendState?.taskTitle || storedTaskTitle || 'Active focus task');
        setSubject(backendState?.subject || storedSubject || '');
      } else if (!smartFocus.isLoading) {
        localStorage.removeItem('focusflow_lock_ends_at');
        localStorage.removeItem('focusflow_active_session_id');
        localStorage.removeItem('focusflow_active_task_title');
        localStorage.removeItem('focusflow_active_subject');
      }
    };

    if (smartFocus.isLoading) return;
    // defer so the effect body itself stays free of sync setState
    const id = window.setTimeout(restore, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once when loading completes
  }, [smartFocus.isLoading, smartFocus.focusState?.sessionId]);

  // ── Extension connectivity & live site detection ─────────────────────────────
  useEffect(() => {
    if (smartFocus.extensionConnected) {
      setExtensionConnected(true);
    }
    if (smartFocus.currentSite) {
      setCurrentSite(smartFocus.currentSite);
    }
  }, [smartFocus.extensionConnected, smartFocus.currentSite]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const check = () => {
      const w = window as unknown as { __focusflowExtension?: boolean };
      if (w.__focusflowExtension || document.documentElement.dataset.focusflowExtension === 'true') {
        setExtensionConnected(true);
      }
    };
    check();

    const onHello = () => setExtensionConnected(true);
    const onSite = (event: Event) => {
      const raw = (event as CustomEvent<unknown>).detail;
      try {
        const site = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (site && site.domain) {
          setCurrentSite(site);
        }
      } catch {}
    };

    window.addEventListener('FOCUSFLOW_EXTENSION_HELLO', onHello);
    window.addEventListener('FOCUSFLOW_CURRENT_SITE', onSite);

    return () => {
      window.removeEventListener('FOCUSFLOW_EXTENSION_HELLO', onHello);
      window.removeEventListener('FOCUSFLOW_CURRENT_SITE', onSite);
    };
  }, []);

  // ── Warning banner ─────────────────────────────────────────────────────────────
  // Warnings are COUNTED server-side from real events (extension distraction
  // events, site warnings, camera events). The UI only displays the banner;
  // it never invents a count or records a duplicate event.
  const issueWarning = useCallback((reason: string) => {
    if (!isActiveRef.current) return;
    const now = Date.now();
    if (lastWarningReasonRef.current === reason && now - lastWarningAtRef.current < 30_000) return;
    lastWarningReasonRef.current = reason;
    lastWarningAtRef.current = now;
    setActiveWarning(Math.min(Math.max(warningCountRef.current, 1), 3));
  }, []);

  // ── Session complete / manual end ────────────────────────────────────────────
  const finishSession = useCallback(
    async (status: 'completed' | 'cancelled') => {
      if (!isActiveRef.current && status === 'completed') return;
      setIsActive(false);
      setTabLockActive(false);
      localStorage.removeItem('focusflow_lock_ends_at');
      localStorage.removeItem('focusflow_active_session_id');
      localStorage.removeItem('focusflow_active_task_title');
      localStorage.removeItem('focusflow_active_subject');
      window.dispatchEvent(new CustomEvent('focusflow:session-change', { detail: { active: false } }));

      // Final counters: real extension measurements (monotonic server-side).
      // Duration and scores are computed by the backend from persisted data.
      const ext = await readExtensionCounters();

      try {
        const result = await smartFocus.end({
          sessionId: sessionIdRef.current || undefined,
          tabSwitches: Math.max(tabSwitchesRef.current, ext.tabSwitches || 0),
          idleTimeSeconds: Math.max(idleSecondsRef.current, ext.idleTimeSeconds || 0),
          cameraDistractions: cameraDistractionsRef.current,
          warningCount: warningCountRef.current,
          blockedAttempts: Math.max(blockedAttemptsRef.current, ext.blockedAttempts || 0),
          keyboardEvents: ext.keyboardEvents || 0,
          mouseEvents: ext.mouseEvents || 0,
          status,
        });
        const finalScore = result?.session?.avgFocusScore ?? null;
        setFinalAvgScore(finalScore);

        const actualMinutes = Math.max(1, Math.round((targetDurationSeconds - secondsRemainingRef.current) / 60));
        setEndSessionSummary({
          plannedMinutes: Math.round(targetDurationSeconds / 60),
          actualMinutes,
          score: finalScore,
          tabSwitches: Math.max(tabSwitchesRef.current, ext.tabSwitches || 0),
          warnings: warningCountRef.current,
          blockedAttempts: Math.max(blockedAttemptsRef.current, ext.blockedAttempts || 0),
          keyboardEvents: ext.keyboardEvents || 0,
          mouseEvents: ext.mouseEvents || 0,
          taskTitle: taskTitle || 'Focus Task',
          taskId: initialTaskId || null,
        });
        setReviewSaved(false);
      } catch (err) {
        console.error('[FocusTimer] Failed to end session:', err);
      }

      // Release extension protection
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('FOCUSFLOW_EXTENSION_COMMAND', { detail: { type: 'CLEAR' } }));
      }
      if (chromeExt()?.storage?.local) {
        chromeExt()?.storage?.local.set({
          sessionActive: false,
          paused: false,
        });
      }

      setIsCompleted(status === 'completed');
      setSessionId(null);
      setActiveWarning(null);
      setIsCameraEnabled(false);
      void smartFocus.refresh();
    },
    [smartFocus, targetDurationSeconds, taskTitle, initialTaskId]
  );

  const handleSessionComplete = useCallback(() => {
    void finishSession('completed');
  }, [finishSession]);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const state = smartFocus.focusState;

    if (state?.endsAt) {
      // Server is the source of truth. While paused, the clock is frozen —
      // the backend preserves the remaining time across pauses.
      if (state.paused) {
        const frozen = state.remainingSecondsWhenPaused ?? secondsRemainingRef.current;
        setSecondsRemaining(frozen);
        return;
      }

      const tick = () => {
        const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          handleSessionComplete();
        }
      };

      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }

    // Fallback for a restored session before the backend state loads:
    // the stored lock end is the real server-issued end timestamp.
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const storedEnd = Number(localStorage.getItem('focusflow_lock_ends_at'));
        if (storedEnd) {
          const remaining = Math.max(0, Math.ceil((storedEnd - Date.now()) / 1000));
          if (remaining <= 0) {
            handleSessionComplete();
            return 0;
          }
          return remaining;
        }
        const next = prev - 1;
        if (next <= 0) {
          handleSessionComplete();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => { clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, smartFocus.focusState?.endsAt, smartFocus.focusState?.paused, smartFocus.focusState?.sessionId]);

  // ── Block navigation links during tab-lock ───────────────────────────────────
  useEffect(() => {
    if (!isActive || !tabLockActive) return;

    const blockNav = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        setActiveWarning(warningCountRef.current || 1);
      }
    };

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('click', blockNav, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('click', blockNav, true);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [isActive, tabLockActive]);

  // ── Focus score engine — recalculate every 3 seconds ────────────────────────
  // ── Real telemetry pipeline ───────────────────────────────────────────────────
  // The Focus Score and ALL counters come from the backend, computed from
  // persisted real extension/web events. score === null means nothing was
  // measured ("Not available") — the UI never fabricates a value.
  const applyLiveUpdate = useCallback(
    (payload: {
      score?: number | null;
      hasTelemetry?: boolean;
      alertMessage?: string | null;
      metrics?: {
        focusScore?: number | null;
        tabSwitches?: number;
        idleTimeSeconds?: number;
        cameraDistractions?: number;
        warningCount?: number;
        blockedAttempts?: number;
        hasTelemetry?: boolean;
      } | null;
    }) => {
      const metrics = payload.metrics ?? null;

      if (metrics) {
        if (metrics.tabSwitches != null) setTabSwitches(metrics.tabSwitches);
        if (metrics.idleTimeSeconds != null) setIdleSeconds(metrics.idleTimeSeconds);
        if (metrics.cameraDistractions != null) setCameraDistractions(metrics.cameraDistractions);
        if (metrics.warningCount != null) {
          setWarningCount(metrics.warningCount);
          warningCountRef.current = metrics.warningCount;
          if (metrics.warningCount >= 3 && browserProtection) {
            setTabLockActive(true);
          }
        }
        if (metrics.blockedAttempts != null) {
          setBlockedAttempts(metrics.blockedAttempts);
          blockedAttemptsRef.current = metrics.blockedAttempts;
        }
      }

      const nextScore = payload.score ?? metrics?.focusScore ?? null;
      setCurrentScore(nextScore);
      if (typeof nextScore === 'number') {
        const history = scoreHistoryRef.current;
        if (history.length === 0 || history[history.length - 1] !== nextScore) {
          history.push(nextScore);
          scoreHistoryRef.current = history;
          setScoreHistory([...history]);
        }
      }

      if (payload.alertMessage) {
        issueWarning(payload.alertMessage);
      }
    },
    [issueWarning, browserProtection]
  );

  // Socket pushes (focus_metrics / focus_score_update) — real-time updates.
  useEffect(() => {
    if (!smartFocus.liveMetrics) return;
    const metrics = smartFocus.liveMetrics;
    const id = window.setTimeout(() => {
      applyLiveUpdate({
        score: metrics.score,
        alertMessage: metrics.alertMessage,
        metrics: metrics.metrics,
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, [smartFocus.liveMetrics, applyLiveUpdate]);

  // Poll fallback every 5s (covers missed socket frames; ownership is
  // enforced server-side via req.user.id).
  useEffect(() => {
    if (!isActive || !token) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getLiveFocusMetrics();
        if (cancelled || !result?.success) return;
        applyLiveUpdate({
          score: result.score,
          alertMessage: result.alertMessage,
          metrics: result.metrics ?? null,
        });
      } catch {
        // Backend offline — keep the last real values; the poll retries.
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive, token, applyLiveUpdate]);

  // ── Extension storage counters (fresh values between server syncs) ──────────
  useEffect(() => {
    if (!isActive || !extensionConnected) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const ext = await readExtensionCounters();
        if (cancelled) return;
        if (ext.tabSwitches > 0) setTabSwitches((prev) => Math.max(prev, ext.tabSwitches));
        if (ext.idleTimeSeconds > 0) setIdleSeconds((prev) => Math.max(prev, ext.idleTimeSeconds));
        if (ext.blockedAttempts > 0) {
          setBlockedAttempts((prev) => Math.max(prev, ext.blockedAttempts));
          blockedAttemptsRef.current = Math.max(blockedAttemptsRef.current, ext.blockedAttempts);
        }
      } catch {}
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isActive, extensionConnected]);

  // ── Start session (Smart Focus Mode) ────────────────────────────────────────
  const handleStart = async () => {
    if (!token || !user) {
      setSessionError('You must be logged in to start a focus session.');
      return;
    }

    const normalizedTaskId = typeof initialTaskId === 'string' && TASK_ID_PATTERN.test(initialTaskId.trim())
      ? initialTaskId.trim()
      : '';
    const normalizedPlannerDuration = typeof initialDurationSeconds === 'number' && Number.isInteger(initialDurationSeconds)
      && initialDurationSeconds >= 60 && initialDurationSeconds <= 28800
      ? initialDurationSeconds
      : null;
    const normalizedPlannerTitle = typeof initialTaskTitle === 'string'
      ? initialTaskTitle.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160)
      : '';
    const requestedDuration = normalizedPlannerDuration ?? targetDurationSeconds;
    const effectiveTitle = (taskTitle.trim() || normalizedPlannerTitle || 'Study Focus Session').trim();

    if (!Number.isInteger(requestedDuration) || requestedDuration < 60 || requestedDuration > 28800) {
      setDurationError('Select a duration between 1 and 480 minutes.');
      return;
    }
    if (effectiveTitle.length < 3) {
      setSessionError('Describe what you are working on so FocusFlow can protect the right sites.');
      return;
    }

    setSessionError(null);
    setIsSaving(true);

    const allowedSites = allowedSitesText.split(',').map((site) => site.trim().toLowerCase()).filter(Boolean);
    const blockedSites = blockedSitesText.split(',').map((site) => site.trim().toLowerCase()).filter(Boolean);
    const warningSites = warningSitesText.split(',').map((site) => site.trim().toLowerCase()).filter(Boolean);

    try {
      const result = await smartFocus.start({
        taskTitle: effectiveTitle,
        taskId: normalizedTaskId || undefined,
        subject: subject.trim(),
        durationSeconds: requestedDuration,
        strictness,
        mode: strictness === 'strict' ? 'strict_lock' : 'smart',
        primarySite: allowedSites[0] || '',
        browserProtection,
        allowedSites,
        blockedSites,
        warningSites,
      });

      if (!result.success) {
        setSessionError(result.error || 'Could not start session. Please check your connection.');
        setIsSaving(false);
        return;
      }

      const state = smartFocus.focusState;
      const newSessionId = state?.sessionId || null;
      const endTimestamp = state?.endsAt || Date.now() + requestedDuration * 1000;

      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;

      localStorage.setItem('focusflow_lock_ends_at', String(endTimestamp));
      if (newSessionId) localStorage.setItem('focusflow_active_session_id', newSessionId);
      localStorage.setItem('focusflow_active_task_title', effectiveTitle);
      localStorage.setItem('focusflow_active_subject', subject.trim());
      window.dispatchEvent(new CustomEvent('focusflow:session-change', { detail: { active: true } }));

      setIsActive(true);
      setIsCompleted(false);
      setTabSwitches(0);
      setIdleSeconds(0);
      setCameraDistractions(0);
      setWarningCount(0);
      setBlockedAttempts(0);
      setCurrentScore(null);
      setFinalAvgScore(null);
      setScoreHistory([]);
      scoreHistoryRef.current = [];
      tabSwitchesRef.current = 0;
      idleSecondsRef.current = 0;
      cameraDistractionsRef.current = 0;
      warningCountRef.current = 0;
      blockedAttemptsRef.current = 0;
      setActiveWarning(null);
      setTabLockActive(browserProtection);
      setSecondsRemaining(requestedDuration);
    } catch {
      setSessionError('Failed to connect to the server. Please ensure the backend is running.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCameraDistraction = (reason: string) => {
    const newCount = cameraDistractionsRef.current + 1;
    setCameraDistractions(newCount);
    cameraDistractionsRef.current = newCount;

    if (newCount >= 2) {
      issueWarning(reason);
    }

    if (tokenRef.current && sessionIdRef.current) {
      api.recordEvent(tokenRef.current, {
        sessionId: sessionIdRef.current,
        eventType: 'camera_absent',
        details: reason,
      }).catch(() => null);
    }
  };

  const handleCameraToggle = (enabled: boolean) => {
    setIsCameraEnabled(enabled);
    if (enabled) {
      enableCamera();
    } else {
      disableCamera();
    }
  };

  const applyCustomDuration = () => {
    const minutes = Number(customMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      setDurationError('Enter a whole number from 1 to 480 minutes.');
      return;
    }
    setDurationError('');
    if (!isActive) {
      setTargetDurationSeconds(minutes * 60);
      setSecondsRemaining(minutes * 60);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (!showUI) return null;

  return (
    <div className="rounded-2xl p-6 border border-[#262832] bg-card shadow-2xl space-y-6 text-white font-inter">

      {/* ── Completion Banner ── */}
      {/* ── End-of-Session Review ── */}
      {isCompleted && endSessionSummary && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-5 text-white backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-white">End-of-Session Review</h3>
                <p className="text-xs text-gray-400">Real focus measurements from your session record</p>
              </div>
            </div>
            {reviewSaved && (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Review Confirmed
              </span>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#262832] bg-white/5 p-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Duration</span>
              <p className="mt-1 font-serif text-base font-bold text-white">
                {endSessionSummary.actualMinutes}m <span className="text-xs font-normal text-gray-400">/ {endSessionSummary.plannedMinutes}m</span>
              </p>
            </div>

            <div className="rounded-xl border border-[#262832] bg-white/5 p-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Focus Score</span>
              <p className="mt-1 font-serif text-base font-bold text-[#FF4500]">
                {endSessionSummary.score != null ? `${endSessionSummary.score}/100` : 'Not available'}
              </p>
            </div>

            <div className="rounded-xl border border-[#262832] bg-white/5 p-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Distraction Alerts</span>
              <p className="mt-1 font-serif text-base font-bold text-amber-400">
                {endSessionSummary.warnings + endSessionSummary.blockedAttempts}
              </p>
              <span className="text-[10px] text-gray-400 font-mono">
                {endSessionSummary.tabSwitches} tab switch{endSessionSummary.tabSwitches === 1 ? '' : 'es'}
              </span>
            </div>

            <div className="rounded-xl border border-[#262832] bg-white/5 p-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Input Activity</span>
              <p className="mt-1 font-serif text-base font-bold text-white">
                {endSessionSummary.keyboardEvents + endSessionSummary.mouseEvents > 0
                  ? `${endSessionSummary.keyboardEvents + endSessionSummary.mouseEvents} events`
                  : '—'}
              </p>
              <span className="text-[10px] text-gray-400 font-mono">
                privacy-safe count
              </span>
            </div>
          </div>

          {/* Task Outcome Selection */}
          {!reviewSaved ? (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-gray-300">
                Update Task Status: <strong className="text-white">{endSessionSummary.taskTitle}</strong>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskOutcome('completed')}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    taskOutcome === 'completed'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                      : 'border-[#262832] bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold text-white">Completed</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Finished task & advances goal</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskOutcome('in_progress')}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    taskOutcome === 'in_progress'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-bold'
                      : 'border-[#262832] bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold text-white">In Progress (Partial)</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Logs time, keeps task active</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskOutcome('todo')}
                  className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    taskOutcome === 'todo'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-300 font-bold'
                      : 'border-[#262832] bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold text-white">Incomplete</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Leaves task for next sprint</p>
                </button>
              </div>

              {/* Notes input */}
              <div className="pt-2">
                <label className="block text-xs text-gray-400 mb-1">Session Notes (Optional)</label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Notes, key milestones reached, or blockers encountered..."
                  maxLength={500}
                  className="w-full rounded-xl border border-[#262832] bg-black/40 px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#FF4500] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSavingReview}
                  onClick={async () => {
                    setIsSavingReview(true);
                    try {
                      const taskIdToUpdate = endSessionSummary.taskId || initialTaskId;
                      if (taskIdToUpdate) {
                        const { updateTaskStatusApi } = await import('@/lib/api');
                        await updateTaskStatusApi(taskIdToUpdate, taskOutcome);
                      }
                      setReviewSaved(true);
                    } catch (err) {
                      console.error('Failed to update task outcome:', err);
                    } finally {
                      setIsSavingReview(false);
                    }
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingReview ? 'Saving...' : 'Confirm Review & Update Task'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              Task outcome recorded as <strong className="text-white capitalize">{taskOutcome.replace('_', ' ')}</strong>. Linked goals and statistics updated with authentic data.
            </div>
          )}
        </div>
      )}

      {/* ── Warning Banners ── */}
      {activeWarning && WARNING_MESSAGES[activeWarning] && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 text-sm ${WARNING_MESSAGES[activeWarning].color}`}>
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{WARNING_MESSAGES[activeWarning].title}</p>
            <p className="text-xs mt-1 opacity-80">{WARNING_MESSAGES[activeWarning].body}</p>
          </div>
          <button
            onClick={() => setActiveWarning(null)}
            className="text-xs opacity-60 hover:opacity-100 underline shrink-0"
            aria-label="Dismiss warning"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Session error ── */}
      {sessionError && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3 flex items-center gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          {sessionError}
        </div>
      )}

      {/* ── Smart Focus sync error ── */}
      {!sessionError && smartFocus.error && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          {smartFocus.error}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Focus Score Gauge */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#12131A] rounded-2xl border border-[#262832]">
          <FocusScoreGauge
            score={currentScore}
            size={190}
            strokeWidth={16}
            label={isActive ? 'Live Focus Score' : 'Focus Score'}
          />
          {isActive && (
            <div className="mt-3 text-xs text-center font-mono text-[#FF4500] font-bold">
              {formatTime(secondsRemaining)} remaining
            </div>
          )}
        </div>

        {/* Timer Controls */}
        <div className="space-y-4 flex flex-col justify-between">
          <div>
            {/* Status label */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FF4500] uppercase tracking-wider mb-3">
              <Radio className={`w-4 h-4 ${isActive ? 'animate-pulse text-[#FF4500]' : 'text-white/40'}`} />
              <span>
                {isActive
                  ? smartFocus.focusState?.paused
                    ? 'Paused'
                    : tabLockActive
                      ? 'Tab Lock Active'
                      : 'Session Running'
                  : isCompleted ? 'Session Complete' : 'Ready to Start'}
              </span>
            </div>

            {/* Duration selector — only before start */}
            {!isActive && !isCompleted && (
              <div className="space-y-3 mb-4">
                <div className="space-y-2">
                  <label htmlFor="focus-task-title" className="text-xs font-mono font-medium text-white/70">What are you working on?</label>
                  <input
                    id="focus-task-title"
                    value={taskTitle}
                    onChange={(event) => { setTaskTitle(event.target.value); setSessionError(null); }}
                    placeholder="Example: Complete React authentication architecture"
                    maxLength={160}
                    className="w-full rounded-xl border border-[#262832] bg-[#12131A] px-3.5 py-2 text-sm text-white shadow-xs outline-none focus:border-[#FF4500] placeholder:text-white/30"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Subject (optional)"
                      maxLength={80}
                      className="rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-xs text-white shadow-xs outline-none focus:border-[#FF4500] placeholder:text-white/30"
                    />
                    <select
                      value={strictness}
                      onChange={(event) => setStrictness(event.target.value as 'balanced' | 'strict' | 'custom')}
                      className="rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-xs text-white shadow-xs outline-none focus:border-[#FF4500]"
                      aria-label="Focus protection mode"
                    >
                      <option value="balanced">Balanced — block distractions</option>
                      <option value="strict">Strict — verify unknown sites</option>
                      <option value="custom">Custom — rules decide</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={allowedSitesText}
                      onChange={(event) => setAllowedSitesText(event.target.value)}
                      placeholder="Allow: react.dev, github.com"
                      maxLength={240}
                      className="rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-[11px] text-white shadow-xs outline-none focus:border-[#FF4500] placeholder:text-white/30"
                    />
                    <input
                      value={blockedSitesText}
                      onChange={(event) => setBlockedSitesText(event.target.value)}
                      placeholder="Block: instagram.com, facebook.com"
                      maxLength={240}
                      className="rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-[11px] text-white shadow-xs outline-none focus:border-[#FF4500] placeholder:text-white/30"
                    />
                  </div>
                  <input
                    value={warningSitesText}
                    onChange={(event) => setWarningSitesText(event.target.value)}
                    placeholder="Ask me first: youtube.com, reddit.com"
                    maxLength={240}
                    className="w-full rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-[11px] text-white shadow-xs outline-none focus:border-amber-500 placeholder:text-white/30"
                  />
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={browserProtection}
                      onChange={(event) => setBrowserProtection(event.target.checked)}
                      className="h-3.5 w-3.5 accent-[#FF4500]"
                    />
                    Browser protection during this session (requires FocusFlow extension)
                  </label>
                  <p className="text-[11px] text-white/40">Essential resources remain open. Unrelated tabs and social streams are blocked during your focus window.</p>
                </div>
                <label className="text-xs font-mono font-medium text-white/70 flex items-center gap-1.5 pt-1">
                  <Clock className="w-3.5 h-3.5 text-[#FF4500]" /> Target Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTargetDurationSeconds(opt.value); setSecondsRemaining(opt.value); }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        targetDurationSeconds === opt.value
                          ? 'bg-[#FF4500] text-white border-[#FF4500] shadow-xs'
                          : 'bg-[#12131A] text-white/70 border-[#262832] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    aria-label="Custom duration in minutes"
                    type="number"
                    min="1"
                    max="480"
                    value={customMinutes}
                    onChange={(e) => { setCustomMinutes(e.target.value); setDurationError(''); }}
                    placeholder="Custom (1–480 min)"
                    className="flex-1 rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-xs text-white shadow-xs outline-none focus:border-[#FF4500]"
                  />
                  <button type="button" onClick={applyCustomDuration} className="rounded-xl border border-[#FF4500]/40 bg-[#FF4500]/10 px-3 text-xs font-bold text-[#FF4500] hover:bg-[#FF4500]/20">
                    Set
                  </button>
                </div>
                {durationError && <p className="text-xs text-rose-400">{durationError}</p>}
              </div>
            )}

            {/* Timer display */}
            <div className="text-5xl font-extrabold text-white font-serif tracking-tight my-2">
              {formatTime(secondsRemaining)}
            </div>
            {isActive && <p className="max-w-xs text-xs text-white/60">Working on: <span className="font-semibold text-white">{taskTitle}</span></p>}
            {isActive && currentSite && (
              <div className="mt-3 max-w-xs rounded-xl border border-[#262832] bg-[#12131A] px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">Current site</span>
                  <span className={currentSite.category === 'productive' ? 'text-emerald-400 font-bold' : currentSite.category === 'distracting' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                    {currentSite.category.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 truncate font-medium text-white font-mono">{currentSite.domain}</p>
                <p className="mt-1 text-[11px] text-white/40">{currentSite.reason}</p>
              </div>
            )}

            {/* Protection badges */}
            <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
              {isActive && smartFocus.focusState?.paused ? (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-medium">
                  <Pause className="w-3.5 h-3.5" /> Paused
                </span>
              ) : isActive && tabLockActive ? (
                <span className="px-2.5 py-1 rounded-full bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/30 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF4500]" /> Focus Protection Active
                </span>
              ) : isActive ? (
                <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" /> Monitoring
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-medium">
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Ready
                </span>
              )}

              {/* Extension indicator */}
              <span className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 border text-[10px] font-mono font-medium ${
                extensionConnected
                  ? 'bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/30'
                  : 'bg-white/5 text-white/40 border-[#262832]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${extensionConnected ? 'bg-[#FF4500]' : 'bg-white/40'}`} />
                {extensionConnected
                  ? 'Extension Connected'
                  : isActive
                    ? 'Extension Disconnected — telemetry unavailable'
                    : 'Browser protection needs the FocusFlow extension'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isActive ? (
              <button
                onClick={handleStart}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FF4500] hover:bg-[#FF4500]/90 text-white font-bold text-sm shadow-md shadow-[#FF4500]/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Starting…</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Start {Math.floor(targetDurationSeconds / 60)}-Min Session</>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (smartFocus.focusState?.paused ? smartFocus.resume() : smartFocus.pause())}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
                >
                  {smartFocus.focusState?.paused ? (
                    <><Play className="h-4 w-4 fill-current" /> Resume</>
                  ) : (
                    <><Pause className="h-4 w-4" /> Pause</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void finishSession('completed')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition-all"
                >
                  <Square className="h-4 w-4" /> End Session
                </button>
              </>
            )}
          </div>
        </div>

        {/* Camera Tracker */}
        <div>
          <CameraTracker
            isEnabled={isCameraEnabled}
            onToggle={handleCameraToggle}
            onDistractionDetected={handleCameraDistraction}
            isActiveSession={isActive}
            showUI={showUI}
          />
        </div>
      </div>

      {/* ── Metrics strip ── */}
      <div className="pt-4 border-t border-[#262832] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-[#12131A] p-3 rounded-xl border border-[#262832]">
          <div className="text-white/40 mb-1 flex items-center justify-between uppercase tracking-wider text-[10px]">
            <span>Tab Switches</span>
            <Lock className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className={`text-lg font-bold ${tabSwitches > 0 ? 'text-rose-400' : 'text-white'}`}>
            {extensionConnected ? tabSwitches : <span className="text-white/40 text-xs">Not available</span>}
          </div>
        </div>

        <div className="bg-[#12131A] p-3 rounded-xl border border-[#262832]">
          <div className="text-white/40 mb-1 flex items-center justify-between uppercase tracking-wider text-[10px]">
            <span>Camera Events</span>
            <Video className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-sky-400">
            {isCameraEnabled ? cameraDistractions : <span className="text-white/40 text-xs">Camera disabled</span>}
          </div>
        </div>

        <div className="bg-[#12131A] p-3 rounded-xl border border-[#262832]">
          <div className="text-white/40 mb-1 uppercase tracking-wider text-[10px]">Warnings</div>
          <div className={`text-lg font-bold ${warningCount >= 3 ? 'text-rose-400' : warningCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {warningCount} <span className="text-xs text-white/40">/ 3</span>
          </div>
        </div>

        <div className="bg-[#12131A] p-3 rounded-xl border border-[#262832]">
          <div className="text-white/40 mb-1 uppercase tracking-wider text-[10px]">Target</div>
          <div className="text-lg font-bold text-[#FF4500] flex items-center gap-1 font-serif">
            <Flame className="w-4 h-4" />
            {Math.floor(targetDurationSeconds / 60)}m
          </div>
        </div>
      </div>

      {/* ── Live site classification panel (extension-driven) ── */}
      {isActive && (smartFocus.currentSite || smartFocus.activityLog.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#12131A] p-4 rounded-xl border border-[#262832]">
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3">
              <Globe className="w-3.5 h-3.5 text-[#FF4500]" />
              Current Site
            </div>
            {smartFocus.currentSite ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm text-white">{smartFocus.currentSite.domain}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold border ${
                    smartFocus.currentSite.category === 'productive'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : smartFocus.currentSite.category === 'distracting'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}>
                    {smartFocus.currentSite.category.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">{smartFocus.currentSite.reason}</p>
              </>
            ) : (
              <p className="text-xs text-white/40">No site activity observed yet.</p>
            )}
          </div>

          <div className="lg:col-span-2 bg-[#12131A] p-4 rounded-xl border border-[#262832]">
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-white/50 mb-3">
              <History className="w-3.5 h-3.5 text-sky-400" />
              Previous Activity
            </div>
            {smartFocus.activityLog.length === 0 ? (
              <p className="text-xs text-white/40">Site decisions from your focus session will appear here.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {smartFocus.activityLog.map((entry, index) => (
                  <div key={`${entry.timestamp}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-[11px]">
                    <span className="truncate font-mono text-white/80">{entry.domain || '—'}</span>
                    <span className="flex items-center gap-2 font-mono">
                      <span className={
                        entry.classification === 'productive'
                          ? 'text-emerald-400'
                          : entry.classification === 'distracting'
                            ? 'text-rose-400'
                            : 'text-amber-300'
                      }>
                        {(entry.classification || 'unknown').replace('_', ' ')}
                      </span>
                      <span className="text-white/40">{entry.action}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3D Focus Protection Core ── */}
      {isActive && (
        <div className="flex items-center justify-center gap-4 rounded-2xl border border-[#262832] bg-[#12131A] p-4">
          <FocusProtectionCore
            mood={(
              (smartFocus.currentSite?.category === 'distracting'
                ? 'distracted'
                : smartFocus.currentSite?.category === 'productive'
                  ? 'productive'
                  : 'healthy') as CoreMood
            )}
            size={84}
          />
          <div className="text-xs text-white/50 max-w-xs">
            <p className="font-semibold text-white">
              {smartFocus.currentSite?.category === 'productive'
                ? 'In flow — this site supports your task.'
                : smartFocus.currentSite?.category === 'distracting'
                  ? 'Distraction detected — protection reacted.'
                  : 'Protection active. Stay with your task.'}
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              The core reacts to your browsing context in real time. Classification is an assistive estimate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
