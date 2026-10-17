"use client";

/**
 * useFocusState — single source of truth for the ACTIVE focus session in the web app.
 *
 * Syncs three ways:
 *   1. REST: GET /api/focus/state on mount (page refresh / navigation)
 *   2. Socket.io: focus_state_changed / focus_event / focus_metrics (real-time)
 *   3. Extension: window events relayed by the extension's content script
 *      (browser activity panel + session start/pause/resume/end pushes)
 *
 * Exposes start / pause / resume / end helpers that keep web app, extension
 * and backend synchronized.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  getFocusState,
  startSmartFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endSmartFocusSession,
  getAuthToken,
  getApiBaseUrl,
  type FocusState,
  type LiveFocusMetricsSnapshot,
} from "@/lib/api";

// ─── Web ↔ extension bridge (window events relayed by the content script) ────
// Regular web pages cannot access chrome.storage, so the app dispatches
// window CustomEvents on localhost:3000; the extension's content.js relays
// them to the service worker, which owns chrome.storage state.

const EXT_SITE_EVENT = "FOCUSFLOW_CURRENT_SITE";
const EXT_HELLO_EVENT = "FOCUSFLOW_EXTENSION_HELLO";

export interface CurrentSiteInfo {
  domain: string;
  title?: string;
  category: "productive" | "possibly_productive" | "distracting";
  reason: string;
  timestamp: number;
}

export interface SiteActivityEntry {
  domain: string;
  classification: string;
  action: string;
  timestamp: number;
}

export interface FocusScoreUpdate {
  sessionId: string | null;
  score: number | null;
  hasTelemetry: boolean;
  isDistracted: boolean;
  alertMessage: string | null;
  metrics: LiveFocusMetricsSnapshot | null;
  timestamp: number;
}

export interface UseFocusStateResult {
  focusState: FocusState | null;
  isLoading: boolean;
  error: string | null;
  remainingSeconds: number | null;
  currentSite: CurrentSiteInfo | null;
  activityLog: SiteActivityEntry[];
  extensionConnected: boolean;
  liveMetrics: FocusScoreUpdate | null;
  start: (payload: {
    taskTitle: string;
    taskId?: string;
    subject?: string;
    durationSeconds: number;
    strictness: "balanced" | "strict" | "custom";
    mode?: "smart" | "single_site" | "strict_lock";
    primarySite?: string;
    browserProtection?: boolean;
    allowedSites?: string[];
    blockedSites?: string[];
    warningSites?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  end: (summary?: Record<string, unknown>) => Promise<{ session?: { avgFocusScore?: number | null; finalFocusScore?: number | null }; metrics?: Record<string, unknown> } | undefined>;
  refresh: () => Promise<void>;
}

export function useFocusState(): UseFocusStateResult {
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [currentSite, setCurrentSite] = useState<CurrentSiteInfo | null>(null);
  const [activityLog, setActivityLog] = useState<SiteActivityEntry[]>([]);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<FocusScoreUpdate | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const extensionSessionIdRef = useRef<string | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const response = await getFocusState();
        if (response.success) {
          setFocusState(response.state);
        }
      } catch {
        // Not logged in or backend offline — state stays null.
      } finally {
        setIsLoading(false);
      }
    };

    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!focusState?.active) {
      extensionSessionIdRef.current = null;
      return;
    }
    if (!extensionConnected || extensionSessionIdRef.current === focusState.sessionId) return;
    syncExtensionStart(focusState, focusState, getAuthToken());
    extensionSessionIdRef.current = focusState.sessionId;
  }, [extensionConnected, focusState]);

  // ── Extension presence + current site (content script bridge) ───────────
  useEffect(() => {
    const w = window as unknown as { __focusflowExtension?: boolean };
    if (w.__focusflowExtension || document.documentElement.dataset.focusflowExtension === "true") {
      // Extension content script already announced itself before we subscribed.
      queueMicrotask(() => setExtensionConnected(true));
    }

    const onHello = () => setExtensionConnected(true);
    window.addEventListener(EXT_HELLO_EVENT, onHello);

    const onSiteUpdate = (event: Event) => {
      const raw = (event as CustomEvent<string>).detail;
      try {
        const site = typeof raw === "string" ? JSON.parse(raw) : raw;
        setCurrentSite(site || null);
      } catch {
        // Malformed relay payload — ignore.
      }
    };
    window.addEventListener(EXT_SITE_EVENT, onSiteUpdate);

    return () => {
      window.removeEventListener(EXT_HELLO_EVENT, onHello);
      window.removeEventListener(EXT_SITE_EVENT, onSiteUpdate);
    };
  }, []);

  // ── Socket.io real-time sync ─────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socket = io(getApiBaseUrl(), { auth: { token } });
    socketRef.current = socket;

    socket.on("focus_state_changed", (payload: { state: FocusState | null }) => {
      setFocusState(payload.state);
    });

    socket.on("focus_event", (payload: SiteActivityEntry) => {
      setActivityLog((prev) => [payload, ...prev].slice(0, 12));
    });

    socket.on("focus_metrics", (payload: Partial<LiveFocusMetricsSnapshot> & { sessionId?: string }) => {
      setFocusState((prev) =>
        prev
          ? {
              ...prev,
              blockedAttempts: payload.blockedAttempts ?? prev.blockedAttempts,
              warningCount: payload.warningCount ?? prev.warningCount,
              tabSwitches: payload.tabSwitches ?? prev.tabSwitches,
            }
          : prev
      );
      setLiveMetrics((prev) => ({
        sessionId: payload.sessionId ?? prev?.sessionId ?? null,
        score: payload.focusScore ?? null,
        hasTelemetry: payload.hasTelemetry ?? prev?.hasTelemetry ?? false,
        isDistracted: payload.isDistracted ?? false,
        alertMessage: payload.alertMessage ?? null,
        metrics: (payload as LiveFocusMetricsSnapshot) ?? prev?.metrics ?? null,
        timestamp: Date.now(),
      }));
    });

    socket.on("focus_score_update", (payload: FocusScoreUpdate) => {
      setLiveMetrics(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Countdown (interval-driven; no setState in the effect body) ─────────
  const countdownActive = Boolean(focusState?.active && focusState.endsAt && !focusState.paused);
  const countdownEndsAt = focusState?.endsAt ?? 0;

  useEffect(() => {
    if (!countdownActive || !countdownEndsAt) {
      const id = window.setTimeout(() => setRemainingSeconds(null), 0);
      return () => window.clearTimeout(id);
    }

    const endsAt = countdownEndsAt;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        // Session expired — refresh so backend expiry propagation kicks in.
        void refreshRef.current();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [countdownActive, countdownEndsAt]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const start = useCallback(
    async (payload: Parameters<UseFocusStateResult["start"]>[0]) => {
      setError(null);
      try {
        const response = await startSmartFocusSession(payload);
        if (response.success && response.state) {
          setFocusState(response.state);
          return { success: true };
        }
        return { success: false, error: response.message || "Could not start the focus session." };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start focus session.";
        setError(message);
        return { success: false, error: message };
      }
    },
    []
  );

  const pause = useCallback(async () => {
    try {
      const response = await pauseFocusSession();
      if (response.success && response.state) {
        setFocusState(response.state);
        syncExtensionPaused(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause session.");
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      const response = await resumeFocusSession();
      if (response.success && response.state) {
        setFocusState(response.state);
        syncExtensionPaused(false, response.state.endsAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume session.");
    }
  }, []);

  const end = useCallback(async (summary: Record<string, unknown> = {}) => {
    try {
      const response = await endSmartFocusSession(summary);
      setFocusState(null);
      extensionSessionIdRef.current = null;
      clearExtensionSession();
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session.");
      return undefined;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await getFocusState();
      setFocusState(response.state);
    } catch {
      // keep current state on transient failures
    }
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  return {
    focusState,
    isLoading,
    error,
    remainingSeconds,
    currentSite,
    activityLog,
    extensionConnected,
    liveMetrics,
    start,
    pause,
    resume,
    end,
    refresh,
  };
}

// ─── Extension sync helpers ──────────────────────────────────────────────────
// The installed content script relays these page events to the service worker.
function sendExtensionCommand(command: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("FOCUSFLOW_EXTENSION_COMMAND", { detail: command }));
}

function syncExtensionStart(
  state: FocusState,
  payload: Pick<FocusState, "allowedSites" | "blockedSites" | "warningSites">,
  token: string | null,
) {
  let userIdFromStorage: string | null = null;
  if (typeof window !== "undefined") {
    try {
      userIdFromStorage = JSON.parse(localStorage.getItem("focusflow_user") || "{}").id || null;
    } catch {
      userIdFromStorage = null;
    }
  }

  sendExtensionCommand({
    type: "START",
    token,
    userId: state.userId || userIdFromStorage,
    session: {
      sessionId: state.sessionId,
      taskTitle: state.taskTitle,
      subject: state.subject || "",
      strictness: state.strictness,
      mode: (state as any).mode || (state.strictness === "strict" ? "strict_lock" : "smart"),
      primarySite: (state as any).primarySite || (payload.allowedSites && payload.allowedSites[0]) || "",
      browserProtection: state.browserProtection !== false,
      allowedSites: payload.allowedSites || [],
      blockedSites: payload.blockedSites || [],
      warningSites: payload.warningSites || [],
      startedAt: state.startedAt,
      endsAt: state.endsAt,
    },
  });
}

function clearExtensionSession() {
  sendExtensionCommand({ type: "CLEAR" });
}

// Keep the extension's protection state in sync when the web app pauses or
// resumes the session (the extension reacts to chrome.storage changes).
function syncExtensionPaused(paused: boolean, endsAt?: number) {
  sendExtensionCommand({ type: "PAUSE", paused, endsAt });
}
