"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { ArrowRight, Check, X, Camera, ShieldCheck, AlertCircle, Loader2, ChevronLeft } from "lucide-react";
import FocusTimer from "@/components/FocusTimer";
import { getFocusState, completeOnboarding, getLiveFocusMetrics, type FocusState } from "@/lib/api";
import { useCameraMonitoring } from "@/context/CameraContext";

function useDashboardFocusState() {
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  // Real live focus score for the active session — null means no telemetry yet.
  const [liveScore, setLiveScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getFocusState();
        if (!cancelled && response.success) setFocusState(response.state);
      } catch {
        // backend offline or unauthenticated — badge stays hidden
      }
      try {
        const live = await getLiveFocusMetrics();
        if (!cancelled) {
          const avg = live.metrics?.focusScore;
          setLiveScore(typeof avg === "number" && Number.isFinite(avg) ? avg : null);
        }
      } catch {
        if (!cancelled) setLiveScore(null);
      }
    };
    const id = window.setTimeout(load, 0);
    const interval = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      window.clearInterval(interval);
    };
  }, []);

  return { focusState, liveScore };
}

const onboardingQuestions = [
  {
    title: "What kind of work would you like FocusFlow to help with?",
    options: ["Software development", "Creative work and content", "Client projects and freelancing", "Business and entrepreneurship", "Career and job search", "School, college, and exams", "Personal goals and habits", "Other"],
  },
  {
    title: "What would you most like to accomplish next?",
    options: ["Finish a high-priority task", "Plan a project", "Meet a deadline", "Learn a skill or prepare for an exam", "Create and publish work", "Build a consistent routine", "Improve a personal habit"],
  },
  {
    title: "When do you usually prefer to do focused work?",
    options: ["Morning", "Afternoon", "Evening", "Night"],
  },
  {
    title: "What distracts you the most while working?",
    options: ["Social Media", "YouTube & Entertainment", "Games", "Messaging", "Random Browsing", "Other"],
  },
  {
    title: "How long can you usually focus before needing a break?",
    options: ["15 min", "25 min", "45 min", "60+ min"],
  },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { enableCamera } = useCameraMonitoring();
  const router = useRouter();
  const pathname = usePathname();
  const { focusState: activeFocus, liveScore } = useDashboardFocusState();
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Keep the "time remaining" in the protection banner current without calling
  // Date.now() during render (React purity rule).
  useEffect(() => {
    if (!activeFocus?.active || activeFocus.paused) return;
    const update = () => setNowMs(Date.now());
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 30000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [activeFocus?.active, activeFocus?.paused]);
  const [cameraPrompt, setCameraPrompt] = useState(false);
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);

  // Redirect if not authenticated - preserve safe destination path
  useEffect(() => {
    if (!isLoading && !user) {
      const currentDest = typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : pathname;
      const safeNext = (currentDest && currentDest.startsWith("/") && !currentDest.startsWith("//") && !currentDest.includes("\\"))
        ? currentDest
        : "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(safeNext)}`);
    }
  }, [user, isLoading, router, pathname]);

  const finishOnboarding = async (answers = onboardingAnswers) => {
    if (!user) return;

    // Save to backend
    try {
      await completeOnboarding(answers);
    } catch (error) {
      console.error("Failed to save onboarding answers:", error);
    }

    // Save to localStorage as backup
    localStorage.setItem(`focusflow_onboarding_${user.id}`, "1");
    localStorage.setItem(
      `focusflow_onboarding_answers_${user.id}`,
      JSON.stringify(answers)
    );
    localStorage.removeItem("focusflow_new_user");
    setOnboardingStep(null);
    setOnboardingAnswers([]);
    setCurrentAnswer(null);

    // Show camera permission prompt immediately after onboarding
    setTimeout(() => setCameraPrompt(true), 400);
  };

  const resumePendingPlan = useCallback(() => {
    const pendingPlan = localStorage.getItem("focusflow_pending_plan");
    if (pendingPlan !== "pro" && pendingPlan !== "student_pro") return;
    localStorage.removeItem("focusflow_pending_plan");
    router.replace("/billing/checkout?plan=pro");
  }, [router]);

  // Ask onboarding questions for new users (only after registration), then camera permission
  useEffect(() => {
    if (!user) return;

    const checkOnboarding = () => {
      // Show onboarding questions for newly registered users who haven't completed onboarding yet
      const isNewUser = localStorage.getItem("focusflow_new_user") === "true";
      const onboardingComplete = localStorage.getItem(`focusflow_onboarding_${user.id}`);
      const hasCompleted = user.onboardingCompleted || onboardingComplete === "1";

      if ((isNewUser || !hasCompleted) && !onboardingComplete) {
        setOnboardingStep(0);
        return;
      }

      if (isNewUser) {
        localStorage.removeItem("focusflow_new_user");
      }

      // Always show camera permission if not already set
      const cameraEnabled = localStorage.getItem(`focusflow_camera_enabled_${user.id}`);
      if (cameraEnabled !== "1" && cameraEnabled !== "0") {
        setCameraPrompt(true);
      } else {
        resumePendingPlan();
      }
    };

    const timer = setTimeout(checkOnboarding, 400);
    return () => clearTimeout(timer);
  }, [user, resumePendingPlan]);

  const chooseOnboardingAnswer = (answer: string) => {
    if (onboardingStep === null) return;
    setCurrentAnswer(answer);
  };

  const goToNextQuestion = () => {
    if (onboardingStep === null) return;
    const nextAnswers = [...onboardingAnswers];
    if (currentAnswer) {
      nextAnswers[onboardingStep] = currentAnswer;
    }
    setOnboardingAnswers(nextAnswers);

    if (onboardingStep === onboardingQuestions.length - 1) {
      finishOnboarding(nextAnswers);
    } else {
      const nextStep = onboardingStep + 1;
      setCurrentAnswer(nextAnswers[nextStep] || null);
      setOnboardingStep(nextStep);
    }
  };

  const goToPreviousQuestion = () => {
    if (onboardingStep === null || onboardingStep === 0) return;
    const previousStep = onboardingStep - 1;
    const previousAnswer = onboardingAnswers[previousStep] || null;
    setCurrentAnswer(previousAnswer);
    setOnboardingStep(previousStep);
  };

  const skipOnboarding = () => finishOnboarding();

  const requestCameraPermission = async () => {
    if (!user) return;
    setCameraLoading(true);
    setCameraError(null);

    const ok = await enableCamera();
    setCameraLoading(false);
    if (ok) {
      setCameraGranted(true);
    } else {
      setCameraGranted(false);
      setCameraError("Could not access camera. Please verify camera permissions in your browser.");
    }
    setCameraPrompt(false);
    sessionStorage.setItem("camera_prompt_shown", "1");
    resumePendingPlan();
  };

  const dismissCameraPrompt = () => {
    setCameraGranted(false);
    setCameraPrompt(false);
    sessionStorage.setItem("camera_prompt_shown", "1");
    if (user) {
      localStorage.setItem(`focusflow_camera_enabled_${user.id}`, "0");
    }
    resumePendingPlan();
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF4500]/30 border-t-[#FF4500]" />
          <p className="text-xs font-mono text-gray-400">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex min-h-screen text-white bg-bg">
      {pathname !== "/dashboard/sessions" && <FocusTimer showUI={false} />}

      {/* First-login onboarding */}
      {onboardingStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[28px] border border-[#262832] bg-[#12131A] p-7 shadow-2xl backdrop-blur-2xl md:p-8 text-white">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#FF4500]">
                  Personalize your focus
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Question {onboardingStep + 1} of {onboardingQuestions.length}
                </p>
              </div>
              <button
                type="button"
                onClick={skipOnboarding}
                className="text-xs font-semibold text-gray-400 transition-colors hover:text-white"
              >
                Skip
              </button>
            </div>

            <div className="mb-7 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#FF4500] transition-all duration-300"
                style={{ width: `${((onboardingStep + 1) / onboardingQuestions.length) * 100}%` }}
              />
            </div>

            <h1 className="text-2xl font-serif font-bold tracking-tight text-white">
              {onboardingQuestions[onboardingStep].title}
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Choose the answer that feels closest. You can change your preferences later.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {onboardingQuestions[onboardingStep].options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseOnboardingAnswer(option)}
                  className={`group flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm transition-colors ${
                    currentAnswer === option
                      ? "border-[#FF4500] bg-[#FF4500]/15 text-[#FF4500] font-bold shadow-xs"
                      : "border-[#262832] bg-white/5 text-gray-300 hover:border-[#FF4500]/50 hover:bg-[#FF4500]/10 hover:text-white"
                  }`}
                >
                  {option}
                  {currentAnswer === option && (
                    <Check className="h-4 w-4 text-[#FF4500]" />
                  )}
                  {currentAnswer !== option && (
                    <ArrowRight className="h-4 w-4 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-[#FF4500]" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPreviousQuestion}
                disabled={onboardingStep === 0}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={skipOnboarding}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={!currentAnswer}
                  className="btn btn-primary btn-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {onboardingStep === onboardingQuestions.length - 1 ? "Complete" : "Next"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Permission Prompt Overlay */}
      {cameraPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md space-y-6 rounded-[28px] border border-[#262832] bg-[#12131A] p-7 shadow-2xl backdrop-blur-2xl text-white">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/30">
                <Camera className="h-6 w-6" aria-hidden />
              </div>
              <button
                onClick={dismissCameraPrompt}
                aria-label="Dismiss"
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-serif font-bold text-white">Enable Focus Monitoring</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                FocusFlow AI analyzes local device attention signals to provide focus telemetry while you work.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-gray-300">
              {[
                "Camera is only active during scheduled focus sessions",
                "Attention signals are calculated locally on your machine",
                "No video or images are stored or uploaded to any server",
                "You can revoke camera access anytime in settings",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {cameraError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" aria-hidden />
                <div>
                  <p className="font-semibold">Camera Access Notice</p>
                  <p className="mt-0.5 text-xs text-rose-400">{cameraError}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                id="allow-camera-btn"
                onClick={requestCameraPermission}
                disabled={cameraLoading}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {cameraLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Allow Camera
                  </>
                )}
              </button>
              <button
                id="skip-camera-btn"
                onClick={dismissCameraPrompt}
                disabled={cameraLoading}
                className="btn btn-ghost flex items-center gap-2"
              >
                Skip For Now
              </button>
            </div>

            <p className="text-center text-xs text-gray-500">
              You can toggle this preference anytime in settings
            </p>
          </div>
        </div>
      )}

      {/* Camera permission toast */}
      {cameraGranted !== null && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl transition-all ${
            cameraGranted
              ? "border-emerald-500/30 bg-[#12131A] text-emerald-400"
              : "border-amber-500/30 bg-[#12131A] text-amber-400"
          }`}
        >
          <Camera
            className={`h-4 w-4 ${cameraGranted ? "text-emerald-400" : "text-amber-400"}`}
            aria-hidden
          />
          {cameraGranted
            ? "Camera access enabled. Attention tracking activates during sessions."
            : "Camera access skipped. You can enable it later in settings."}
        </div>
      )}

      {/* Persistent focus protection banner (all dashboard pages) */}
      {activeFocus?.active && pathname !== "/dashboard/sessions" && (
        <div className="sticky top-16 z-30 border-b border-[#262832] bg-slate-50/90 px-4 py-2 backdrop-blur-md md:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 font-bold text-[#FF4500] font-mono">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF4500] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF4500]" />
              </span>
              FOCUS MODE {activeFocus.paused ? "PAUSED" : "ACTIVE"}
              <span className="hidden font-normal text-gray-400 sm:inline">
                · {activeFocus.taskTitle}
              </span>
            </span>
            <span className="flex items-center gap-3 text-gray-400">
              <span>
                Browser protection{" "}
                <b className={activeFocus.browserProtection && !activeFocus.paused ? "text-emerald-400" : "text-gray-500"}>
                  {activeFocus.browserProtection && !activeFocus.paused ? "ON" : "OFF"}
                </b>
              </span>
              {activeFocus.endsAt && nowMs != null ? (
                <span className="font-mono font-bold text-white">
                  {Math.max(0, Math.floor((activeFocus.endsAt - nowMs) / 60000))} min left
                </span>
              ) : null}
              <Link href="/dashboard/sessions" className="font-bold text-[#FF4500] hover:underline">
                Manage →
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <TopHeader
          activeSession={!!activeFocus?.active && !activeFocus.paused}
          currentScore={liveScore}
          streakDays={user?.streakDays}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
