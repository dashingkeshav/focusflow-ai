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
import { api, calculateFocusScore } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// Safely access the chrome extension API (only available when the extension is installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeExt = (): any => (typeof chrome !== 'undefined' ? chrome : null);
import {
  Play,
  Square,
  AlertTriangle,
  Radio,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Video,
  Flame,
  ShieldAlert,
} from 'lucide-react';

const DURATION_OPTIONS = [
  { label: '5 Min (Quick)', value: 300 },
  { label: '15 Min', value: 900 },
  { label: '25 Min (Pomodoro)', value: 1500 },
  { label: '45 Min (Deep Work)', value: 2700 },
  { label: '60 Min', value: 3600 },
];

const WARNING_MESSAGES: Record<number, { title: string; body: string; color: string }> = {
  1: {
    title: 'Focus Warning 1 of 3',
    body: 'Your activity indicates a possible distraction. Please return to your study task.',
    color: 'border-amber-500/50 bg-amber-950/80 text-amber-200',
  },
  2: {
    title: 'Focus Warning 2 of 3',
    body: 'Another distraction detected. One more will activate browser tab blocking.',
    color: 'border-orange-500/50 bg-orange-950/80 text-orange-200',
  },
  3: {
    title: 'Final Warning — Tab Blocking Activated',
    body: 'Maximum warnings reached. Tab switching is now blocked by the Chrome Extension.',
    color: 'border-rose-500/60 bg-rose-950/90 text-rose-200',
  },
};

export default function FocusTimer() {
  const { user, token } = useAuth();

  // ── Session state ────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ── Timer state ──────────────────────────────────────────────────────────────
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(1500);
  const [secondsRemaining, setSecondsRemaining] = useState(1500);
  const [customMinutes, setCustomMinutes] = useState('');
  const [durationError, setDurationError] = useState('');

  // ── Telemetry metrics ────────────────────────────────────────────────────────
  const [tabSwitches, setTabSwitches] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [cameraDistractions, setCameraDistractions] = useState(0);
  const [currentScore, setCurrentScore] = useState(100);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  // ── Warning system ───────────────────────────────────────────────────────────
  const [warningCount, setWarningCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<number | null>(null);
  const [blockedAttempts, setBlockedAttempts] = useState(0);
  const [tabLockActive, setTabLockActive] = useState(false);

  // ── Camera ───────────────────────────────────────────────────────────────────
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  // ── Extension status ─────────────────────────────────────────────────────────
  const [extensionConnected, setExtensionConnected] = useState(false);

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

  // Sync refs
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { warningCountRef.current = warningCount; }, [warningCount]);
  useEffect(() => { tabSwitchesRef.current = tabSwitches; }, [tabSwitches]);
  useEffect(() => { idleSecondsRef.current = idleSeconds; }, [idleSeconds]);
  useEffect(() => { cameraDistractionsRef.current = cameraDistractions; }, [cameraDistractions]);
  useEffect(() => { blockedAttemptsRef.current = blockedAttempts; }, [blockedAttempts]);

  // ── Format time ──────────────────────────────────────────────────────────────
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return hrs > 0
      ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Restore active lock from localStorage ────────────────────────────────────
  useEffect(() => {
    const storedEnd = Number(localStorage.getItem('focusflow_lock_ends_at'));
    const storedSessionId = localStorage.getItem('focusflow_active_session_id');
    if (storedEnd > Date.now() && storedSessionId) {
      const remaining = Math.ceil((storedEnd - Date.now()) / 1000);
      setSecondsRemaining(remaining);
      setTargetDurationSeconds(remaining);
      setIsActive(true);
      setTabLockActive(true);
      setSessionId(storedSessionId);
    } else {
      localStorage.removeItem('focusflow_lock_ends_at');
      localStorage.removeItem('focusflow_active_session_id');
    }
  }, []);

  // ── Check extension connectivity ─────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      if (chromeExt()?.storage?.local) {
        setExtensionConnected(true);
      }
    };
    check();
  }, []);

  // ── Warning system ───────────────────────────────────────────────────────────
  const issueWarning = useCallback(
    (reason: string) => {
      if (!isActiveRef.current) return;

      const newCount = warningCountRef.current + 1;
      setWarningCount(newCount);
      warningCountRef.current = newCount;
      setActiveWarning(newCount);

      // Record event in backend
      if (tokenRef.current && sessionIdRef.current) {
        api.recordEvent(tokenRef.current, {
          sessionId: sessionIdRef.current,
          eventType: 'distraction_warning',
          details: reason,
          warningNumber: newCount,
        }).catch(() => null);
      }

      // Notify extension about warning
      if (chromeExt()?.storage?.local) {
        chromeExt()?.storage?.local.set({ warningCount: newCount });
        if (newCount >= 3) {
          chromeExt()?.storage?.local.set({ tabLockActive: true });
          setTabLockActive(true);
        }
      }
    },
    []
  );

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          // Check real time against stored lock end for accuracy
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
    }

    return () => { if (interval) clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── Tab visibility change — track tab switching ──────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isActiveRef.current) {
        const newCount = tabSwitchesRef.current + 1;
        setTabSwitches(newCount);

        if (newCount >= 5) {
          issueWarning(`Tab switch attempt #${newCount} during focus session`);
        }

        // Record in backend
        if (tokenRef.current && sessionIdRef.current) {
          api.recordEvent(tokenRef.current, {
            sessionId: sessionIdRef.current,
            eventType: 'tab_switch',
            details: `Tab switch attempt ${newCount}`,
          }).catch(() => null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [issueWarning]);

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
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const { score, isDistracted, alertMessage } = calculateFocusScore({
        tabSwitches: tabSwitchesRef.current,
        idleTimeSeconds: idleSecondsRef.current,
        keyboardRate: 48,
        mouseRate: 28,
        cameraDistractions: cameraDistractionsRef.current,
      });

      setCurrentScore(score);
      scoreHistoryRef.current.push(score);
      setScoreHistory([...scoreHistoryRef.current]);

      if (isDistracted && alertMessage) {
        issueWarning(alertMessage);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, issueWarning]);

  // ── Poll extension storage for blocked attempts ──────────────────────────────
  useEffect(() => {
    if (!isActive || !extensionConnected) return;

    const interval = setInterval(() => {
      if (chromeExt()?.storage?.local) {
        chromeExt()?.storage?.local.get(
          ['tabSwitchCount', 'idleTimeSeconds', 'blockedAttempts', 'pendingWarning'],
          (result: Record<string, unknown>) => {
            if (result['tabSwitchCount'] != null) setTabSwitches(result['tabSwitchCount'] as number);
            if (result['idleTimeSeconds'] != null) setIdleSeconds(result['idleTimeSeconds'] as number);
            if (result['blockedAttempts'] != null) {
              setBlockedAttempts(result['blockedAttempts'] as number);
              blockedAttemptsRef.current = result['blockedAttempts'] as number;
            }
            // Handle warnings triggered by extension
            if (result['pendingWarning'] && (result['pendingWarning'] as Record<string,unknown>)['timestamp']) {
              const pending = result['pendingWarning'] as Record<string, unknown>;
              const age = Date.now() - (pending['timestamp'] as number);
              if (age < 5000) {
                issueWarning((pending['reason'] as string) || 'Distraction detected by extension');
                chromeExt()?.storage?.local.remove('pendingWarning');
              }
            }
          }
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, extensionConnected, issueWarning]);

  // ── Session complete ─────────────────────────────────────────────────────────
  const handleSessionComplete = useCallback(async () => {
    if (!isActiveRef.current) return;
    setIsActive(false);
    setTabLockActive(false);
    localStorage.removeItem('focusflow_lock_ends_at');
    localStorage.removeItem('focusflow_active_session_id');

    // Release extension lock
    if (chromeExt()?.storage?.local) {
      chromeExt()?.storage?.local.set({
        sessionActive: false,
        tabLockActive: false,
      });
    }

    const scores = scoreHistoryRef.current;
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100;
    const finalScore = scores.length > 0 ? scores[scores.length - 1] : 100;

    if (sessionIdRef.current && tokenRef.current) {
      setIsSaving(true);
      try {
        await api.endSession(tokenRef.current, {
          sessionId: sessionIdRef.current,
          durationSeconds: targetDurationSeconds,
          avgFocusScore: avgScore,
          finalFocusScore: finalScore,
          tabSwitches: tabSwitchesRef.current,
          idleTimeSeconds: idleSecondsRef.current,
          cameraDistractions: cameraDistractionsRef.current,
          warningCount: warningCountRef.current,
          blockedAttempts: blockedAttemptsRef.current,
          distractionEvents: warningCountRef.current + tabSwitchesRef.current,
          status: 'completed',
        });
      } catch (err) {
        console.error('[FocusTimer] Failed to end session:', err);
      } finally {
        setIsSaving(false);
      }
    }

    setIsCompleted(true);
    setSessionId(null);
    setActiveWarning(null);
    setIsCameraEnabled(false);
  }, [targetDurationSeconds]);

  // ── Start session ─────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!token || !user) {
      setSessionError('You must be logged in to start a focus session.');
      return;
    }
    if (!Number.isInteger(targetDurationSeconds) || targetDurationSeconds < 60) {
      setDurationError('Select a duration of at least 1 minute.');
      return;
    }

    setSessionError(null);
    setIsSaving(true);

    try {
      const response = await api.startSession(token, 'Study Focus Session');
      if (!response.success || !response.session?._id) {
        setSessionError('Could not start session. Please check your connection.');
        setIsSaving(false);
        return;
      }

      const newSessionId = response.session._id;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;

      const endTimestamp = Date.now() + targetDurationSeconds * 1000;
      localStorage.setItem('focusflow_lock_ends_at', String(endTimestamp));
      localStorage.setItem('focusflow_active_session_id', newSessionId);

      // Tell the extension about this session
      if (chromeExt()?.storage?.local) {
        chromeExt()?.storage?.local.set({
          sessionActive: true,
          tabLockActive: false,
          authToken: token,
          userId: user.id,
          currentSessionId: newSessionId,
          tabSwitchCount: 0,
          idleTimeSeconds: 0,
          warningCount: 0,
          blockedAttempts: 0,
        });
        // Store tab ID for snap-back
        if (typeof chromeExt()?.tabs !== 'undefined') {
          chromeExt()?.tabs.getCurrent?.((tab: { id?: number } | undefined) => {
            if (tab?.id) chromeExt()?.storage?.local.set({ focusFlowTabId: tab.id });
          });
        }
      }

      setIsActive(true);
      setIsCompleted(false);
      setTabSwitches(0);
      setIdleSeconds(0);
      setCameraDistractions(0);
      setWarningCount(0);
      setBlockedAttempts(0);
      setCurrentScore(100);
      setScoreHistory([]);
      scoreHistoryRef.current = [];
      tabSwitchesRef.current = 0;
      idleSecondsRef.current = 0;
      cameraDistractionsRef.current = 0;
      warningCountRef.current = 0;
      blockedAttemptsRef.current = 0;
      setActiveWarning(null);
      setTabLockActive(false);
      setSecondsRemaining(targetDurationSeconds);
    } catch {
      setSessionError('Failed to connect to the server. Please ensure the backend is running.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── End session early ─────────────────────────────────────────────────────────
  const handleEndEarly = async () => {
    if (!isActive) return;
    const elapsed = targetDurationSeconds - secondsRemaining;
    const scores = scoreHistoryRef.current;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

    setIsActive(false);
    setTabLockActive(false);
    localStorage.removeItem('focusflow_lock_ends_at');
    localStorage.removeItem('focusflow_active_session_id');

    if (chromeExt()?.storage?.local) {
      chromeExt()?.storage?.local.set({ sessionActive: false, tabLockActive: false });
    }

    if (sessionIdRef.current && tokenRef.current) {
      setIsSaving(true);
      try {
        await api.endSession(tokenRef.current, {
          sessionId: sessionIdRef.current,
          durationSeconds: elapsed,
          avgFocusScore: avgScore,
          tabSwitches: tabSwitchesRef.current,
          idleTimeSeconds: idleSecondsRef.current,
          cameraDistractions: cameraDistractionsRef.current,
          warningCount: warningCountRef.current,
          blockedAttempts: blockedAttemptsRef.current,
          distractionEvents: warningCountRef.current + tabSwitchesRef.current,
          status: 'cancelled',
        });
      } catch {
        // ignore
      } finally {
        setIsSaving(false);
      }
    }

    setSessionId(null);
    setActiveWarning(null);
    setIsCameraEnabled(false);
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

  const avgScore = scoreHistory.length > 0
    ? Math.round(scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length)
    : currentScore;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">

      {/* ── Completion Banner ── */}
      {isCompleted && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-xl p-4 flex items-start gap-3 text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Session Complete! </span>
            Your {Math.floor(targetDurationSeconds / 60)}-minute focus session has been saved.
            Average score: <strong className="text-emerald-300">{avgScore}/100</strong>.
            Tab lock has been released.
          </div>
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
        <div className="bg-rose-950/90 border border-rose-500/50 rounded-xl p-3 flex items-center gap-3 text-rose-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          {sessionError}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Focus Score Gauge */}
        <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
          <FocusScoreGauge
            score={currentScore}
            size={190}
            strokeWidth={16}
            label={isActive ? 'Live Focus Score' : 'Focus Score'}
          />
          {isActive && (
            <div className="mt-3 text-xs text-center font-mono text-cyan-300">
              {formatTime(secondsRemaining)} remaining
            </div>
          )}
        </div>

        {/* Timer Controls */}
        <div className="space-y-4 flex flex-col justify-between">
          <div>
            {/* Status label */}
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
              <Radio className={`w-4 h-4 ${isActive ? 'animate-pulse text-emerald-400' : 'text-gray-400'}`} />
              <span>
                {isActive
                  ? tabLockActive ? 'Tab Lock Active' : 'Session Running'
                  : isCompleted ? 'Session Complete' : 'Ready to Start'}
              </span>
            </div>

            {/* Duration selector — only before start */}
            {!isActive && !isCompleted && (
              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-400" /> Target Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTargetDurationSeconds(opt.value); setSecondsRemaining(opt.value); }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        targetDurationSeconds === opt.value
                          ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-600/30'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
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
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-violet-400"
                  />
                  <button type="button" onClick={applyCustomDuration} className="rounded-xl border border-violet-500/40 px-3 text-xs text-violet-200">
                    Set
                  </button>
                </div>
                {durationError && <p className="text-xs text-rose-300">{durationError}</p>}
              </div>
            )}

            {/* Timer display */}
            <div className="text-5xl font-extrabold text-white font-mono tracking-tight my-2">
              {formatTime(secondsRemaining)}
            </div>

            {/* Lock badge */}
            <div className="flex items-center gap-2 text-xs text-gray-300 mt-2">
              {isActive && tabLockActive ? (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Tab Lock Active
                </span>
              ) : isActive ? (
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> Monitoring
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5" /> Ready
                </span>
              )}

              {/* Extension indicator */}
              <span className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 border text-[10px] ${
                extensionConnected
                  ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                  : 'bg-white/5 text-gray-500 border-white/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${extensionConnected ? 'bg-violet-400' : 'bg-gray-500'}`} />
                {extensionConnected ? 'Extension Connected' : 'Extension Disconnected'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isActive ? (
              <button
                onClick={handleStart}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting…</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Start {Math.floor(targetDurationSeconds / 60)}-Min Session</>
                )}
              </button>
            ) : (
              <button
                onClick={handleEndEarly}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 font-bold text-sm hover:bg-rose-500/20 transition-all disabled:opacity-60"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-rose-300/30 border-t-rose-300 rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><Square className="w-4 h-4" /> End Session Early</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Camera Tracker */}
        <div>
          <CameraTracker
            isEnabled={isCameraEnabled}
            onToggle={setIsCameraEnabled}
            onDistractionDetected={handleCameraDistraction}
            isActiveSession={isActive}
          />
        </div>
      </div>

      {/* ── Metrics strip ── */}
      <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="text-gray-400 mb-1 flex items-center justify-between">
            <span>Tab Switches</span>
            <Lock className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className={`text-lg font-bold font-mono ${tabSwitches > 0 ? 'text-rose-400' : 'text-white'}`}>
            {tabSwitches}
          </div>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="text-gray-400 mb-1 flex items-center justify-between">
            <span>Camera Events</span>
            <Video className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400">{cameraDistractions}</div>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="text-gray-400 mb-1">Warnings</div>
          <div className={`text-lg font-bold font-mono ${warningCount >= 3 ? 'text-rose-400' : warningCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {warningCount} <span className="text-xs text-gray-500">/ 3</span>
          </div>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="text-gray-400 mb-1">Target</div>
          <div className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1">
            <Flame className="w-4 h-4" />
            {Math.floor(targetDurationSeconds / 60)}m
          </div>
        </div>
      </div>
    </div>
  );
}
