"use client";

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { getEntitlements, type EntitlementsSnapshot, type LimitInfo } from "./api";
import { useAuth } from "./auth";

interface EntitlementsContextType {
  entitlements: EntitlementsSnapshot | null;
  plan: "free" | "pro";
  isPro: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  canAccess: (featureKey: string) => boolean;
  getLimitInfo: (key: "aiPlanGenerations" | "voiceTranscriptions" | "fileUploads" | "aiInsights") => LimitInfo | null;
}

const EntitlementsContext = createContext<EntitlementsContextType | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    if (!token) {
      setEntitlements(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await getEntitlements();
      if (res?.success && res.entitlements) {
        setEntitlements(res.entitlements);
      }
    } catch {
      // Fallback gracefully to user's known plan
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive, user?.id]);

  const isPro = Boolean(entitlements?.isPro || user?.isPro || user?.plan === "pro");
  const plan: "free" | "pro" = isPro ? "pro" : "free";

  const canAccess = useCallback(
    (featureKey: string): boolean => {
      if (isPro) return true;
      if (!entitlements) return false;
      const featMap: Record<string, boolean> = {
        adaptive_replan: entitlements.features.adaptiveReplanning,
        what_if_simulation: entitlements.features.whatIfScenarios,
        task_decomposition: entitlements.features.taskDecomposition,
        plan_history: entitlements.features.planHistory,
        recovery_plan: entitlements.features.recoveryPlan,
        advanced_analytics: entitlements.features.advancedAnalytics,
        distraction_intelligence: entitlements.features.fullDistractionIntelligence,
        advanced_reports_pdf: entitlements.features.advancedReportsPdf,
        calendar_intelligence: entitlements.features.calendarIntelligence,
        multimodal_planning: (entitlements.features as any)?.multimodalPlanning ?? isPro,
        focus_intelligence: (entitlements.features as any)?.focusIntelligence ?? isPro,
        advanced_goals: (entitlements.features as any)?.advancedGoals ?? isPro,
      };
      if (featMap[featureKey] !== undefined) {
        return featMap[featureKey];
      }
      return false;
    },
    [isPro, entitlements]
  );

  const getLimitInfo = useCallback(
    (key: "aiPlanGenerations" | "voiceTranscriptions" | "fileUploads" | "aiInsights"): LimitInfo | null => {
      if (!entitlements?.limits) return null;
      return entitlements.limits[key] || null;
    },
    [entitlements]
  );

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        plan,
        isPro,
        isLoading,
        refresh: fetchLive,
        canAccess,
        getLimitInfo,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextType {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    // Graceful fallback if called outside provider
    return {
      entitlements: null,
      plan: "free",
      isPro: false,
      isLoading: false,
      refresh: async () => {},
      canAccess: () => false,
      getLimitInfo: () => null,
    };
  }
  return ctx;
}
