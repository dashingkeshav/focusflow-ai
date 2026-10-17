import { apiRequest, getDashboardStats } from "@/lib/api";
export { getDashboardStats };

// ============================================================
// DISTRACTION LOG (real, per-user activity_events)
// GET /api/analytics/distractions
// ============================================================
export interface DistractionEvent {
  id: string;
  type: string;
  category: string;
  severity: "low" | "medium" | "high";
  domain: string | null;
  reason: string | null;
  classification: string | null;
  action: string;
  fromDomain: string | null;
  confidence: number | null;
  warningNumber: number | null;
  timestamp: string;
  occurredAt: string;
  session: { id: string; title: string; startedAt: string } | null;
}

export interface DistractionLogResponse {
  success: boolean;
  total: number;
  page: number;
  perPage: number;
  events: DistractionEvent[];
  message?: string;
}

export async function getDistractionLog(params: {
  page?: number;
  limit?: number;
  type?: string;
}): Promise<DistractionLogResponse> {
  const query = new URLSearchParams();
  if (params.page != null) query.set("page", String(params.page));
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.type != null) query.set("type", params.type);
  const qs = query.toString();
  return apiRequest<DistractionLogResponse>(`/api/analytics/distractions${qs ? `?${qs}` : ""}`);
}

// ============================================================
// DISTRACTION STATS (real, per-user activity_events)
// GET /api/analytics/distraction-stats
// ============================================================
export interface DistractionStats {
  blockedAttempts: number;
  warnings: number;
  distractions: number;
  idleEvents: number;
  cameraEvents: number;
  tabSwitches: number;
  totalEvents: number;
}

export interface DistractionStatsResponse {
  success: boolean;
  stats: DistractionStats;
  message?: string;
}

export async function getDistractionStats(): Promise<DistractionStatsResponse> {
  return apiRequest<DistractionStatsResponse>("/api/analytics/distraction-stats");
}

// ============================================================
// REAL AI INSIGHTS
// GET /api/insights/generate
// ============================================================
export interface Insight {
  kind: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  body: string;
  detail?: string;
}

export interface InsightStats {
  totalSessions: number;
  totalSeconds: number;
  totalTabSwitches: number;
  totalWarnings: number;
  totalBlocked: number;
  totalIdleSeconds: number;
  totalCamera: number;
  avgFocusScore: number | null;
  bestFocusScore: number | null;
  distractionRate: number;
  distractionByType: Record<string, number>;
  topDomains: Array<{ domain: string; count: number; lastAt: string | null }>;
}

export interface InsightsResponse {
  success: boolean;
  insights: {
    stats: InsightStats;
    insights: Insight[];
  };
  message?: string;
}

export async function getRealInsights(): Promise<InsightsResponse> {
  return apiRequest<InsightsResponse>("/api/insights/generate");
}

// ============================================================
// DATE-RANGE REPORT (real aggregations)
// GET /api/analytics/report?start=YYYY-MM-DD&end=YYYY-MM-DD
// ============================================================
export interface ReportSession {
  id: string;
  title: string;
  startedAt: string | Date;
  durationSeconds: number | null;
  avgFocusScore: number | null;
  status: string;
}

export interface ReportDaily {
  day: string;
  hours: number;
  score: number | null;
  cameraEvents: number;
  tabViolations: number;
  idleTime: number;
}

export interface ReportStats {
  dateRange: {
    start: string;
    end: string;
    sessionCount: number;
  };
  totalStudySeconds: number;
  totalTabSwitches: number;
  totalIdleSeconds: number;
  totalCameraDistractions: number;
  totalWarnings: number;
  totalBlocked: number;
  avgFocusScore: number | null;
  totalEvents: number;
  weeklyData: ReportDaily[];
  sessions: ReportSession[];
}

export interface ReportResponse {
  success: boolean;
  stats: ReportStats;
  message?: string;
}

export async function getDateRangeReport(start: string, end: string): Promise<ReportResponse> {
  return apiRequest<ReportResponse>(`/api/analytics/report?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
}
