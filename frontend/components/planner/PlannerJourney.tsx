"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Brain, Calendar, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Copy, Edit3, Eye, FileSpreadsheet, FileText, Flag, History,
  Image as ImageIcon, Info, ListTodo, Loader2, MessageSquare, Mic, MicOff,
  Paperclip, Play, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles,
  SplitSquareHorizontal, Target, Trash2, TrendingUp, TriangleAlert, Undo2,
  Upload, Wand2, X, Zap
} from "lucide-react";

import {
  adaptiveReplanApi, applyPlanToCalendarApi, calculateGoalFeasibilityApi,
  decomposeBlockApi, fetchGoals, fetchPlanHistoryApi, generateAIPlan,
  getAIPlan, restorePlanVersionApi, saveAIPlan, simulateWhatIfApi,
  startSmartFocusSession, transcribeAudio, uploadPlannerFile,
  type ExtractedFileData, type FeasibilityResult, type GoalItem,
  type PlanHealthState, type PlanInsights, type PlanItem,
  type PlanVersionItem, type WhatIfScenario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/useEntitlements";
import { ProBadge, FreeBadge, ProLockModal } from "@/components/ui/ProLockCard";

/* ============================================================
   Types & constants
============================================================ */

type Stage = "tell" | "understand" | "plan" | "review" | "approve" | "execute";

const EXAMPLE_PROMPTS = [
  "I have my Java exam in 20 days. I can study 3 hours a day, mostly in the evening. I am weak in Multithreading and Collections. Create a study schedule with practice tests.",
  "Help me finish my portfolio website this week. Need 2 hours daily for design and React frontend.",
  "I have 3 hours today. What should I focus on to make the most progress?",
  "Plan my placement interview prep around my college classes (DSA + System Design).",
];

const PLANNING_MODES = [
  { id: "balanced", label: "Balanced", desc: "Optimal distribution of focus & recovery" },
  { id: "deadline_first", label: "Deadline first", desc: "Prioritizes approaching due dates" },
  { id: "deep_work", label: "Deep work", desc: "Long uninterrupted focus blocks" },
  { id: "exam_sprint", label: "Exam sprint", desc: "High-intensity temporary push" },
  { id: "recovery", label: "Recovery", desc: "Rescues a delayed schedule, zero shame" },
] as const;

const WORK_WINDOWS = ["Morning", "Afternoon", "Evening", "Night"] as const;

const STAGES: Array<{ id: Stage; label: string; hint: string }> = [
  { id: "tell", label: "Tell", hint: "Describe what you want to accomplish" },
  { id: "understand", label: "Understand", hint: "Confirm how FocusFlow reads your goal" },
  { id: "plan", label: "Plan", hint: "AI builds a realistic schedule" },
  { id: "review", label: "Review", hint: "Edit until it is right" },
  { id: "approve", label: "Approve", hint: "Write it to your workspace" },
  { id: "execute", label: "Execute", hint: "Start focus sessions and track reality" },
];

interface CustomSettings {
  focusWindow: (typeof WORK_WINDOWS)[number];
  availableHours: number;
  focusBlockDuration: number;
  breakDuration: number;
  planningMode: string;
}

const SETTINGS_KEY = "focusflow-planner-custom-settings-v2";

const DEFAULT_SETTINGS: CustomSettings = {
  focusWindow: "Morning",
  availableHours: 4,
  focusBlockDuration: 45,
  breakDuration: 15,
  planningMode: "balanced",
};

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: "pdf" | "document" | "image" | "text";
  extractedData?: ExtractedFileData;
}

interface AttachedVoice {
  id: string;
  text: string;
  recordedAt: string;
}

/* ============================================================
   UI Helpers
============================================================ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityClasses(priority: PlanItem["priority"]): string {
  switch (priority) {
    case "Critical": return "bg-rose-500/10 text-rose-600 border-rose-500/30";
    case "High": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "Medium": return "bg-sky-500/10 text-sky-600 border-sky-500/30";
    default: return "bg-mist-500/10 text-mist-500 border-ink/10";
  }
}

function healthTone(status: PlanHealthState["status"] | undefined): string {
  switch (status) {
    case "HEALTHY": return "text-emerald-600";
    case "TIGHT": return "text-amber-600";
    case "OVERLOADED": return "text-rose-600";
    case "AT_RISK": return "text-orange-600";
    default: return "text-mist-500";
  }
}

function minutesToLabel(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/* ============================================================
   Component
============================================================ */

export default function PlannerJourney() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro, canAccess, getLimitInfo, refresh: refreshEntitlements } = useEntitlements();
  const planLimit = getLimitInfo("aiPlanGenerations");

  /* ── Entitlement Lock Modal ── */
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

  /* ── Proposed Adaptive Replan (Approval Gate) ── */
  const [proposedReplan, setProposedReplan] = useState<{
    items: PlanItem[];
    explanation: { whatChanged: string; why: string; whatIsAffected: string };
  } | null>(null);

  /* ── Stage & Composer State ── */
  const [stage, setStage] = useState<Stage>("tell");
  const [goalText, setGoalText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<AttachedVoice[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<AttachedFile | null>(null);

  /* ── Speech Recognition & Recording State ── */
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const speechRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  /* ── File Uploading & Drag State ── */
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Existing & Generated Plan State ── */
  const [existingPlan, setExistingPlan] = useState<{
    items: PlanItem[];
    insights: PlanInsights | null;
    planHealth: PlanHealthState | null;
    horizon?: string;
  } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [goals, setGoals] = useState<GoalItem[]>([]);

  /* ── Generation State ── */
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{
    items: PlanItem[];
    insights: PlanInsights;
    planHealth: PlanHealthState | null;
  } | null>(null);
  const [showingExisting, setShowingExisting] = useState(false);

  /* ── Editing State ── */
  const [items, setItems] = useState<PlanItem[]>([]);
  const [hasEdits, setHasEdits] = useState(false);
  const [undoStack, setUndoStack] = useState<PlanItem[][]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [decomposingId, setDecomposingId] = useState<string | null>(null);

  /* ── Approve & Execute State ── */
  const [applyOptions, setApplyOptions] = useState({ createTasks: true, createCalendarEvents: true });
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [startingFocusId, setStartingFocusId] = useState<string | null>(null);
  const [replanBusy, setReplanBusy] = useState(false);
  const [replanExplanation, setReplanExplanation] = useState<{ whatChanged: string; why: string; whatIsAffected: string } | null>(null);

  /* ── Panels & Drawers ── */
  const [showCustomize, setShowCustomize] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showFeasibility, setShowFeasibility] = useState(false);
  const [versions, setVersions] = useState<PlanVersionItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfScenario | null>(null);
  const [whatIfHours, setWhatIfHours] = useState(2);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [feasibilityForm, setFeasibilityForm] = useState({ goalName: "", targetDate: "", estimatedHours: 20, dailyCapacityHours: 3 });

  /* ── Settings (persisted per user in localStorage) ── */
  const [settings, setSettings] = useState<CustomSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch { /* corrupted settings fall back to defaults */ }
  }, []);
  const persistSettings = (next: CustomSettings) => {
    setSettings(next);
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  /* ── Toasts ── */
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const flash = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  /* ── Load existing plan + goals once ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [planRes, goalsRes] = await Promise.allSettled([getAIPlan(), fetchGoals()]);
        if (cancelled) return;
        if (planRes.status === "fulfilled" && planRes.value.success && planRes.value.plan) {
          const p = planRes.value.plan;
          setExistingPlan({
            items: p.items || [],
            insights: p.insights || null,
            planHealth: p.planHealth || null,
            horizon: p.horizon,
          });
          setWhatIfHours(Math.max(0.5, Math.round((p.insights?.availableHours ?? 4) * 2) / 2));
        }
        if (goalsRes.status === "fulfilled" && goalsRes.value.success) {
          setGoals(goalsRes.value.goals || []);
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Cleanup speech & media on unmount ── */
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    };
  }, []);

  /* ── Derived plan-state helpers ── */
  const currentItems = showingExisting && existingPlan ? existingPlan.items : items;
  const currentInsights = showingExisting && existingPlan ? existingPlan.insights : (generated?.insights ?? null);
  const currentHealth = showingExisting && existingPlan ? existingPlan.planHealth : (generated?.planHealth ?? null);
  const totalFocusMinutes = currentItems.filter((i) => i.type !== "break").reduce((s, i) => s + i.durationMinutes, 0);
  const breaks = currentItems.filter((i) => i.type === "break");
  const focusBlocks = currentItems.filter((i) => i.type !== "break");
  const nextFocusBlock = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return currentItems
      .filter((i) => i.type !== "break" && i.status !== "completed" && i.status !== "skipped")
      .map((i) => {
        const m = /^(\d{1,2}):(\d{2})/.exec(i.time);
        return { item: i, startMins: m ? Number(m[1]) * 60 + Number(m[2]) : -1 };
      })
      .filter((x) => x.startMins >= nowMins - 30)
      .sort((a, b) => a.startMins - b.startMins)[0]?.item ?? null;
  }, [currentItems]);

  const pushUndo = useCallback((snapshot: PlanItem[]) => {
    setUndoStack((s) => [...s.slice(-9), snapshot]);
  }, []);

  const mutateItems = useCallback((updater: (prev: PlanItem[]) => PlanItem[]) => {
    setItems((prev) => {
      pushUndo(prev);
      return updater(prev);
    });
    setHasEdits(true);
  }, [pushUndo]);

  /* ── Combined Intent Computation (Text + Voice + Attached Files) ── */
  const combinedIntent = useMemo(() => {
    const parts: string[] = [];
    if (goalText.trim()) {
      parts.push(goalText.trim());
    }
    if (voiceNotes.length > 0) {
      parts.push(voiceNotes.map((v) => `Voice instruction: ${v.text}`).join("\n"));
    }
    if (attachments.length > 0) {
      parts.push(
        attachments.map((a) => {
          let desc = `[Attachment: ${a.name}]`;
          if (a.extractedData?.text) desc += `\nExtracted text: ${String(a.extractedData.text).slice(0, 800)}`;
          if (a.extractedData?.topics?.length) desc += `\nTopics: ${a.extractedData.topics.join(", ")}`;
          if (a.extractedData?.deadlines?.length) desc += `\nDeadlines: ${a.extractedData.deadlines.join(", ")}`;
          if (a.extractedData?.deliverables?.length) desc += `\nDeliverables: ${a.extractedData.deliverables.join(", ")}`;
          return desc;
        }).join("\n\n")
      );
    }
    return parts.join("\n\n").trim();
  }, [goalText, voiceNotes, attachments]);

  /* ============================================================
     SPEECH-TO-TEXT & AUDIO TRANSCRIPTION (Real Web Speech + Gemini)
  ============================================================ */

  const toggleSpeechRecognition = async () => {
    if (!canAccess("multimodal_planning")) {
      setLockModal({
        isOpen: true,
        title: "Voice-Powered Multimodal Planning",
        description: "Speak your goals naturally. FocusFlow captures voice input, transcribes speech with Gemini, and schedules actionable focus blocks.",
        featureName: "Multimodal Planning — Pro",
        bulletPoints: [
          "Real-time voice capture & high-accuracy AI transcription",
          "Automatic extraction of priorities, deadlines, and study hours",
          "Hands-free schedule structuring powered by Gemini",
        ],
      });
      return;
    }

    // If currently listening or recording, stop
    if (isListening) {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      }
      setIsListening(false);
      setLiveInterimTranscript("");
      return;
    }

    if (isRecordingAudio) {
      stopAudioRecording();
      return;
    }

    // Check if Web Speech API is supported
    const win = typeof window !== "undefined" ? (window as any) : null;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        speechRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          setLiveInterimTranscript("");
        };

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (final.trim()) {
            setGoalText((prev) => (prev ? prev.trim() + " " + final.trim() : final.trim()));
          }
          setLiveInterimTranscript(interim);
        };

        recognition.onerror = (e: any) => {
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            flash("Microphone access was denied. Please allow microphone permissions in browser settings.");
          } else if (e.error !== "no-speech") {
            // Fallback to media recorder
            startAudioRecordingFallback();
            return;
          }
          setIsListening(false);
          setLiveInterimTranscript("");
        };

        recognition.onend = () => {
          setIsListening(false);
          setLiveInterimTranscript("");
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("Web Speech API init failed, using backend transcription fallback", err);
      }
    }

    // Fallback: MediaRecorder + Gemini Backend
    startAudioRecordingFallback();
  };

  const startAudioRecordingFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      flash("Microphone recording is not supported in this browser context.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
        setIsRecordingAudio(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 500) return; // Too short/empty

        setIsTranscribing(true);
        try {
          const res = await transcribeAudio(audioBlob);
          if (res.transcription && res.transcription.trim()) {
            const transcript = res.transcription.trim();
            setVoiceNotes((prev) => [
              ...prev,
              {
                id: `voice_${Date.now()}`,
                text: transcript,
                recordedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            flash("Voice transcription added to your plan input.");
          } else {
            flash("No speech detected in audio recording.");
          }
        } catch (err) {
          flash(err instanceof Error ? err.message : "Voice transcription failed.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      flash("Microphone access was denied. Please allow microphone permissions in browser settings.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
  };

  /* ============================================================
     FILE UPLOAD (PDF, DOCX, TXT, CSV, Images with Gemini OCR)
  ============================================================ */

  const triggerFileUpload = () => {
    if (!canAccess("multimodal_planning")) {
      setLockModal({
        isOpen: true,
        title: "Document & Syllabus AI Ingestion",
        description: "Upload PDFs, DOCX, TXT, CSV, or images of your syllabus, assignment sheets, or study outlines. FocusFlow extracts topics, modules, and due dates directly into your plan.",
        featureName: "Multimodal Planning — Pro",
        bulletPoints: [
          "Native parsing for PDF, DOCX, CSV, TXT & image files",
          "Gemini OCR & structured study syllabus extraction",
          "Direct synthesis into actionable daily milestones",
        ],
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!canAccess("multimodal_planning")) {
      triggerFileUpload();
      return;
    }

    const list = Array.from(files);
    if (!list.length) return;

    setIsUploadingFile(true);
    for (const file of list) {
      try {
        const res = await uploadPlannerFile(file);
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const type = file.type.startsWith("image/")
          ? "image"
          : ext === "pdf"
          ? "pdf"
          : ext === "docx" || ext === "doc"
          ? "document"
          : "text";

        setAttachments((prev) => [
          ...prev,
          {
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type,
            extractedData: res.extractedData,
          },
        ]);
        flash(`Successfully analyzed ${file.name}`);
      } catch (err) {
        flash(err instanceof Error ? err.message : `Failed to process ${file.name}`);
      }
    }
    setIsUploadingFile(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const removeVoiceNote = (id: string) => {
    setVoiceNotes((prev) => prev.filter((v) => v.id !== id));
  };

  /* ============================================================
     PLAN GENERATION (real Gemini via /api/planner/generate)
  ============================================================ */
  const runGeneration = useCallback(async (intentText: string) => {
    setIsGenerating(true);
    setGenerateError(null);
    setShowingExisting(false);

    try {
      const inputsPayload = [
        ...(goalText.trim() ? [{ type: "text" as const, content: goalText.trim() }] : []),
        ...voiceNotes.map((v) => ({ type: "voice" as const, content: v.text, transcription: v.text })),
        ...attachments.map((a) => ({
          type: a.type as "pdf" | "document" | "image" | "text",
          content: a.name,
          extractedData: a.extractedData,
        })),
      ];

      const response = await generateAIPlan({
        prompt: intentText.slice(0, 3000),
        horizon: "today",
        workingTimePreference: settings.focusWindow,
        availableHours: settings.availableHours,
        focusBlockDuration: settings.focusBlockDuration,
        breakDuration: settings.breakDuration,
        planningMode: settings.planningMode,
        persona: "General",
        ...(inputsPayload.length > 0 ? { inputs: inputsPayload } as any : {}),
      });

      if (!response.success || !response.plan) {
        if ((response as any).code === "DAILY_LIMIT_REACHED" || (response as any).errorCode === "DAILY_LIMIT_REACHED" || response.message?.includes("Daily AI planning limit")) {
          setLockModal({
            isOpen: true,
            title: "Daily AI Planning Limit Reached",
            description: isPro
              ? "You have reached your 200 daily AI plan limit. Your allowance resets at midnight UTC."
              : "You have used all 5 free AI planning sessions for today. Upgrade to FocusFlow Pro to unlock 200 daily AI plans, voice inputs, and document ingestion.",
            featureName: isPro ? "Usage Limit" : "Upgrade to Pro",
            bulletPoints: [
              "200 daily AI plan generations with real contextual models",
              "Adaptive replanning and what-if simulation",
              "Multimodal voice transcription and PDF/DOCX ingestion",
            ],
          });
        }
        setGenerateError(response.message || "Plan generation failed. Please try again.");
        return;
      }
      setGenerated({
        items: response.plan.items || [],
        insights: response.plan.insights,
        planHealth: response.plan.planHealth ?? null,
      });
      setItems(response.plan.items || []);
      setHasEdits(false);
      setUndoStack([]);
      setStage("plan");
      refreshEntitlements();
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Could not reach the AI planner.");
    } finally {
      setIsGenerating(false);
    }
  }, [goalText, voiceNotes, attachments, settings, isPro, refreshEntitlements]);

  /* ============================================================
     ITEM EDITING (local until Approve & Save)
  ============================================================ */
  const updateItem = (id: string, patch: Partial<PlanItem>) => mutateItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const deleteItem = (id: string) => mutateItems((prev) => prev.filter((i) => i.id !== id));
  const duplicateItem = (id: string) => mutateItems((prev) => {
    const index = prev.findIndex((i) => i.id === id);
    if (index === -1) return prev;
    const copy = { ...prev[index], id: `copy_${Date.now()}_${index}`, status: "planned" as const };
    return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
  });
  const addItem = () => mutateItems((prev) => {
    const last = prev[prev.length - 1];
    const startMins = last ? (Number(last.time.slice(0, 2)) * 60 + Number(last.time.slice(3, 5)) + last.durationMinutes) : 9 * 60;
    const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return [...prev, {
      id: `new_${Date.now()}`, title: "New focus block", time: `${fmt(startMins)} - ${fmt(startMins + 45)}`,
      durationMinutes: 45, type: "focus_block", priority: "Medium", why: "Added manually during review.", linkedGoal: "", status: "planned",
    }];
  });
  const moveItem = (id: string, dir: -1 | 1) => mutateItems((prev) => {
    const index = prev.findIndex((i) => i.id === id);
    const target = index + dir;
    if (index === -1 || target < 0 || target >= prev.length) return prev;
    const next = [...prev];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const undo = () => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      setItems(stack[stack.length - 1]);
      return stack.slice(0, -1);
    });
  };

  /** Re-sequence all item times from the first block's start so edits stay valid. */
  const resequenceTimes = useCallback((list: PlanItem[]): PlanItem[] => {
    const first = /^(\d{1,2}):(\d{2})/.exec(list[0]?.time ?? "");
    let cursor = first ? Number(first[1]) * 60 + Number(first[2]) : 9 * 60;
    const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return list.map((item) => {
      const time = `${fmt(cursor)} - ${fmt(cursor + item.durationMinutes)}`;
      cursor += item.durationMinutes;
      return { ...item, time };
    });
  }, []);

  /* ============================================================
     SAVE + APPLY (approval gate -> real DB writes)
  ============================================================ */
  const activeItems = showingExisting && existingPlan ? existingPlan.items : items;

  const savePlan = async (): Promise<boolean> => {
    const list = resequenceTimes(activeItems);
    if (!list.length) { flash("Nothing to save — the plan is empty."); return false; }
    try {
      const res = await saveAIPlan({
        items: list,
        insights: {
          ...(currentInsights ?? {}),
          availableHours: settings.availableHours,
          targetDate: currentInsights?.targetDate,
        } as PlanInsights,
        prompt: goalText || currentInsights?.summary || "",
        planType: "daily",
        persona: "General",
        planningMode: settings.planningMode,
        horizon: "today",
      });
      if (!res.success) { flash(res.message || "Save failed."); return false; }
      flash(`Plan saved — ${res.message?.match(/version (\d+)/)?.[1] ? `version ${res.message.match(/version (\d+)/)![1]}` : "done"}.`);
      setHasEdits(false);
      return true;
    } catch (error) {
      flash(error instanceof Error ? error.message : "Save failed.");
      return false;
    }
  };

  const approveAndApply = async () => {
    setIsApplying(true);
    try {
      const list = resequenceTimes(activeItems);
      const saved = await saveAIPlan({
        items: list,
        insights: {
          ...(currentInsights ?? {}),
          availableHours: settings.availableHours,
          targetDate: currentInsights?.targetDate,
        } as PlanInsights,
        prompt: goalText || currentInsights?.summary || "",
        planType: "daily",
        persona: "General",
        planningMode: settings.planningMode,
        horizon: "today",
      });
      if (!saved.success) throw new Error(saved.message || "Failed to persist plan before approval.");

      const res = await applyPlanToCalendarApi({
        items: list,
        planDate: currentInsights?.targetDate,
      });
      if (!res.success) throw new Error(res.message || "Failed to apply plan to workspace.");

      setApplyResult(res.message);
      setHasEdits(false);
      setStage("execute");
      flash(`Plan applied — ${res.events.length} block(s) scheduled in your workspace.`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Failed to apply plan.");
    } finally {
      setIsApplying(false);
    }
  };

  /* ============================================================
     EXECUTE: START REAL SMART FOCUS SESSION
  ============================================================ */
  const startFocusForItem = async (item: PlanItem) => {
    setStartingFocusId(item.id);
    try {
      const res = await startSmartFocusSession({
        taskTitle: item.title,
        taskId: item.taskId,
        subject: item.linkedGoal || item.title,
        durationSeconds: Math.max(60, item.durationMinutes * 60),
        strictness: "balanced",
        browserProtection: true,
      });
      if (!res.success) {
        flash(res.message || "Could not start focus session.");
        return;
      }
      flash(`Focus session started for "${item.title}".`);
      router.push("/dashboard/sessions");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not start focus session.");
    } finally {
      setStartingFocusId(null);
    }
  };

  /* ============================================================
     ADAPTIVE REPLANNING & SIMULATION (Pro Feature)
  ============================================================ */
  const runReplan = async (trigger: "finished_early" | "finished_late" | "reschedule", deltaMinutes = 30) => {
    if (!canAccess("adaptive_replan")) {
      setLockModal({
        isOpen: true,
        title: "Adaptive Replanning System",
        description: "Automatically recalculates remaining tasks when you finish early, run late, or reschedule, without ever overwriting your plan without confirmation.",
        featureName: "Adaptive Replanning — Pro",
        bulletPoints: [
          "Automatic schedule readjustment for delays and early completions",
          "Clear explanation: what changed, why, and affected tasks",
          "Approval workflow: propose changes before updating your workspace",
        ],
      });
      return;
    }

    setReplanBusy(true);
    try {
      const res = await adaptiveReplanApi({
        trigger,
        deltaMinutes,
        currentItems: activeItems,
        commit: false, // Propose without overwriting until approved!
      });
      if (res.success && res.items.length) {
        setProposedReplan({
          items: res.items,
          explanation: res.explanation,
        });
        flash(`Proposed schedule adjustment ready for your review.`);
      } else {
        flash(res.message || "Adaptive replanning could not adjust the schedule.");
      }
    } catch (error) {
      flash(error instanceof Error ? error.message : "Replan failed.");
    } finally {
      setReplanBusy(false);
    }
  };

  const approveReplan = async () => {
    if (!proposedReplan) return;
    const { items: newItems, explanation } = proposedReplan;
    mutateItems(() => newItems);
    setReplanExplanation(explanation);
    flash(`Schedule adapted: ${explanation.whatChanged}`);
    setProposedReplan(null);
    // Persist adapted schedule
    await savePlan();
  };

  const discardReplan = () => {
    setProposedReplan(null);
    flash("Proposed replan discarded. Original schedule preserved.");
  };

  const openHistory = async () => {
    if (!canAccess("plan_history")) {
      setLockModal({
        isOpen: true,
        title: "Plan Version History & Restoration",
        description: "Browse historical revisions of your schedule, compare what changed, and safely restore any previous version with one click.",
        featureName: "Plan History — Pro",
        bulletPoints: [
          "Complete version archive for every saved and approved plan",
          "Track how your schedule adapted over time",
          "One-click version rollback with instant workspace sync",
        ],
      });
      return;
    }

    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await fetchPlanHistoryApi();
      setVersions(res.success ? res.versions : []);
    } catch {
      setVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const restoreVersion = async (versionNumber: number) => {
    try {
      const res = await restorePlanVersionApi(versionNumber);
      if (res.success && res.items.length) {
        setItems(res.items);
        setGenerated({ items: res.items, insights: res.insights, planHealth: null });
        setShowingExisting(false);
        setShowHistory(false);
        setHasEdits(false);
        flash(`Restored version ${versionNumber}.`);
      }
    } catch {
      flash("Failed to restore version.");
    }
  };

  const openWhatIf = () => {
    if (!canAccess("what_if_simulation")) {
      setLockModal({
        isOpen: true,
        title: "What-If Scenario Simulation",
        description: "Simulate schedule changes such as fewer study hours, different deadlines, or missed weekends without modifying your live plan until approved.",
        featureName: "What-If Scenarios — Pro",
        bulletPoints: [
          "Stress-test your schedule against reduced capacity",
          "Instantly see which blocks would be completed vs deferred",
          "Zero modifications saved until you explicitly approve",
        ],
      });
      return;
    }
    setShowWhatIf(true);
  };

  const runWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const res = await simulateWhatIfApi({
        scenarioType: "reduced_time",
        availableMinutes: Math.round(whatIfHours * 60),
        currentItems: activeItems,
      });
      setWhatIfResult(res.success ? res.scenario : null);
    } catch {
      setWhatIfResult(null);
      flash("What-if simulation failed.");
    } finally {
      setWhatIfLoading(false);
    }
  };

  const runFeasibility = async () => {
    if (!feasibilityForm.targetDate) { flash("Pick a target date for the feasibility check."); return; }
    setFeasibilityLoading(true);
    try {
      const res = await calculateGoalFeasibilityApi(feasibilityForm);
      setFeasibility(res.success ? res.feasibility : null);
    } catch {
      setFeasibility(null);
      flash("Feasibility calculation failed.");
    } finally {
      setFeasibilityLoading(false);
    }
  };

  /* ============================================================
     BLOCK DECOMPOSITION (Pro Feature)
  ============================================================ */
  const decomposeBlock = async (item: PlanItem) => {
    if (!canAccess("task_decomposition")) {
      setLockModal({
        isOpen: true,
        title: "AI Task Decomposition",
        description: "Break complex multi-hour study blocks into bite-sized, sequential subtasks with realistic durations and dependencies.",
        featureName: "AI Task Decomposition — Pro",
        bulletPoints: [
          "Deconstruct complex topics into 15–20 minute subtasks",
          "Realistic duration and dependency sequencing",
          "Interactive subtask checklists in focus sessions",
        ],
      });
      return;
    }

    setDecomposingId(item.id);
    try {
      const res = await decomposeBlockApi({ blockTitle: item.title, durationMinutes: item.durationMinutes, context: item.linkedGoal || "" });
      if (res.success && res.subtasks.length) {
        updateItem(item.id, { subtasks: res.subtasks });
        flash("Actionable sub-steps added to block.");
      } else flash("Could not break down this block.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not break down this block.");
    } finally {
      setDecomposingId(null);
    }
  };

  const markSubtask = (itemId: string, subId: string) => {
    const list = showingExisting && existingPlan ? existingPlan.items : items;
    const item = list.find((i) => i.id === itemId);
    if (!item?.subtasks) return;
    const next = item.subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s));
    if (showingExisting && existingPlan) {
      setExistingPlan({ ...existingPlan, items: existingPlan.items.map((i) => (i.id === itemId ? { ...i, subtasks: next } : i)) });
    } else {
      updateItem(itemId, { subtasks: next });
    }
  };

  /* ============================================================
     STAGE RAIL NAVIGATION
  ============================================================ */
  const visibleStages: Stage[] = ["tell", "understand", "plan", "review", "approve", "execute"];
  const stageIndex = visibleStages.indexOf(stage === "approve" ? "review" : stage);

  const renderStageRail = () => (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#262832] bg-[#12131A] p-1.5 backdrop-blur-xl shadow-sm">
      {visibleStages.map((s, idx) => {
        const reached = idx <= stageIndex;
        const active = s === stage || (stage === "approve" && s === "review");
        return (
          <React.Fragment key={s}>
            {idx > 0 && <span className="h-px w-3 bg-white/10" aria-hidden />}
            <button
              type="button"
              onClick={() => {
                if (s === "tell") setStage("tell");
                else if (s === "understand" && combinedIntent.trim()) setStage("understand");
                else if (s === "plan" && (generated || existingPlan)) setStage("plan");
                else if (s === "review" && (generated || existingPlan)) setStage("review");
                else if (s === "approve" && (generated || existingPlan)) setStage("approve");
                else if (s === "execute" && applyResult) setStage("execute");
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                active ? "bg-[#FF4500] text-white shadow-sm shadow-[#FF4500]/30"
                : reached ? "text-[#FF4500] hover:bg-[#FF4500]/10"
                : "text-gray-500"
              }`}
            >
              {s === "approve" ? "Review" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ============================================================
     WHY FOCUSFLOW CHOSE THIS PLAN
  ============================================================ */
  const renderWhyPanel = () => {
    const insights = currentInsights;
    if (!insights) return null;
    const userData = insights.userData;
    return (
      <div className="rounded-2xl border border-tide-500/25 bg-tide-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-tide-600" aria-hidden />
          <p className="text-sm font-semibold text-ink">Why FocusFlow chose this plan</p>
        </div>
        <div className="grid gap-2 text-xs text-[#43584f] sm:grid-cols-2">
          <p><span className="font-medium text-ink">Your real context:</span>{" "}
            {userData
              ? `${userData.activeGoalsCount} active goal(s), ${userData.totalSessions} completed session(s), ${userData.avgFocusScore == null ? "no focus score yet" : `${userData.avgFocusScore}% avg focus`}, streak ${userData.streak}d.`
              : "Loaded from your saved plan."}
          </p>
          <p><span className="font-medium text-ink">Workload balance:</span>{" "}
            {minutesToLabel(totalFocusMinutes)} of focus across {focusBlocks.length} block(s) · <span className={healthTone(currentHealth?.status)}>{currentHealth?.status ?? "HEALTHY"}</span>
          </p>
        </div>
        {/* Workload Reality Check */}
        {currentHealth?.workloadFeasibility ? (
          <div className={`rounded-xl border p-3.5 space-y-2 ${
            currentHealth.workloadFeasibility.status === "OVERLOADED"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : currentHealth.workloadFeasibility.status === "TIGHT" || currentHealth.workloadFeasibility.status === "AT_RISK"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Workload Reality Check: {currentHealth.workloadFeasibility.status}
              </span>
              <span className="font-mono text-[11px]">
                {currentHealth.workloadFeasibility.totalPlannedHours}h planned / {currentHealth.workloadFeasibility.availableHours}h available
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {currentHealth.workloadFeasibility.explanation}
            </p>
            {currentHealth.workloadFeasibility.alternatives && currentHealth.workloadFeasibility.status !== "HEALTHY" && (
              <div className="pt-1.5 border-t border-[#262832] text-[11px] space-y-1">
                <span className="font-semibold uppercase tracking-wider text-[10px] opacity-80">Practical Alternatives:</span>
                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                  {currentHealth.workloadFeasibility.alternatives.map((alt, i) => (
                    <li key={i}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {(insights.aiAssumptions?.length || insights.assumptions?.length) ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">AI assumptions (explicitly labeled, not hard facts)</p>
            {(insights.aiAssumptions?.length ? insights.aiAssumptions.map((a) => a.text) : insights.assumptions ?? []).map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1.5">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" aria-hidden />
                <p className="text-[11px] text-[#43584f]">{a}</p>
              </div>
            ))}
          </div>
        ) : null}
        {currentHealth?.suggestedAction ? (
          <p className="text-xs text-[#43584f]"><span className="font-medium text-ink">Suggested next action:</span> {currentHealth.suggestedAction}</p>
        ) : null}
      </div>
    );
  };

  /* ============================================================
     RENDER PLAN LIST (Interactive Blocks)
  ============================================================ */
  const renderPlanList = (editable: boolean) => {
    const list = showingExisting && existingPlan ? existingPlan.items : items;
    if (!list.length) {
      return (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/50 p-8 text-center">
          <ListTodo className="mx-auto h-8 w-8 text-mist-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-ink">No plan yet</p>
          <p className="text-xs text-mist-500">Tell the planner what you want to accomplish to generate one.</p>
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        {list.map((item, index) => {
          const isEditing = editable && editingId === item.id;
          const subtasks = item.subtasks ?? [];
          const doneSubtasks = subtasks.filter((s) => s.completed).length;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all ${
                item.type === "break"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-ink/10 bg-white/80 hover:border-ink/20 shadow-sm"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs font-bold text-ink">{item.time}</span>
                    <span className="text-[10px] text-mist-400">{item.durationMinutes}m</span>
                  </div>
                  <div className="h-8 w-px bg-ink/10" aria-hidden />
                  <div className="flex-1 min-w-50">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityClasses(item.priority)}`}>
                        {item.type === "break" ? "Break" : item.priority}
                      </span>
                      {item.linkedGoal && (
                        <span className="rounded-md bg-tide-500/10 px-1.5 py-0.5 text-[10px] font-medium text-tide-700">
                          {item.linkedGoal}
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="w-full rounded-lg border border-ink/15 bg-white px-2.5 py-1 text-xs text-ink"
                        />
                        <div className="flex gap-2">
                          <select
                            value={item.priority}
                            onChange={(e) => updateItem(item.id, { priority: e.target.value as any })}
                            className="rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs text-ink"
                          >
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <input
                            type="number"
                            min={10}
                            max={180}
                            step={5}
                            value={item.durationMinutes}
                            onChange={(e) => updateItem(item.id, { durationMinutes: Number(e.target.value) })}
                            className="w-20 rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs text-ink"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-sm font-semibold text-ink">{item.title}</p>
                        {item.why && <p className="mt-0.5 text-xs text-[#43584f]">{item.why}</p>}
                      </>
                    )}
                  </div>
                </div>

                {/* Subtasks view */}
                {subtasks.length > 0 && !isEditing && (
                  <div className="w-full border-t border-ink/5 pt-2 pl-12 pr-2">
                    <p className="text-[11px] font-semibold text-mist-500 mb-1">
                      Action Steps ({doneSubtasks}/{subtasks.length})
                    </p>
                    <div className="space-y-1">
                      {subtasks.map((st) => (
                        <label key={st.id} className="flex items-center gap-2 text-xs text-ink cursor-pointer hover:text-tide-700">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => markSubtask(item.id, st.id)}
                            className="h-3.5 w-3.5 rounded border-ink/20 accent-tide-600"
                          />
                          <span className={st.completed ? "line-through text-mist-400" : ""}>{st.title}</span>
                          {st.estMinutes && <span className="text-[10px] text-mist-400">({st.estMinutes}m)</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-center">
                  {editable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(isEditing ? null : item.id)}
                        className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink"
                        title="Edit block"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateItem(item.id)}
                        className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, -1)}
                        disabled={index === 0}
                        className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.id, 1)}
                        disabled={index === list.length - 1}
                        className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : null}

                  {item.type !== "break" && (
                    <button
                      type="button"
                      onClick={() => decomposeBlock(item)}
                      disabled={decomposingId === item.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink/10 bg-white px-2 py-1 text-[11px] font-semibold text-mist-600 hover:border-tide-500/40 hover:text-tide-700 disabled:opacity-50"
                    >
                      {decomposingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SplitSquareHorizontal className="h-3 w-3" />}
                      <span>Break down</span>
                      {!isPro && <ProBadge className="scale-75 origin-left" />}
                    </button>
                  )}

                  {item.type !== "break" && (
                    <button
                      type="button"
                      onClick={() => startFocusForItem(item)}
                      disabled={startingFocusId === item.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-tide-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-tide-700 disabled:opacity-50 shadow-sm"
                    >
                      {startingFocusId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Focus
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ============================================================
     ONE UNIFIED AI COMPOSER (Text + Voice + Files)
  ============================================================ */

  const tellStage = (
    <div className="space-y-6">
      {/* Active plan banner if exists */}
      {!loadingExisting && existingPlan && existingPlan.items.length > 0 && (
        <div className="rounded-2xl border border-tide-500/25 bg-tide-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">You have an active plan ({existingPlan.items.length} blocks)</p>
              <p className="text-xs text-mist-500">
                Generated {existingPlan.insights?.generatedAt ? new Date(existingPlan.insights.generatedAt).toLocaleString() : "earlier"} · {minutesToLabel(existingPlan.items.filter((i) => i.type !== "break").reduce((s, i) => s + i.durationMinutes, 0))} of focus
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowingExisting(true); setStage("execute"); }}
              className="rounded-xl bg-tide-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tide-700 shadow-sm"
            >
              Continue executing it
            </button>
          </div>
        </div>
      )}

      {/* Primary Unified AI Composer Card */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files);
        }}
        className={`relative rounded-3xl border transition-all duration-200 bg-[#12131A] backdrop-blur-xl p-6 md:p-8 shadow-2xl ${
          isDragging
            ? "border-[#FF4500] ring-4 ring-[#FF4500]/20 bg-[#FF4500]/5"
            : "border-[#262832] hover:border-white/20"
        }`}
      >
        {/* Drag overlay notice */}
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-black/80 backdrop-blur-sm border-2 border-dashed border-[#FF4500]">
            <Upload className="h-10 w-10 text-[#FF4500] animate-bounce" />
            <p className="mt-2 text-sm font-bold text-white">Drop your syllabus, notes, or image here</p>
            <p className="text-xs text-gray-400">FocusFlow will extract topics, schedule & deadlines automatically</p>
          </div>
        )}

        {/* Composer Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-white">FocusFlow AI Workspace Planner</h2>
            <p className="text-xs text-gray-400">
              Describe your goal naturally, speak with real voice-to-text, or drop in your syllabus/documents.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomize((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono font-semibold transition ${
              showCustomize
                ? "border-[#FF4500] bg-[#FF4500]/10 text-[#FF4500]"
                : "border-[#262832] bg-white/5 text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Customize Plan
            <span className="text-[10px] text-gray-500 font-normal">
              ({settings.focusWindow} · {settings.availableHours}h)
            </span>
          </button>
        </div>

        {/* Collapsible Customize Plan Tray */}
        {showCustomize && (
          <div className="mb-4 rounded-2xl border border-ink/10 bg-white/60 p-4 transition-all">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">Focus Window</label>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {WORK_WINDOWS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => persistSettings({ ...settings, focusWindow: w })}
                      className={`rounded-lg py-1 text-xs font-medium ${
                        settings.focusWindow === w
                          ? "bg-tide-600 text-white font-semibold"
                          : "border border-ink/10 bg-white text-mist-600 hover:text-ink"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">
                  Daily Hours: {settings.availableHours}h
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={settings.availableHours}
                  onChange={(e) => persistSettings({ ...settings, availableHours: Number(e.target.value) })}
                  className="mt-2 w-full accent-tide-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">
                  Block Duration: {settings.focusBlockDuration}m
                </label>
                <input
                  type="range"
                  min={15}
                  max={90}
                  step={5}
                  value={settings.focusBlockDuration}
                  onChange={(e) => persistSettings({ ...settings, focusBlockDuration: Number(e.target.value) })}
                  className="mt-2 w-full accent-tide-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">Planning Mode</label>
                <select
                  value={settings.planningMode}
                  onChange={(e) => persistSettings({ ...settings, planningMode: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-xs text-ink"
                >
                  {PLANNING_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.desc})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && combinedIntent.trim()) {
                e.preventDefault();
                runGeneration(combinedIntent);
              }
            }}
            rows={4}
            maxLength={3000}
            placeholder='e.g., "I have my Java exam in 20 days. I can study 3 hours a day, mostly in the evening. I am weak in Multithreading and Collections. Create a study schedule with practice tests."'
            className="w-full resize-none rounded-2xl border border-[#262832] bg-slate-50 p-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/20 shadow-inner"
            aria-label="Describe what you want to accomplish"
          />

          {/* Real-time speech streaming HUD */}
          {isListening && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              <span className="font-semibold">Listening:</span>
              <span className="italic">{liveInterimTranscript || "Speak naturally into your microphone..."}</span>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className="ml-auto rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700"
              >
                Stop
              </button>
            </div>
          )}

          {/* MediaRecorder fallback HUD */}
          {isRecordingAudio && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
              <span className="font-semibold">Recording audio ({recordingSeconds}s):</span>
              <span>FocusFlow will transcribe your speech via Gemini when finished</span>
              <button
                type="button"
                onClick={stopAudioRecording}
                className="ml-auto rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-700"
              >
                Finish & Transcribe
              </button>
            </div>
          )}

          {isTranscribing && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-tide-500/30 bg-tide-500/10 px-3 py-2 text-xs text-tide-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-tide-600" />
              <span>Transcribing your speech with Gemini...</span>
            </div>
          )}
        </div>

        {/* Attached Items Bar (Documents & Voice Notes) */}
        {(attachments.length > 0 || voiceNotes.length > 0 || isUploadingFile) && (
          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-ink/5">
            {isUploadingFile && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-tide-500/30 bg-tide-500/10 px-3 py-1.5 text-xs text-tide-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing document with Gemini...</span>
              </div>
            )}

            {attachments.map((att) => {
              const topicsCount = att.extractedData?.topics?.length ?? 0;
              const deadlinesCount = att.extractedData?.deadlines?.length ?? 0;
              return (
                <div
                  key={att.id}
                  className="group inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/90 px-3 py-1.5 text-xs text-ink shadow-sm hover:border-tide-500/40"
                >
                  {att.type === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                  ) : att.type === "pdf" ? (
                    <FileText className="h-3.5 w-3.5 text-rose-500" />
                  ) : att.type === "document" ? (
                    <FileText className="h-3.5 w-3.5 text-sky-500" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  <span className="font-medium truncate max-w-35">{att.name}</span>
                  <span className="text-[10px] text-mist-400">({formatBytes(att.size)})</span>

                  {(topicsCount > 0 || deadlinesCount > 0) && (
                    <span className="rounded bg-tide-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-tide-700">
                      {topicsCount ? `${topicsCount} topics` : ""}{topicsCount && deadlinesCount ? " · " : ""}{deadlinesCount ? `${deadlinesCount} deadlines` : ""}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(att)}
                    className="text-mist-400 hover:text-tide-600"
                    title="View extracted syllabus"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-mist-400 hover:text-rose-500"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            {voiceNotes.map((v) => (
              <div
                key={v.id}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50/70 px-3 py-1.5 text-xs text-rose-800 shadow-sm"
              >
                <Mic className="h-3.5 w-3.5 text-rose-500" />
                <span className="truncate max-w-45">"{v.text}"</span>
                <span className="text-[10px] text-rose-400">({v.recordedAt})</span>
                <button
                  type="button"
                  onClick={() => removeVoiceNote(v.id)}
                  className="text-rose-400 hover:text-rose-600"
                  title="Remove voice note"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Example prompts */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setGoalText(p)}
              className="rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-[11px] text-mist-600 transition hover:border-tide-500/40 hover:text-tide-700"
            >
              {p.length > 55 ? p.slice(0, 55) + "…" : p}
            </button>
          ))}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFileUpload(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Error message */}
        {generateError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-50/70 p-3" role="alert">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-semibold text-rose-600">Plan generation notice</p>
              <p className="mt-0.5 text-xs text-rose-500">{generateError}</p>
            </div>
          </div>
        )}

        {/* Composer Bottom Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink/5">
          {/* Input tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                isListening || isRecordingAudio
                  ? "border-rose-500 bg-rose-500/15 text-rose-400 shadow-sm shadow-rose-500/20"
                  : "border-[#262832] bg-white/5 text-gray-300 hover:text-white hover:border-white/20"
              }`}
              title="Click to speak (speech-to-text)"
            >
              {isListening || isRecordingAudio ? (
                <>
                  <MicOff className="h-4 w-4 text-rose-400 animate-pulse" />
                  <span>Stop Speaking</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 text-[#FF4500]" />
                  <span>Voice Input</span>
                  {!isPro && <ProBadge className="scale-75 origin-left" />}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={triggerFileUpload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#262832] bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:border-white/20 transition"
              title="Upload syllabus, notes or images (PDF, DOCX, TXT, CSV, PNG, JPG)"
            >
              <Paperclip className="h-4 w-4 text-[#FF4500]" />
              <span>Attach Syllabus / File</span>
              {!isPro && <ProBadge className="scale-75 origin-left" />}
            </button>

            <span className="hidden sm:inline text-[11px] font-mono text-gray-500">
              PDF, DOCX, CSV or Images
            </span>
          </div>

          {/* Submission actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#262832] bg-white/5 px-3 py-2 text-[11px] font-mono text-gray-400">
              <span>Daily AI Plans:</span>
              <span className="font-bold text-white">{planLimit?.used ?? 0}</span>
              <span>/ {isPro ? 200 : 5}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!combinedIntent.trim()) {
                  flash("Enter your goal, attach a file, or speak instructions first.");
                  return;
                }
                setStage("understand");
              }}
              disabled={isGenerating || !combinedIntent.trim()}
              className="rounded-xl border border-[#262832] bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition disabled:opacity-40"
            >
              Preview Understanding
            </button>

            <button
              type="button"
              onClick={() => {
                if (!combinedIntent.trim()) {
                  flash("Enter your goal, attach a file, or speak instructions first.");
                  return;
                }
                runGeneration(combinedIntent);
              }}
              disabled={isGenerating || !combinedIntent.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF4500] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[#FF4500]/25 transition hover:bg-[#e03e00] disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Planning with Gemini…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ============================================================
     STAGE: AI UNDERSTANDS (Real Data Verification)
  ============================================================ */

  const understandStage = (
    <div className="space-y-5">
      <div className="rounded-3xl border border-ink/10 bg-white/90 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-tide-600" aria-hidden />
          <h2 className="text-lg font-bold text-ink">How FocusFlow understands your goal</h2>
        </div>
        <p className="mt-1 text-xs text-mist-500">
          This combined intent will be fed into the Gemini planning engine along with your real workspace data.
        </p>

        {/* Combined input display */}
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 p-4">
          <p className="whitespace-pre-wrap text-sm text-ink">{combinedIntent || "Nothing captured yet."}</p>
        </div>

        {/* Optional refine textarea */}
        <textarea
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          rows={2}
          maxLength={3000}
          placeholder="Refine or add extra instructions before generating..."
          className="mt-3 w-full resize-none rounded-2xl border border-ink/10 bg-white/70 px-4 py-2.5 text-xs text-ink placeholder-mist-400 outline-none focus:border-tide-500/60"
        />

        {/* Retrieved context preview */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
            <p className="text-xs font-semibold text-ink">Your real database context</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-[#43584f]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span><strong>{goals.length}</strong> active goal(s) retrieved from PostgreSQL</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Today's calendar commitments protected (zero overlapping)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>Target focus window: <strong>{settings.focusWindow}</strong> ({settings.availableHours}h daily)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
            <p className="text-xs font-semibold text-ink">Extracted Attachments & Voice</p>
            {attachments.length === 0 && voiceNotes.length === 0 ? (
              <p className="mt-2 text-[11px] text-mist-500">No external documents or voice notes attached. Using typed input.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-[11px] text-[#43584f]">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-tide-600" />
                    <span>{a.name} ({a.extractedData?.topics?.length ?? 0} topics extracted)</span>
                  </li>
                ))}
                {voiceNotes.map((v) => (
                  <li key={v.id} className="flex items-center gap-1.5">
                    <Mic className="h-3 w-3 text-rose-500" />
                    <span>Voice instruction: "{v.text}"</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {generateError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-50/70 p-3" role="alert">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-semibold text-rose-600">The AI planner could not generate a plan</p>
              <p className="mt-0.5 text-xs text-rose-500">{generateError}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStage("tell")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/70 px-4 py-2 text-xs font-semibold text-mist-600 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <button
            type="button"
            onClick={() => runGeneration(combinedIntent)}
            disabled={isGenerating || !combinedIntent.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-tide-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-tide-600/20 hover:bg-tide-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Planning with Gemini…</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>Looks Good — Generate Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /* ============================================================
     STAGE: PLAN (AI Generates Structured Schedule)
  ============================================================ */

  const planStage = (
    <div className="space-y-5">
      {isGenerating ? (
        <div className="rounded-3xl border border-ink/10 bg-white/90 p-12 text-center backdrop-blur-xl shadow-xl flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-tide-600" />
          <p className="text-sm font-semibold text-ink">Building your personalized study & focus plan…</p>
          <p className="max-w-md text-xs text-mist-500">
            Reading your goals, extracted syllabus, calendar commitments, and focus history with Gemini.
          </p>
        </div>
      ) : generateError ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-50/50 p-8 text-center" role="alert">
          <TriangleAlert className="mx-auto h-8 w-8 text-rose-500" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-rose-600">The AI planner encountered an issue</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-rose-500">{generateError}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => runGeneration(combinedIntent)}
              className="rounded-xl bg-tide-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tide-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => setStage("tell")}
              className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-xs font-semibold text-mist-600 hover:text-ink"
            >
              Edit input
            </button>
          </div>
        </div>
      ) : (
        <>
          {renderWhyPanel()}
          {renderPlanList(false)}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStage("review")}
              className="inline-flex items-center gap-2 rounded-xl bg-tide-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-tide-700 shadow-lg shadow-tide-600/20"
            >
              Review & adjust <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runGeneration(combinedIntent)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-mist-600 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );

  /* ============================================================
     STAGE: REVIEW (Full Interactive Editing, Decomposition & Tools)
  ============================================================ */

  const reviewStage = (
    <div className="space-y-5">
      {renderWhyPanel()}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink">
          <Plus className="h-3.5 w-3.5" /> Add block
        </button>
        <button type="button" onClick={undo} disabled={!undoStack.length} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink disabled:opacity-40">
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button type="button" onClick={() => setShowCustomize(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Customize Plan
        </button>
        <button type="button" onClick={openHistory} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink">
          <History className="h-3.5 w-3.5" /> Plan History
          {!isPro && <ProBadge className="scale-75 origin-left" />}
        </button>
        <button type="button" onClick={openWhatIf} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink">
          <TrendingUp className="h-3.5 w-3.5" /> What-if
          {!isPro && <ProBadge className="scale-75 origin-left" />}
        </button>
        <button type="button" onClick={() => setShowFeasibility(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink">
          <Flag className="h-3.5 w-3.5" /> Feasibility
        </button>
        {hasEdits && <span className="text-[11px] font-medium text-amber-600">Unsaved edits</span>}
      </div>

      {renderPlanList(true)}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStage("tell")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-mist-600 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to composer
        </button>
        <button
          type="button"
          onClick={() => setStage("approve")}
          className="inline-flex items-center gap-2 rounded-xl bg-tide-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-tide-700 shadow-lg shadow-tide-600/20"
        >
          <ShieldCheck className="h-4 w-4" /> Approve & apply
        </button>
      </div>
    </div>
  );

  /* ============================================================
     STAGE: APPROVE (Commit to PostgreSQL Goals, Tasks & Calendar)
  ============================================================ */

  const approveStage = (
    <div className="space-y-5">
      <div className="rounded-3xl border border-ink/10 bg-white/90 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
          <h2 className="text-lg font-bold text-ink">Approve this plan for your workspace?</h2>
        </div>
        <p className="mt-1 text-xs text-mist-500">
          Approving writes real PostgreSQL records: {focusBlocks.length} focus block(s) will be created as tasks{applyOptions.createCalendarEvents ? " and scheduled into your calendar" : ""}.
        </p>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={applyOptions.createTasks}
              onChange={(e) => setApplyOptions((o) => ({ ...o, createTasks: e.target.checked }))}
              className="h-4 w-4 rounded border-ink/20 accent-tide-600"
            />
            Create {focusBlocks.length} real task(s) in Tasks Workspace
          </label>
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={applyOptions.createCalendarEvents}
              onChange={(e) => setApplyOptions((o) => ({ ...o, createCalendarEvents: e.target.checked }))}
              className="h-4 w-4 rounded border-ink/20 accent-tide-600"
            />
            Schedule {focusBlocks.length} focus block(s) in Calendar
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">Workspace Summary</p>
          <div className="mt-1 grid gap-1 text-xs text-[#43584f] sm:grid-cols-2">
            <p>{focusBlocks.length} focus block(s) · {minutesToLabel(totalFocusMinutes)} total</p>
            <p>{breaks.length} break(s) · plan health <span className={healthTone(currentHealth?.status)}>{currentHealth?.status ?? "HEALTHY"}</span></p>
            {currentInsights?.targetDate && <p>Target date: {currentInsights.targetDate}</p>}
            <p>Planning mode: {settings.planningMode}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStage("review")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-mist-600 hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Keep editing
          </button>
          <button
            type="button"
            onClick={approveAndApply}
            disabled={isApplying || (!applyOptions.createTasks && !applyOptions.createCalendarEvents)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Writing to workspace…</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Yes — apply to my workspace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /* ============================================================
     STAGE: EXECUTE (Smart Focus Session Integration & Tracking)
  ============================================================ */

  const executeStage = (
    <div className="space-y-5">
      {applyResult && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
          <p className="text-xs text-[#43584f]">{applyResult}</p>
        </div>
      )}

      {replanExplanation && (
        <div className="rounded-2xl border border-tide-500/25 bg-tide-500/5 p-4 text-xs text-[#43584f]">
          <p className="font-semibold text-ink">What changed</p>
          <p className="mt-0.5">{replanExplanation.whatChanged}</p>
          <p className="mt-1 font-semibold text-ink">Why</p>
          <p className="mt-0.5">{replanExplanation.why}</p>
          <p className="mt-1 text-mist-500">{replanExplanation.whatIsAffected}</p>
        </div>
      )}

      {/* Quick Execution Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {nextFocusBlock && (
          <button
            type="button"
            onClick={() => startFocusForItem(nextFocusBlock)}
            disabled={startingFocusId === nextFocusBlock.id}
            className="inline-flex items-center gap-2 rounded-xl bg-tide-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-tide-600/20 hover:bg-tide-700 disabled:opacity-50"
          >
            {startingFocusId === nextFocusBlock.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Today's Focus ({nextFocusBlock.title})
          </button>
        )}
        <button
          type="button"
          onClick={() => runReplan("finished_late", 30)}
          disabled={replanBusy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink disabled:opacity-50"
        >
          <Clock className="h-3.5 w-3.5" /> Running late (+30m)
          {!isPro && <ProBadge className="scale-75 origin-left" />}
        </button>
        <button
          type="button"
          onClick={() => runReplan("finished_early", 30)}
          disabled={replanBusy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink disabled:opacity-50"
        >
          <Zap className="h-3.5 w-3.5" /> Finished early (−30m)
          {!isPro && <ProBadge className="scale-75 origin-left" />}
        </button>
        <button
          type="button"
          onClick={openHistory}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink"
        >
          <History className="h-3.5 w-3.5" /> Plan History
          {!isPro && <ProBadge className="scale-75 origin-left" />}
        </button>
        <button
          type="button"
          onClick={() => setStage("tell")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-mist-600 hover:text-ink"
        >
          <Wand2 className="h-3.5 w-3.5" /> New AI Plan
        </button>
      </div>

      {renderPlanList(true)}

      <p className="text-[11px] text-mist-500">
        Focus sessions update tasks, goals, achievements, and focus telemetry automatically.
      </p>
    </div>
  );

  /* ============================================================
     DRAWERS & MODALS (Attachment Preview, History, What-If, Feasibility)
  ============================================================ */

  const attachmentPreviewModal = previewAttachment ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={() => setPreviewAttachment(null)}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/5 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-tide-600" />
            <h3 className="text-base font-bold text-ink truncate max-w-70">{previewAttachment.name}</h3>
          </div>
          <button
            type="button"
            onClick={() => setPreviewAttachment(null)}
            className="rounded-lg p-1 text-mist-400 hover:bg-mist-500/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {previewAttachment.extractedData?.topics && previewAttachment.extractedData.topics.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink">Extracted Topics & Modules ({previewAttachment.extractedData.topics.length}):</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewAttachment.extractedData.topics.map((t, idx) => (
                <span key={idx} className="rounded-md bg-tide-500/10 px-2 py-0.5 text-[11px] text-tide-700 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {previewAttachment.extractedData?.deadlines && previewAttachment.extractedData.deadlines.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink">Key Deadlines / Dates:</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewAttachment.extractedData.deadlines.map((d, idx) => (
                <span key={idx} className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-700 font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {previewAttachment.extractedData?.deliverables && previewAttachment.extractedData.deliverables.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink">Deliverables / Assignments:</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {previewAttachment.extractedData.deliverables.map((d, idx) => (
                <span key={idx} className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {Boolean(previewAttachment.extractedData?.text) && (
          <div>
            <p className="text-xs font-semibold text-ink">Content Excerpt:</p>
            <div className="mt-1.5 rounded-xl border border-ink/10 bg-white/70 p-3 text-xs text-[#43584f] max-h-48 overflow-y-auto whitespace-pre-wrap">
              {String(previewAttachment.extractedData?.text)}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const historyDrawer = showHistory ? (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Plan history" onClick={() => setShowHistory(false)}>
      <div className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Plan History</h3>
          <button type="button" onClick={() => setShowHistory(false)} aria-label="Close" className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        {historyLoading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-mist-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading versions…</div>
        ) : !versions?.length ? (
          <div className="mt-8 text-center">
            <History className="mx-auto h-8 w-8 text-mist-400" aria-hidden />
            <p className="mt-2 text-sm font-medium text-ink">No versions yet</p>
            <p className="text-xs text-mist-500">Every time you save or approve a plan, a version is recorded here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="rounded-xl border border-ink/10 bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink">Version {v.versionNumber}</p>
                  <button type="button" onClick={() => restoreVersion(v.versionNumber)} className="rounded-lg border border-tide-500/30 bg-tide-500/5 px-2 py-1 text-[10px] font-semibold text-tide-600 hover:bg-tide-500/10">Restore</button>
                </div>
                <p className="mt-0.5 text-[10px] text-mist-500">{v.itemCount} blocks · {v.changeReason || "Saved"} · {new Date(v.createdAt).toLocaleString()}</p>
                {v.prompt && <p className="mt-1 line-clamp-2 text-[10px] italic text-mist-400">"{v.prompt}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const whatIfDrawer = showWhatIf ? (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="What-if simulation" onClick={() => setShowWhatIf(false)}>
      <div className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">What if I have less time?</h3>
          <button type="button" onClick={() => setShowWhatIf(false)} aria-label="Close" className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[11px] text-mist-500">Simulates your current plan against a smaller capacity. Nothing is saved until you approve.</p>
        <label className="mt-4 block text-xs font-semibold text-ink">Simulated available time: {whatIfHours}h</label>
        <input type="range" min={0.5} max={8} step={0.5} value={whatIfHours} onChange={(e) => setWhatIfHours(Number(e.target.value))} className="mt-1 w-full accent-tide-600" />
        <button type="button" onClick={runWhatIf} disabled={whatIfLoading} className="mt-3 w-full rounded-xl bg-tide-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tide-700 disabled:opacity-50">
          {whatIfLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Run simulation"}
        </button>
        {whatIfResult && (
          <div className="mt-4 space-y-2 rounded-2xl border border-ink/10 bg-white/70 p-3 text-xs">
            <p>Can fit <span className="font-bold text-ink">{whatIfResult.canFitCount}</span> block(s) · <span className="font-bold text-ink">{whatIfResult.deferredCount}</span> deferred</p>
            <p>Projected health: <span className={healthTone(whatIfResult.projectedHealth)}>{whatIfResult.projectedHealth}</span></p>
            <p className="text-[#43584f]">{whatIfResult.verdict}</p>
            {whatIfResult.deferredItems.length > 0 && (
              <div className="space-y-1 border-t border-ink/10 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mist-500">Would be deferred</p>
                {whatIfResult.deferredItems.map((d) => <p key={d.id} className="text-[11px] text-mist-500">· {d.title}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const feasibilityDrawer = showFeasibility ? (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Goal feasibility" onClick={() => setShowFeasibility(false)}>
      <div className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Is my goal feasible?</h3>
          <button type="button" onClick={() => setShowFeasibility(false)} aria-label="Close" className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-500/10 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <input value={feasibilityForm.goalName} onChange={(e) => setFeasibilityForm((f) => ({ ...f, goalName: e.target.value }))} placeholder="Goal name" className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink" aria-label="Goal name" />
          <input type="date" value={feasibilityForm.targetDate} onChange={(e) => setFeasibilityForm((f) => ({ ...f, targetDate: e.target.value }))} className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink" aria-label="Target date" />
          <label className="block text-xs font-semibold text-ink">Estimated effort: {feasibilityForm.estimatedHours}h</label>
          <input type="range" min={1} max={200} value={feasibilityForm.estimatedHours} onChange={(e) => setFeasibilityForm((f) => ({ ...f, estimatedHours: Number(e.target.value) }))} className="w-full accent-tide-600" />
          <label className="block text-xs font-semibold text-ink">Daily capacity: {feasibilityForm.dailyCapacityHours}h</label>
          <input type="range" min={0.5} max={12} step={0.5} value={feasibilityForm.dailyCapacityHours} onChange={(e) => setFeasibilityForm((f) => ({ ...f, dailyCapacityHours: Number(e.target.value) }))} className="w-full accent-tide-600" />
          <button type="button" onClick={runFeasibility} disabled={feasibilityLoading} className="w-full rounded-xl bg-tide-600 px-4 py-2 text-xs font-semibold text-white hover:bg-tide-700 disabled:opacity-50">
            {feasibilityLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Check feasibility"}
          </button>
        </div>
        {feasibility && (
          <div className="mt-4 space-y-2 rounded-2xl border border-ink/10 bg-white/70 p-3 text-xs">
            <p>Status: <span className={`font-bold ${feasibility.status === "FEASIBLE" ? "text-emerald-600" : feasibility.status === "TIGHT" ? "text-amber-600" : "text-rose-600"}`}>{feasibility.status}</span></p>
            <p className="text-[#43584f]">{feasibility.explanation}</p>
            {feasibility.alternatives.length > 0 && (
              <div className="space-y-1 border-t border-ink/10 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-mist-500">Alternatives</p>
                {feasibility.alternatives.map((a, i) => <p key={i} className="text-[11px] text-mist-500">· {a}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  /* ============================================================
     PROPOSED ADAPTIVE REPLAN MODAL (Approval Workflow)
  ============================================================ */
  const proposedReplanModal = proposedReplan ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl border border-[#FF4500]/30 bg-[#12131A] p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-[#262832] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#FF4500]/30 bg-[#FF4500]/10 text-[#FF4500]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-base font-bold font-serif text-white">Proposed Schedule Replan</h3>
          </div>
          <button
            type="button"
            onClick={discardReplan}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-[#262832] bg-white/5 p-4 text-xs space-y-2">
            <div>
              <span className="font-semibold text-[#FF4500] font-mono uppercase text-[10px] tracking-wider block">What Changed</span>
              <p className="text-gray-300 mt-0.5">{proposedReplan.explanation.whatChanged}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-400 font-mono uppercase text-[10px] tracking-wider block">Why</span>
              <p className="text-gray-300 mt-0.5">{proposedReplan.explanation.why}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-400 font-mono uppercase text-[10px] tracking-wider block">Impact</span>
              <p className="text-gray-400 mt-0.5 font-light">{proposedReplan.explanation.whatIsAffected}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">Adjusted Blocks ({proposedReplan.items.length})</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {proposedReplan.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs">
                  <span className="font-medium text-white truncate max-w-60">{item.title}</span>
                  <span className="font-mono text-[11px] text-[#FF4500]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={discardReplan}
            className="rounded-xl border border-[#262832] bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={approveReplan}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF4500] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#FF4500]/25 hover:bg-[#e03e00] transition"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Approve & Apply Replan</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  /* ============================================================
     MAIN RENDER
  ============================================================ */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-tide-500/30 bg-tide-500/15 shadow-lg shadow-tide-500/10">
            <Sparkles className="h-6 w-6 text-tide-600" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink">AI Planner</h1>
              {isPro ? <ProBadge /> : <FreeBadge />}
              <span className="rounded-lg border border-[#262832] bg-white/5 px-2 py-0.5 text-[10px] font-mono text-gray-400">
                AI Plans: <strong className="text-white">{planLimit?.used ?? 0}</strong> / {isPro ? 200 : 5} today
              </span>
            </div>
            <p className="text-xs text-[#43584f]">
              {user ? `${user.name?.split(" ")[0] ?? "there"}, tell FocusFlow what to accomplish — ` : "Tell FocusFlow what to accomplish — "}
              it builds a real schedule from your goals, tasks, calendar and focus history.
            </p>
          </div>
        </div>
        {renderStageRail()}
      </div>

      {/* Stage Content */}
      {stage === "tell" && tellStage}
      {stage === "understand" && understandStage}
      {stage === "plan" && planStage}
      {stage === "review" && reviewStage}
      {stage === "approve" && approveStage}
      {stage === "execute" && executeStage}

      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-xl border border-ink/10 bg-ink px-4 py-2.5 text-xs font-medium text-white shadow-xl" role="status" aria-live="polite">
          {notice}
        </div>
      )}

      {/* Attachment Preview Modal */}
      {attachmentPreviewModal}

      {/* Drawers */}
      {historyDrawer}
      {whatIfDrawer}
      {feasibilityDrawer}

      {/* Proposed Replan Modal */}
      {proposedReplanModal}

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
