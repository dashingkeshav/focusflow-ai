function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0';
}

export function getApiBaseUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  if (typeof window !== 'undefined') {
    const isClientLocal = isLoopbackHostname(window.location.hostname);

    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        // If deployed to production (non-localhost) but NEXT_PUBLIC_API_URL was set to localhost,
        // prevent production browser from attempting to reach the user's localhost!
        if (!isClientLocal && isLoopbackHostname(parsed.hostname)) {
          return window.location.origin;
        }
        return envUrl.replace(/\/+$/, '');
      } catch {
        // invalid URL string, fallback to same origin in production
        return !isClientLocal ? window.location.origin : 'http://localhost:5001';
      }
    }

    // No NEXT_PUBLIC_API_URL provided:
    // In production browser, strictly use current origin (Next.js rewrites/proxy) - NEVER localhost!
    if (!isClientLocal) {
      return window.location.origin;
    }

    return 'http://localhost:5001';
  }

  // Server-side (Node.js / SSR)
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    const serverUrl = process.env.API_URL || '';
    if (serverUrl) {
      return serverUrl.replace(/\/+$/, '');
    }
    // Never silently return localhost in production
    return '';
  }

  // Development SSR fallback
  return 'http://127.0.0.1:5001';
}




// =====================================================
// TYPES
// =====================================================

export interface FocusSession {
  id?: string;
  _id?: string;
  userId?: string;

  title?: string;

  startTime?: string;
  endTime?: string;

  durationSeconds?: number;

  avgFocusScore?: number;
  finalFocusScore?: number | null;

  tabSwitches?: number;
  idleTimeSeconds?: number;
  cameraDistractions?: number;

  warningCount?: number;
  blockedAttempts?: number;
  distractionEvents?: number;

  status?: 'active' | 'paused' | 'completed' | 'cancelled';
}


export interface WeeklyData {
  day: string;
  hours: number;
  score: number;
  cameraEvents: number;
  tabViolations: number;
  idleTime: number;
}


export interface DashboardStats {
  avgFocusScore?: number;
  bestFocusScore?: number;

  totalStudySeconds?: number;
  todayStudySeconds?: number;

  totalSessions?: number;

  totalWarnings?: number;
  totalBlocked?: number;

  totalCameraDistractions?: number;
  totalTabSwitches?: number;

  streakDays?: number;

  weeklyData?: WeeklyData[];

  recentTimeline?: Array<{
    time: string;
    score: number;
    camera: number;
    tabSwitch: number;
  }>;

  distractionBreakdown?: Array<{
    name: string;
    value: number;
    color: string;
  }>;

  recentSessions?: FocusSession[];

  focusIntelligence?: {
    hasSufficientData?: boolean;
    sessionCount?: number;
    scoredSessionCount?: number;
    plannedVsActual?: {
      totalPlannedSeconds: number;
      totalPlannedMinutes: number;
      totalActualSeconds: number;
      totalActualMinutes: number;
      adherencePercent: number | null;
    };
    hourlyProductivity?: Array<{
      hour: number;
      label: string;
      avgScore: number | null;
      sessionCount: number;
      studyMinutes: number;
    }>;
    peakWindow?: {
      window: string;
      label: string;
      avgScore: number;
      count: number;
    } | null;
    recommendations?: {
      optimalBlockDuration: string;
      optimalBlockAvgScore: number | null;
      optimalTimeWindow: string;
      evidence: string;
    };
  };
}


export interface DashboardResponse {
  success: boolean;
  stats?: DashboardStats;
  message?: string;
}


export interface AuthUser {
  id: string;
  name: string;
  email: string;
  dailyGoalHours?: number;
  streakDays?: number;
  emailVerified?: boolean;
}


export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
}

export interface AuthActionResponse {
  success: boolean;
  message?: string;
  errors?: string[];
}


// =====================================================
// API URL
// =====================================================

export function getApiUrl(
  path: string
): string {

  const cleanPath =
    path.startsWith('/')
      ? path
      : `/${path}`;

  return `${getApiBaseUrl()}${cleanPath}`;
}


// =====================================================
// TOKEN
// =====================================================

export function getAuthToken(): string | null {

  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  return window.localStorage.getItem(
    'focusflow_token'
  );
}


// =====================================================
// RESILIENT FETCH WITH AUTOMATIC FALLBACK
// =====================================================

export async function fetchWithFallback(
  pathOrUrl: string,
  options: RequestInit = {},
  retries = 1
): Promise<Response> {
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  const isAbsolute = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');
  const baseUrl = getApiBaseUrl();
  const primaryUrl = isAbsolute ? pathOrUrl : `${baseUrl}${cleanPath}`;

  const candidates: string[] = [];
  if (primaryUrl) {
    candidates.push(primaryUrl);
  }

  const isLocalDev = typeof window !== 'undefined'
    ? isLoopbackHostname(window.location.hostname)
    : process.env.NODE_ENV !== 'production';

  // Only allow localhost alternate port swaps in local development
  if (isLocalDev && primaryUrl) {
    if (primaryUrl.includes('localhost:5001')) {
      candidates.push(primaryUrl.replace('localhost:5001', '127.0.0.1:5001'));
    } else if (primaryUrl.includes('127.0.0.1:5001')) {
      candidates.push(primaryUrl.replace('127.0.0.1:5001', 'localhost:5001'));
    }
  }

  // Also include relative path for Next.js proxy / same-origin handling
  if (typeof window !== 'undefined' && !candidates.includes(cleanPath)) {
    candidates.push(cleanPath);
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const url of candidates) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (err) {
        lastError = err;
      }
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw lastError;
}

// =====================================================
// SESSION VERIFICATION
// =====================================================

/**
 * Check the stored token against the backend WITHOUT the global 401
 * side effects of apiRequest (which clears storage and hard-redirects).
 *
 * Returns:
 *   true  — token is valid, OR the backend is unreachable (offline-friendly:
 *           keep the local session rather than logging the user out)
 *   false — backend explicitly rejected the token (expired / revoked)
 */
export async function verifySession(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetchWithFallback('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }, 0);

    if (response.status === 401 || response.status === 404) {
      return false;
    }

    return response.ok;
  } catch {
    // Network error — backend may be restarting. Don't log the user out.
    return true;
  }
}


// =====================================================
// GENERIC API REQUEST
// =====================================================

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const token =
    getAuthToken();


  const headers =
    new Headers(
      options.headers
    );


  if (
    !headers.has(
      'Content-Type'
    ) &&
    options.body
  ) {

    headers.set(
      'Content-Type',
      'application/json'
    );
  }


  if (token) {

    headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }


  let response: Response;
  try {
    response = await fetchWithFallback(
      path,
      {
        ...options,
        headers,
        credentials: 'include',
        cache: 'no-store',
      },
      1
    );
  } catch (netErr) {
    const isConnErr =
      netErr instanceof TypeError &&
      (netErr.message === 'Failed to fetch' || netErr.message.includes('fetch'));

    if (isConnErr) {
      throw new Error(
        `Unable to reach backend server at ${getApiUrl(path)}. Please ensure the backend is running.`
      );
    }
    throw netErr;
  }



  let data:
    Record<string, unknown> | null = null;


  try {

    data =
      await response.json();

  } catch {

    data = null;
  }


  if (
    response.status === 401
  ) {

    if (
      typeof window !== 'undefined'
    ) {

      localStorage.removeItem(
        'focusflow_token'
      );

      localStorage.removeItem(
        'focusflow_user'
      );

      /*
       * Don't redirect automatically while
       * already on authentication pages.
       */

      const pathname =
        window.location.pathname;

      if (
        pathname !== '/login' &&
        pathname !== '/register' &&
        pathname !== '/forgot-password' &&
        pathname !== '/reset-password'
      ) {

        // Deliberate hard redirect on session expiry: clears all in-memory client state
        // so stale authenticated UI never persists past an invalid token.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
      }
    }


    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }


  if (!response.ok) {
    const errorMsg =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & { code?: string; status?: number; data?: Record<string, unknown> };
    err.code = typeof data?.code === "string" ? data.code : undefined;
    err.status = response.status;
    err.data = (data as Record<string, unknown>) || undefined;
    throw err;
  }

  return data as T;
}


// =====================================================
// AUTH
// =====================================================

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {

  return apiRequest<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );
}


export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {

  return apiRequest<AuthResponse>(
    '/api/auth/register',
    {
      method: 'POST',

      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword: password,
      }),
    }
  );
}


// =====================================================
// PASSWORD RESET
// =====================================================

export async function forgotPassword(
  email: string
) : Promise<AuthActionResponse> {

  return apiRequest<AuthActionResponse>(
    '/api/auth/forgot-password',
    {
      method: 'POST',

      body: JSON.stringify({
        email,
      }),
    }
  );
}


export async function verifyOTP(
  email: string,
  otp: string
) : Promise<AuthActionResponse> {

  return apiRequest<AuthActionResponse>(
    '/api/auth/verify-otp',
    {
      method: 'POST',

      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );
}


export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
  confirmPassword: string
) : Promise<AuthActionResponse> {

  return apiRequest<AuthActionResponse>(
    '/api/auth/reset-password',
    {
      method: 'POST',

      body: JSON.stringify({
        email,
        otp,
        newPassword,
        confirmPassword,
      }),
    }
  );
}


export async function completeOnboarding(
  answers: string[]
) : Promise<AuthActionResponse> {

  return apiRequest<AuthActionResponse>(
    '/api/auth/complete-onboarding',
    {
      method: 'POST',

      body: JSON.stringify({
        answers,
      }),
    }
  );
}


export async function getOnboardingStatus() {
  return apiRequest<{
    success: boolean;
    onboardingCompleted: boolean;
    onboardingAnswers: string[] | null;
  }>('/api/auth/onboarding-status');
}


// =====================================================
// MULTIMODAL PLANNER API
// =====================================================

/*
 * Safely parse a response body as JSON. If the server ever
 * responds with an HTML error page (e.g. a proxy or default
 * Express handler), return a structured object instead of
 * throwing "Unexpected token '<' ... is not valid JSON".
 */
async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    return { success: false, message: fallbackMessage } as unknown as T;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as T;
    }
    return { success: false, message: fallbackMessage } as unknown as T;
  } catch {
    const snippet =
      response.status >= 500 || response.status === 404
        ? `Server error (${response.status}). Please make sure the backend is running.`
        : `Unexpected server response (${response.status}).`;
    return { success: false, message: snippet } as unknown as T;
  }
}

/** A single multimodal input fed to the AI planner (typed text, voice transcript, or extracted file data). */
export interface PlannerInput {
  type: 'text' | 'voice' | 'image' | 'pdf' | 'document';
  content: string;
}

/** Structured data extracted from an uploaded file (PDF/image/document) before planning. */
export interface ExtractedFileData {
  topics?: string[];
  deadlines?: string[];
  deliverables?: string[];
  sections?: string[];
  [key: string]: unknown;
}

/** Response for planner file uploads and audio transcription. */
export interface PlannerUploadResponse {
  success: boolean;
  message?: string;
  transcription?: string;
  extractedData?: ExtractedFileData;
}

/** Payload consumed by the AI planner generation endpoint. */
export interface PlannerGenerateResponse {
  success: boolean;
  message?: string;
  error?: string;
  aiPowered?: boolean;
  plan?: {
    summary?: string;
    items?: PlanItem[];
    aiPowered?: boolean;
  };
}

export async function uploadPlannerFile(file: File): Promise<PlannerUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(getApiUrl('/api/planner/upload'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const body = await parseJsonResponse<PlannerUploadResponse>(response, 'File upload failed');

  if (!response.ok || body.success === false) {
    const message = typeof body.message === 'string' && body.message ? body.message : 'File upload failed';
    throw new Error(message);
  }

  return body;
}

export async function transcribeAudio(audioBlob: Blob): Promise<PlannerUploadResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  const token = getAuthToken();
  const response = await fetch(getApiUrl('/api/planner/transcribe'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const body = await parseJsonResponse<PlannerUploadResponse>(response, 'Audio transcription failed');

  if (!response.ok || body.success === false) {
    const message =
      typeof body.message === 'string' && body.message
        ? body.message
        : 'Audio transcription failed';
    throw new Error(message);
  }

  return body;
}

export async function generatePlan(inputs: PlannerInput[]): Promise<PlannerGenerateResponse> {
  const token = getAuthToken();
  const response = await fetch(getApiUrl('/api/planner/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ inputs }),
  });

  const body = await parseJsonResponse<PlannerGenerateResponse>(response, 'Plan generation failed');

  if (!response.ok || body.success === false) {
    const message =
      typeof body.message === 'string' && body.message
        ? body.message
        : 'Plan generation failed';
    throw new Error(message);
  }

  return body;
}


// =====================================================
// DASHBOARD
// =====================================================

export async function getDashboardStats(): Promise<DashboardResponse> {

  return apiRequest<DashboardResponse>(
    '/api/analytics/dashboard'
  );
}


export async function getCurrentUser() {

  return apiRequest(
    '/api/analytics/me'
  );
}


export async function updateCurrentUser(
  data: Record<string, unknown>
) {

  return apiRequest(
    '/api/analytics/me',
    {
      method: 'PUT',

      body: JSON.stringify(data),
    }
  );
}


// =====================================================
// SESSIONS
// =====================================================

export async function getActiveSession() {

  return apiRequest(
    '/api/sessions/active'
  );
}


export async function getSessionHistory() {

  return apiRequest(
    '/api/sessions/history'
  );
}


export async function startFocusSession(
  title = 'Study Focus Session',
  options: { taskId?: string; plannedDurationSeconds?: number } = {}
) {

  return apiRequest(
    '/api/sessions/start',
    {
      method: 'POST',

      body: JSON.stringify({
        title,
        ...(options.taskId ? { taskId: options.taskId } : {}),
        ...(options.plannedDurationSeconds !== undefined
          ? { plannedDurationSeconds: options.plannedDurationSeconds }
          : {}),
      }),
    }
  );
}


export async function endFocusSession(
  data: Record<string, unknown>
) {

  return apiRequest(
    '/api/sessions/end',
    {
      method: 'POST',

      body: JSON.stringify(data),
    }
  );
}


export async function recordActivityEvent(
  data: Record<string, unknown>
) {

  return apiRequest(
    '/api/sessions/event',
    {
      method: 'POST',

      body: JSON.stringify(data),
    }
  );
}


// =====================================================
// FOCUS SCORE
// =====================================================

export async function calculateFocusScore(
  data: {
    tabSwitches?: number;
    idleTimeSeconds?: number;
    keyboardRate?: number;
    mouseRate?: number;
    cameraDistractions?: number;
    distractionDomainCount?: number;
  }
) {

  return apiRequest<{
    success: boolean;
    score: number;
    isDistracted: boolean;
    alertMessage: string;
    timestamp: number;
  }>(
    '/api/focus/calculate',
    {
      method: 'POST',

      body: JSON.stringify({
        tabSwitches:
          data.tabSwitches ?? 0,

        idleTimeSeconds:
          data.idleTimeSeconds ?? 0,

        keyboardRate:
          data.keyboardRate ?? 0,

        mouseRate:
          data.mouseRate ?? 0,

        cameraDistractions:
          data.cameraDistractions ?? 0,
      }),
    }
  );
}


// =====================================================
// HEALTH
// =====================================================

export async function checkBackendHealth() {

  return apiRequest(
    '/api/health'
  );
}


// =====================================================
// SMART FOCUS MODE
// =====================================================

export interface FocusState {
  active: boolean;
  paused?: boolean;
  sessionId: string;
  userId?: string;
  taskTitle: string;
  subject?: string;
  strictness: 'balanced' | 'strict' | 'custom';
  startedAt: number;
  endsAt: number;
  plannedDurationSeconds?: number;
  browserProtection: boolean;
  allowedSites?: string[];
  blockedSites?: string[];
  warningSites?: string[];
  warningCount?: number;
  blockedAttempts?: number;
  tabSwitches?: number;
  remainingSecondsWhenPaused?: number;
  temporaryExceptions?: Array<{ domain: string; expiresAt: number }>;
}

export interface SiteClassification {
  category: 'productive' | 'possibly_productive' | 'distracting';
  confidence: number;
  reason: string;
  action: 'allow' | 'warn' | 'block';
  message?: string;
  taskTitle?: string;
}

export async function getFocusState(): Promise<{ success: boolean; state: FocusState | null; expired?: boolean }> {
  return apiRequest('/api/focus/state');
}

// Real-time metrics for the active session, computed server-side from the
// persisted real telemetry. score === null means nothing was measured —
// the UI must show "Not available" in that case.
export interface LiveFocusMetricsSnapshot {
  hasTelemetry: boolean;
  tabSwitches: number;
  idleTimeSeconds: number;
  cameraDistractions: number;
  warningCount: number;
  blockedAttempts: number;
  distractionEvents: number;
  keyboardEvents: number;
  mouseEvents: number;
  productiveSeconds: number;
  focusScoreSamples: number;
  lastTelemetryAt: string | null;
  focusScore: number | null;
  isDistracted: boolean;
  alertMessage: string | null;
}

export interface LiveFocusMetricsResponse {
  success: boolean;
  sessionId?: string | null;
  status?: string | null;
  hasTelemetry: boolean;
  score: number | null;
  isDistracted: boolean;
  alertMessage: string | null;
  metrics?: LiveFocusMetricsSnapshot | null;
  timestamp: number;
}

export async function getLiveFocusMetrics(): Promise<LiveFocusMetricsResponse> {
  return apiRequest('/api/focus/live');
}

export async function startSmartFocusSession(payload: {
  taskTitle: string;
  taskId?: string;
  subject?: string;
  durationSeconds: number;
  strictness: 'balanced' | 'strict' | 'custom';
  mode?: 'smart' | 'single_site' | 'strict_lock';
  primarySite?: string;
  browserProtection?: boolean;
  allowedSites?: string[];
  blockedSites?: string[];
  warningSites?: string[];
}): Promise<{ success: boolean; session?: FocusSession; state?: FocusState; message?: string }> {
  return apiRequest('/api/focus/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function pauseFocusSession(): Promise<{ success: boolean; state?: FocusState; message?: string }> {
  return apiRequest('/api/focus/pause', { method: 'POST' });
}

export async function resumeFocusSession(): Promise<{ success: boolean; state?: FocusState; message?: string }> {
  return apiRequest('/api/focus/resume', { method: 'POST' });
}

export async function endSmartFocusSession(payload: {
  sessionId?: string;
  durationSeconds?: number;
  avgFocusScore?: number;
  finalFocusScore?: number;
  tabSwitches?: number;
  idleTimeSeconds?: number;
  cameraDistractions?: number;
  warningCount?: number;
  blockedAttempts?: number;
  distractionEvents?: number;
  status?: string;
  taskOutcome?: 'completed' | 'in_progress' | 'todo';
  notes?: string;
  markTaskCompleted?: boolean;
}): Promise<{ success: boolean; session?: FocusSession; message?: string }> {
  return apiRequest('/api/focus/end', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function classifySite(payload: {
  hostname: string;
  url?: string;
  title?: string;
}): Promise<{ success: boolean; classification?: SiteClassification; message?: string }> {
  return apiRequest('/api/focus/classify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// =====================================================
// BACKWARD-COMPATIBLE API OBJECT
// =====================================================
//
// Existing components such as FocusTimer.tsx
// currently import:
//
// import { api, calculateFocusScore } from '@/lib/api'
//
// The following object keeps that existing code
// working while using the new backend.
// =====================================================

// =====================================================
// AI PLANNER
// =====================================================

export interface PlanItem {
  id: string;
  taskId?: string;
  goalId?: string;
  title: string;
  time: string;
  durationMinutes: number;
  type: "focus_block" | "break" | "review" | "habit";
  priority: "Critical" | "High" | "Medium" | "Low";
  why: string;
  linkedGoal?: string;
  status?: "planned" | "in_progress" | "completed" | "skipped" | "rescheduled";
  source?: string;
  milestone?: string;
  dueDate?: string;
  subtasks?: Array<{ id: string; title: string; estMinutes?: number; completed: boolean }>;
}

export interface PlanHealthState {
  status: "HEALTHY" | "TIGHT" | "OVERLOADED" | "AT_RISK";
  reason: string;
  suggestedAction?: string;
  bufferMinutes?: number;
  remainingCapacityMinutes?: number;
  tasksCount?: number;
  highPriorityCount?: number;
  conflictsCount?: number;
  deadlineRisk?: "low" | "medium" | "high";
  totalPlannedMinutes?: number;
  availableMinutes?: number;
  workloadFeasibility?: {
    isFeasible: boolean;
    status: "HEALTHY" | "TIGHT" | "OVERLOADED" | "AT_RISK";
    totalPlannedHours: number;
    availableHours: number;
    differenceMinutes: number;
    differenceHours: number;
    overloaded: boolean;
    explanation: string;
    suggestedAction?: string;
    alternatives?: string[];
  };
}

export interface NextBestAction {
  title: string;
  planItemId?: string;
  taskId?: string;
  durationMinutes: number;
  priority: string;
  reason: string;
  actionType: "focus_session" | "quick_task" | "review";
  linkedGoal?: string;
}

export interface PlanInsights {
  summary: string;
  workloadStatus?: "Optimal" | "Heavy" | "Overloaded";
  totalFocusMinutes?: number;
  totalBreakMinutes?: number;
  totalPlannedHours?: number;
  availableHours?: number;
  conflictsDetected?: string[];
  recommendations?: string[];
  assumptions?: string[];
  userContextSummary?: string;
  userData?: {
    streak: number;
    avgFocusScore: number;
    totalSessions: number;
    activeGoalsCount: number;
    persona?: string;
    horizon?: string;
  };
  /** Assumptions labeled as AI inference, never user data. */
  aiAssumptions?: Array<{ label: string; text: string }>;
  /** Local date (YYYY-MM-DD) this plan targets. */
  targetDate?: string;
  aiConfidence?: {
    level: "High" | "Moderate" | "Low";
    reason: string;
  };
  generatedAt?: string;
  currentDateStr?: string;
  currentTimeFormatted?: string;
  planType?: string;
  aiPowered?: boolean;
}

export interface AIPlanData {
  prompt?: string;
  planType?: string;
  persona?: string;
  planningMode?: string;
  horizon?: string;
  items: PlanItem[];
  insights: PlanInsights;
  planHealth?: PlanHealthState;
  nextBestAction?: NextBestAction;
  updatedAt?: string;
}

export interface AIPlanResponse {
  success: boolean;
  message?: string;
  plan?: AIPlanData | null;
  aiPowered?: boolean;
}

export interface PlanVersionItem {
  id: string;
  versionNumber: number;
  planType: string;
  prompt: string;
  changeReason: string;
  createdAt: string;
  itemCount: number;
}

export async function generateAIPlan(payload: {
  prompt?: string;
  planType?: "daily" | "weekly";
  workingTimePreference?: string;
  intensity?: string;
  existingGoals?: unknown[];
  focusBlockDuration?: number;
  breakDuration?: number;
  planningMode?: string;
  persona?: string;
  horizon?: string;
  availableHours?: number;
  targetDate?: string;
}): Promise<AIPlanResponse & { aiPowered?: boolean }> {
  return apiRequest<AIPlanResponse & { aiPowered?: boolean }>("/api/planner/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAIPlan(): Promise<AIPlanResponse> {
  return apiRequest<AIPlanResponse>("/api/planner");
}

export async function saveAIPlan(payload: {
  items: PlanItem[];
  insights?: Partial<PlanInsights>;
  prompt?: string;
  planType?: string;
  persona?: string;
  planningMode?: string;
  horizon?: string;
}): Promise<AuthActionResponse> {
  return apiRequest<AuthActionResponse>("/api/planner/save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clearAIPlan(): Promise<AuthActionResponse> {
  return apiRequest<AuthActionResponse>("/api/planner", {
    method: "DELETE",
  });
}

export async function adaptiveReplanApi(payload: {
  trigger: "finished_early" | "finished_late" | "skipped_task" | "priority_changed" | "reschedule";
  deltaMinutes?: number;
  taskTitle?: string;
  currentItems: PlanItem[];
  commit?: boolean;
}): Promise<{
  success: boolean;
  message?: string;
  explanation: { whatChanged: string; why: string; whatIsAffected: string };
  items: PlanItem[];
  proposed?: boolean;
}> {
  return apiRequest("/api/planner/replan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function recoveryPlanApi(payload: {
  delayMinutes?: number;
  currentItems: PlanItem[];
}): Promise<{
  success: boolean;
  message?: string;
  explanation: { whatChanged: string; why: string; whatIsAffected: string };
  items: PlanItem[];
  movedToTomorrowCount: number;
}> {
  return apiRequest("/api/planner/recovery", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Projected plan state after a what-if scenario simulation. */
export interface WhatIfScenario {
  scenarioType: string;
  simulatedAvailableMinutes: number;
  projectedFocusMinutes: number;
  projectedHealth: "HEALTHY" | "TIGHT" | "OVERLOADED";
  canFitCount: number;
  deferredCount: number;
  projectedItems: PlanItem[];
  deferredItems: PlanItem[];
  verdict: string;
}

/** Server-computed feasibility check for a goal and target date. */
export interface FeasibilityResult {
  goalName: string;
  status: "FEASIBLE" | "TIGHT" | "UNREALISTIC";
  daysRemaining: number;
  estimatedHours: number;
  dailyCapacityHours: number;
  requiredHoursPerDay: number;
  totalAvailableHours: number;
  explanation: string;
  alternatives: string[];
}

/** A task produced by the AI goal decomposition endpoint. */
export interface DecomposedTask {
  id: string;
  title: string;
  milestone: string;
  durationMinutes: number;
  priority: string;
  done: boolean;
}

export async function simulateWhatIfApi(payload: {
  scenarioType: string;
  availableMinutes?: number;
  deadlineDate?: string;
  currentItems: PlanItem[];
}): Promise<{ success: boolean; scenario: WhatIfScenario }> {
  return apiRequest("/api/planner/what-if", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function calculateGoalFeasibilityApi(payload: {
  goalName?: string;
  targetDate: string;
  estimatedHours?: number;
  dailyCapacityHours?: number;
}): Promise<{ success: boolean; feasibility: FeasibilityResult }> {
  return apiRequest("/api/planner/feasibility", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function decomposeGoalApi(payload: {
  goalTitle: string;
  goalDescription?: string;
  category?: string;
}): Promise<{ success: boolean; goalTitle: string; tasks: DecomposedTask[] }> {
  return apiRequest("/api/planner/decompose", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function decomposeBlockApi(payload: {
  blockTitle: string;
  durationMinutes?: number;
  context?: string;
}): Promise<{
  success: boolean;
  blockTitle: string;
  subtasks: Array<{ id: string; title: string; estMinutes: number; completed: boolean }>;
}> {
  return apiRequest("/api/planner/decompose-block", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPlanHistoryApi(): Promise<{
  success: boolean;
  versions: PlanVersionItem[];
}> {
  return apiRequest("/api/planner/history");
}

export async function restorePlanVersionApi(versionNumber: number): Promise<{
  success: boolean;
  message?: string;
  items: PlanItem[];
  insights: PlanInsights;
}> {
  return apiRequest("/api/planner/restore-version", {
    method: "POST",
    body: JSON.stringify({ versionNumber }),
  });
}

export async function updatePlanItemsApi(items: PlanItem[], startHour = 9): Promise<{
  success: boolean;
  message?: string;
  items: PlanItem[];
}> {
  return apiRequest("/api/planner/items", {
    method: "PUT",
    body: JSON.stringify({ items, startHour }),
  });
}

// =====================================================
// GOALS & TASKS API
// =====================================================

export interface GoalTask {
  id: string;
  title: string;
  done: boolean;
  milestone?: string | null;
  status?: string;
  createdAt?: string;
}

/**
 * Server-computed fields from GET /api/goals:
 * - linkedTasks: first-class tasks rows (source of truth for progress)
 * - computedStatus / isOverdue / totalItems / completedItems
 * - progress: recalculated from linked tasks + milestones
 */
export interface GoalItem {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  start: string;
  target: string | null;
  targetValue: number;
  habit: boolean;
  habitStreak: number;
  status: 'Active' | 'Completed' | 'Behind' | 'At Risk';
  tasks: GoalTask[];
  linkedTasks?: GoalTask[];
  computedStatus?: string;
  isOverdue?: boolean;
  totalItems?: number;
  completedItems?: number;
  progress?: number;
  created: string;
}

export async function fetchGoals(): Promise<{ success: boolean; goals: GoalItem[] }> {
  return apiRequest<{ success: boolean; goals: GoalItem[] }>('/api/goals');
}

export async function createGoalApi(goal: Partial<GoalItem>): Promise<{ success: boolean; goal: GoalItem }> {
  return apiRequest<{ success: boolean; goal: GoalItem }>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

export async function updateGoalApi(id: string, updates: Partial<GoalItem>): Promise<{ success: boolean; goal: GoalItem }> {
  return apiRequest<{ success: boolean; goal: GoalItem }>(`/api/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteGoalApi(id: string): Promise<AuthActionResponse> {
  return apiRequest<AuthActionResponse>(`/api/goals/${id}`, {
    method: 'DELETE',
  });
}

export async function addGoalTaskApi(goalId: string, title: string, milestone?: string): Promise<{ success: boolean; task: GoalTask; tasks: GoalTask[] }> {
  return apiRequest<{ success: boolean; task: GoalTask; tasks: GoalTask[] }>(`/api/goals/${goalId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, milestone }),
  });
}

export async function toggleGoalTaskApi(goalId: string, taskId: string): Promise<{ success: boolean; task: GoalTask; tasks: GoalTask[]; goalStatus: string }> {
  return apiRequest<{ success: boolean; task: GoalTask; tasks: GoalTask[]; goalStatus: string }>(`/api/goals/${goalId}/tasks/${taskId}`, {
    method: 'PATCH',
  });
}

export async function editGoalTaskApi(goalId: string, taskId: string, title: string, milestone?: string): Promise<{ success: boolean; task: GoalTask; tasks: GoalTask[] }> {
  return apiRequest<{ success: boolean; task: GoalTask; tasks: GoalTask[] }>(`/api/goals/${goalId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, milestone }),
  });
}

export async function deleteGoalTaskApi(goalId: string, taskId: string): Promise<{ success: boolean; tasks: GoalTask[] }> {
  return apiRequest<{ success: boolean; tasks: GoalTask[] }>(`/api/goals/${goalId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export async function checkGoalHabitApi(goalId: string): Promise<{ success: boolean; habitStreak: number; message: string }> {
  return apiRequest<{ success: boolean; habitStreak: number; message: string }>(`/api/goals/${goalId}/habit/check`, {
    method: 'POST',
  });
}
// =====================================================
// FIRST-CLASS TASKS API (/api/tasks)
// =====================================================

export interface TaskItem {
  id: string;
  user_id?: string;
  goal_id: string | null;
  title: string;
  description?: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  due_date?: string | null;
  estimated_duration?: number | null;
  actual_duration?: number | null;
  milestone?: string | null;
  tags?: string[];
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
  goal_name?: string | null;
  goal_category?: string | null;
}

export interface TaskCounts {
  all: number;
  todo: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

export async function fetchTasksApi(params?: {
  status?: string;
  priority?: string;
  goalId?: string;
  search?: string;
  sortBy?: string;
  order?: string;
}): Promise<{ success: boolean; tasks: TaskItem[]; counts?: TaskCounts }> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.priority && params.priority !== 'all') qs.set('priority', params.priority);
  if (params?.goalId && params.goalId !== 'all') qs.set('goalId', params.goalId);
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  if (params?.order) qs.set('order', params.order);
  const query = qs.toString();
  return apiRequest(`/api/tasks${query ? `?${query}` : ''}`);
}

/** Wire format accepted by POST/PUT /api/tasks (camelCase body fields). */
export interface TaskPayload {
  title: string;
  description?: string;
  priority?: string;
  status?: TaskItem['status'];
  dueDate?: string | null;
  estimatedDuration?: number;
  milestone?: string | null;
  goalId?: string | null;
  tags?: string[];
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

export async function createTaskApi(task: TaskPayload): Promise<{ success: boolean; task: TaskItem }> {
  return apiRequest('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTaskApi(id: string, updates: Partial<TaskPayload>): Promise<{ success: boolean; task: TaskItem }> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function updateTaskStatusApi(id: string, status: TaskItem['status']): Promise<{ success: boolean; task: TaskItem }> {
  return apiRequest(`/api/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function toggleSubtaskApi(id: string, subtaskId: string, completed: boolean): Promise<{ success: boolean; task: TaskItem }> {
  return apiRequest(`/api/tasks/${id}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

export async function deleteTaskApi(id: string): Promise<AuthActionResponse> {
  return apiRequest(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

export interface NextActionResponse {
  success: boolean;
  hasTask: boolean;
  task: TaskItem | null;
  reason: string;
  score?: number;
  alternativeTasks?: TaskItem[];
}

export async function fetchNextActionApi(): Promise<NextActionResponse> {
  return apiRequest('/api/tasks/next-action');
}

export interface TaskEstimateResponse {
  success: boolean;
  hasComparableHistory: boolean;
  sampleCount: number;
  estimatedDuration: number;
  minDuration?: number;
  maxDuration?: number;
  explanation: string;
}

export async function fetchTaskEstimateApi(params?: { title?: string; goalId?: string; tags?: string }): Promise<TaskEstimateResponse> {
  const qs = new URLSearchParams();
  if (params?.title) qs.set('title', params.title);
  if (params?.goalId) qs.set('goalId', params.goalId);
  if (params?.tags) qs.set('tags', params.tags);
  const q = qs.toString();
  return apiRequest(`/api/tasks/estimate${q ? `?${q}` : ''}`);
}

export interface WeeklyReviewData {
  totalFocusMinutes: number;
  totalSessions: number;
  avgFocusScore: number | null;
  completedTasks: number;
  totalTasksPlanned: number;
  taskCompletionRate: number;
  plannedMins: number;
  actualMins: number;
  durationVariancePercent: number | null;
  goals: {
    total: number;
    progressing: number;
    completed: number;
    atRisk: number;
  };
  distractions: {
    warnings: number;
    blocked: number;
    tabSwitches: number;
    idleMinutes: number;
    topDomains: Array<{ domain: string; count: number }>;
  };
  priorPeriod: {
    hasPriorPeriod: boolean;
    priorFocusMinutes: number;
    priorSessions: number;
    focusTimeChangePercent: number | null;
  };
  recommendations: Array<{
    type: string;
    observation: string;
    recommendation: string;
  }>;
}

export interface WeeklyReviewResponse {
  success: boolean;
  hasData: boolean;
  review?: WeeklyReviewData;
  message?: string;
}

export async function fetchWeeklyReviewApi(): Promise<WeeklyReviewResponse> {
  return apiRequest('/api/analytics/weekly-review');
}

export interface AdaptiveCheckResponse {
  success: boolean;
  hasPlan: boolean;
  driftDetected: boolean;
  message?: string;
  explanation?: {
    whatChanged: string;
    why: string;
    whatIsAffected: string;
    atRiskDeadlines?: Array<{ id: string; title: string; priority: string }>;
  };
  proposedItems?: any[];
  proposedDeltaMinutes?: number;
}

export async function checkAdaptivePlanApi(): Promise<AdaptiveCheckResponse> {
  return apiRequest('/api/planner/adaptive-check', {
    method: 'POST',
  });
}

// =====================================================
// ACHIEVEMENTS API
// =====================================================

export interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  progress: number;
  percentage: number;
  status: 'Locked' | 'In Progress' | 'Unlocked';
  unlocked: boolean;
  unlockedAt?: string | null;
  isCustom: boolean;
  createdAt: string;
}

export interface AchievementStats {
  unlocked: number;
  inProgress: number;
  total: number;
  completionPercentage: number;
}

export async function fetchAchievements(): Promise<{
  success: boolean;
  achievements: AchievementItem[];
  stats: AchievementStats;
}> {
  return apiRequest<{
    success: boolean;
    achievements: AchievementItem[];
    stats: AchievementStats;
  }>('/api/achievements');
}

export async function createCustomAchievementApi(data: {
  title: string;
  description?: string;
  target: number;
}): Promise<{ success: boolean; achievement: AchievementItem }> {
  return apiRequest<{ success: boolean; achievement: AchievementItem }>('/api/achievements/custom', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomAchievementApi(
  id: string,
  data: {
    title?: string;
    description?: string;
    target?: number;
    progress?: number;
  }
): Promise<{ success: boolean; achievement: AchievementItem }> {
  return apiRequest<{ success: boolean; achievement: AchievementItem }>(`/api/achievements/custom/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCustomAchievementApi(id: string): Promise<AuthActionResponse> {
  return apiRequest<AuthActionResponse>(`/api/achievements/custom/${id}`, {
    method: 'DELETE',
  });
}

// =====================================================
// CALENDAR API
// =====================================================

export interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType: 'focus' | 'break' | 'review' | 'custom';
  linkedGoal?: string;
  linkedTaskId?: string;
  description?: string;
}

export async function fetchCalendarEvents(): Promise<{ success: boolean; events: CalendarEventItem[] }> {
  return apiRequest<{ success: boolean; events: CalendarEventItem[] }>('/api/calendar');
}

export async function applyPlanToCalendarApi(payload: {
  items: PlanItem[];
  planDate?: string;
}): Promise<{
  success: boolean;
  message: string;
  events: CalendarEventItem[];
  taskLinks: Array<{ planItemId: string; taskId: string; eventId: string }>;
}> {
  return apiRequest<{
    success: boolean;
    message: string;
    events: CalendarEventItem[];
    taskLinks: Array<{ planItemId: string; taskId: string; eventId: string }>;
  }>('/api/calendar/apply-plan', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Update api object
export const api = {
  // Dashboard
  getDashboardStats,
  getCurrentUser,

  // Sessions
  getActiveSession,
  getSessionHistory,
  startFocusSession,
  endFocusSession,
  recordActivityEvent,

  // Auth
  loginUser,
  registerUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  completeOnboarding,

  // Focus
  calculateFocusScore,
  getFocusState,
  startSmartFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endSmartFocusSession,
  classifySite,

  // AI Planner
  generateAIPlan,
  getAIPlan,
  saveAIPlan,
  clearAIPlan,

  // Health
  checkBackendHealth,

  // -------------------------------------------------
  // Compatibility aliases
  // -------------------------------------------------

  async startSession(
    ...args: [string?, string?]
  ) {
    return startFocusSession(args[1] || 'Study Focus Session');
  },

  async endSession(
    ...args: [string?, Record<string, unknown>?]
  ) {
    return endFocusSession(args[1] || {});
  },

  async getSessions() {
    return getSessionHistory();
  },

  async getActive() {
    return getActiveSession();
  },

  async getDashboard() {
    return getDashboardStats();
  },

  async recordEvent(
    ...args: [string?, Record<string, unknown>?]
  ) {
    return recordActivityEvent(args[1] || {});
  },

  async calculateScore(
    ...args: [
      string?,
      {
        tabSwitches?: number;
        idleTimeSeconds?: number;
        keyboardRate?: number;
        mouseRate?: number;
        cameraDistractions?: number;
        distractionDomainCount?: number;
      }?
    ]
  ) {
    return calculateFocusScore(args[1] || {});
  },

  async updateMe(
    _token?: string,
    data: Record<string, unknown> = {}
  ) {
    return updateCurrentUser(data);
  },
};

// =====================================================
// ENTITLEMENTS & PLAN TIERS
// =====================================================

export interface LimitInfo {
  limit: number;
  used: number;
  remaining: number;
  period: string;
}

export interface EntitlementsSnapshot {
  plan: "free" | "pro";
  isPro: boolean;
  subscription: {
    id?: string;
    planKey?: string;
    status?: string;
    currentStart?: string;
    currentEnd?: string;
  } | null;
  limits: {
    aiPlanGenerations: LimitInfo;
    voiceTranscriptions: LimitInfo;
    fileUploads: LimitInfo;
    aiInsights: LimitInfo;
    analyticsDaysHistory: number;
    distractionLogLimit: number;
  };
  features: {
    adaptiveReplanning: boolean;
    whatIfScenarios: boolean;
    taskDecomposition: boolean;
    planHistory: boolean;
    recoveryPlan: boolean;
    advancedAnalytics: boolean;
    fullDistractionIntelligence: boolean;
    advancedReportsPdf: boolean;
    calendarIntelligence: boolean;
  };
  collaboration?: {
    focus_rooms_max_participants: number;
    focus_circles_max_owned: number;
    focus_circles_max_members: number;
    project_pods_max_active_owned: number;
    project_pods_max_members: number;
    unblock_exchange_7d_limit: number;
  };
  meta: Record<string, { key: string; title: string; description: string }>;
  resetAt: string;
}

export async function getEntitlements(): Promise<{
  success: boolean;
  entitlements: EntitlementsSnapshot;
}> {
  return apiRequest<{ success: boolean; entitlements: EntitlementsSnapshot }>("/api/billing/entitlements");
}

export async function createBillingSubscription(planKey: string = "pro") {
  return apiRequest<{
    success: boolean;
    keyId: string;
    subscription: { id: string; status: string; planKey: string; title: string };
  }>("/api/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({ planKey }),
  });
}

export async function verifyBillingCheckout(payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  return apiRequest<{ success: boolean; message: string }>("/api/billing/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBillingSubscription() {
  return apiRequest<{
    success: boolean;
    subscription: {
      plan_key: string;
      status: string;
      current_start: string | null;
      current_end: string | null;
      created_at: string;
    } | null;
  }>("/api/billing/subscription");
}

export async function cancelBillingSubscription() {
  return apiRequest<{ success: boolean; message: string }>("/api/billing/subscription/cancel", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function syncBillingSubscription() {
  return apiRequest<{
    success: boolean;
    message: string;
    subscription: any;
    isPro: boolean;
  }>("/api/billing/subscription/sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// =====================================================
// NOTIFICATIONS API
// =====================================================

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: "focus" | "achievement" | "distraction" | "streak" | "goal" | "info" | "tip";
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(): Promise<{
  success: boolean;
  notifications: AppNotification[];
  unreadCount: number;
}> {
  return apiRequest<{
    success: boolean;
    notifications: AppNotification[];
    unreadCount: number;
  }>("/api/notifications");
}

export async function markNotificationAsRead(id: string): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; updatedCount: number }> {
  return apiRequest<{ success: boolean; updatedCount: number }>("/api/notifications/read-all", {
    method: "PATCH",
  });
}

export async function deleteNotification(id: string): Promise<{ success: boolean; id: string }> {
  return apiRequest<{ success: boolean; id: string }>(`/api/notifications/${id}`, {
    method: "DELETE",
  });
}

export async function clearAllNotifications(): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/api/notifications", {
    method: "DELETE",
  });
}

export async function triggerTestNotification(): Promise<{
  success: boolean;
  notification: AppNotification;
  message?: string;
}> {
  return apiRequest<{
    success: boolean;
    notification: AppNotification;
    message?: string;
  }>("/api/notifications/test", {
    method: "POST",
  });
}

// =====================================================
// COLLABORATION SUITE API
// 1. Focus Rooms
// 2. Focus Circles
// 3. Project Pods
// 4. Unblock Exchange
// =====================================================

export interface FocusRoom {
  id: string;
  host_user_id: string;
  host_name?: string;
  host_email?: string;
  title: string;
  category: string;
  is_public: boolean;
  max_participants: number;
  invite_code: string;
  status: 'open' | 'locked' | 'ended';
  timer_status: 'idle' | 'running' | 'paused' | 'completed';
  timer_duration_seconds: number;
  timer_start_time?: string | null;
  timer_elapsed_seconds: number;
  pod_id?: string | null;
  task_id?: string | null;
  help_request_id?: string | null;
  participant_count?: number;
  is_member?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FocusRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: 'host' | 'member';
  joined_at: string;
  presence_status: 'online' | 'away' | 'offline';
  active_session_id?: string | null;
}

export interface FocusCircle {
  id: string;
  owner_user_id: string;
  owner_name?: string;
  name: string;
  description?: string | null;
  category: string;
  max_members: number;
  invite_code: string;
  status: 'active' | 'archived';
  member_count?: number;
  user_role?: 'owner' | 'admin' | 'member' | null;
  created_at: string;
  updated_at: string;
}

export interface FocusCircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  status: 'active' | 'invited' | 'declined' | 'left';
}

export interface FocusCircleCommitment {
  id: string;
  circle_id: string;
  user_id: string;
  user_name?: string;
  week_number: number;
  year: number;
  commitment: string;
  is_completed: boolean;
  completion_note?: string | null;
  checked_in_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPod {
  id: string;
  owner_user_id: string;
  owner_name?: string;
  name: string;
  description?: string | null;
  status: 'active' | 'completed' | 'archived';
  max_members: number;
  invite_code: string;
  member_count?: number;
  task_count?: number;
  completed_task_count?: number;
  blocked_task_count?: number;
  user_role?: 'owner' | 'admin' | 'member' | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPodMember {
  id: string;
  pod_id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  status: 'active' | 'invited' | 'declined' | 'left';
}

export interface ProjectPodMilestone {
  id: string;
  pod_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPodTask {
  id: string;
  pod_id: string;
  milestone_id?: string | null;
  title: string;
  description?: string | null;
  assigned_to_user_id?: string | null;
  assigned_user_name?: string | null;
  created_user_name?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  due_date?: string | null;
  notes?: string | null;
  link_url?: string | null;
  is_blocked: boolean;
  blocker_reason?: string | null;
  personal_task_id?: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPodActivity {
  id: string;
  pod_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface UnblockRequest {
  id: string;
  requester_user_id: string;
  requester_name?: string;
  requester_email?: string;
  helper_name?: string;
  title: string;
  description: string;
  category: 'technical' | 'feedback' | 'brainstorming' | 'accountability' | 'decision_support' | 'other';
  status: 'open' | 'offered' | 'accepted' | 'in_progress' | 'resolved' | 'cancelled' | 'expired';
  scope_type: 'pod' | 'circle';
  scope_id: string;
  scope_name?: string;
  pod_task_id?: string | null;
  circle_commitment_id?: string | null;
  accepted_helper_user_id?: string | null;
  room_id?: string | null;
  outcome_notes?: string | null;
  expires_at: string;
  offer_count?: number;
  has_offered?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnblockOffer {
  id: string;
  request_id: string;
  helper_user_id: string;
  helper_name?: string;
  helper_email?: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

// 1. Focus Rooms API
export async function fetchCollaborationRooms(params?: { q?: string; category?: string }): Promise<{ success: boolean; rooms: FocusRoom[] }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category) query.set('category', params.category);
  const qStr = query.toString();
  return apiRequest(`/api/collaboration/rooms${qStr ? '?' + qStr : ''}`);
}

export async function createCollaborationRoom(data: {
  title: string;
  category?: string;
  isPublic?: boolean;
  maxParticipants?: number;
  durationSeconds?: number;
  podId?: string | null;
  taskId?: string | null;
  helpRequestId?: string | null;
}): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest('/api/collaboration/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCollaborationRoomByCode(code: string): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest(`/api/collaboration/rooms/code/${encodeURIComponent(code)}`);
}

export async function fetchCollaborationRoomDetails(id: string): Promise<{
  success: boolean;
  room: FocusRoom;
  participants: FocusRoomMember[];
  isHost: boolean;
  isMember: boolean;
}> {
  return apiRequest(`/api/collaboration/rooms/${id}`);
}

export async function joinCollaborationRoom(id: string, inviteCode?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/rooms/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
}

export async function leaveCollaborationRoom(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/rooms/${id}/leave`, {
    method: 'POST',
  });
}

export async function updateCollaborationRoom(id: string, data: Partial<FocusRoom>): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest(`/api/collaboration/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeCollaborationRoomMember(id: string, memberUserId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/rooms/${id}/remove-member`, {
    method: 'POST',
    body: JSON.stringify({ memberUserId }),
  });
}

export async function controlCollaborationRoomTimer(id: string, action: 'start' | 'pause' | 'resume' | 'reset' | 'complete', durationSeconds?: number): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest(`/api/collaboration/rooms/${id}/timer`, {
    method: 'POST',
    body: JSON.stringify({ action, durationSeconds }),
  });
}

export async function startCollaborationRoomSession(id: string): Promise<{ success: boolean; session: any }> {
  return apiRequest(`/api/collaboration/rooms/${id}/session/start`, {
    method: 'POST',
  });
}

export async function completeCollaborationRoomSession(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/rooms/${id}/session/complete`, {
    method: 'POST',
  });
}

// 2. Focus Circles API
export async function fetchCollaborationCircles(): Promise<{ success: boolean; circles: FocusCircle[] }> {
  return apiRequest('/api/collaboration/circles');
}

export async function createCollaborationCircle(data: { name: string; description?: string; category?: string }): Promise<{ success: boolean; circle: FocusCircle }> {
  return apiRequest('/api/collaboration/circles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCollaborationCircleByCode(code: string): Promise<{ success: boolean; circle: FocusCircle }> {
  return apiRequest(`/api/collaboration/circles/code/${encodeURIComponent(code)}`);
}

export async function acceptCollaborationCircleInvite(code: string): Promise<{ success: boolean; message: string; circleId: string }> {
  return apiRequest(`/api/collaboration/circles/code/${encodeURIComponent(code)}/accept`, {
    method: 'POST',
  });
}

export async function fetchCollaborationCircleDetails(id: string): Promise<{
  success: boolean;
  circle: FocusCircle;
  members: FocusCircleMember[];
  commitments: FocusCircleCommitment[];
  currentWeek: number;
  currentYear: number;
  userRole: 'owner' | 'admin' | 'member' | null;
}> {
  return apiRequest(`/api/collaboration/circles/${id}`);
}

export async function setCollaborationCircleCommitment(id: string, commitment: string): Promise<{ success: boolean; commitment: FocusCircleCommitment }> {
  return apiRequest(`/api/collaboration/circles/${id}/commitments`, {
    method: 'POST',
    body: JSON.stringify({ commitment }),
  });
}

export async function checkInCollaborationCircleCommitment(id: string, completionNote?: string): Promise<{ success: boolean; commitment: FocusCircleCommitment }> {
  return apiRequest(`/api/collaboration/circles/${id}/commitments/check-in`, {
    method: 'POST',
    body: JSON.stringify({ completionNote }),
  });
}

export async function removeCollaborationCircleMember(id: string, memberUserId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/circles/${id}/members/remove`, {
    method: 'POST',
    body: JSON.stringify({ memberUserId }),
  });
}

// 3. Project Pods API
export async function fetchCollaborationPods(): Promise<{ success: boolean; pods: ProjectPod[] }> {
  return apiRequest('/api/collaboration/pods');
}

export async function createCollaborationPod(data: { name: string; description?: string }): Promise<{ success: boolean; pod: ProjectPod }> {
  return apiRequest('/api/collaboration/pods', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCollaborationPodByCode(code: string): Promise<{ success: boolean; pod: ProjectPod }> {
  return apiRequest(`/api/collaboration/pods/code/${encodeURIComponent(code)}`);
}

export async function acceptCollaborationPodInvite(code: string): Promise<{ success: boolean; message: string; podId: string }> {
  return apiRequest(`/api/collaboration/pods/code/${encodeURIComponent(code)}/accept`, {
    method: 'POST',
  });
}

export async function fetchCollaborationPodDetails(id: string): Promise<{
  success: boolean;
  pod: ProjectPod;
  members: ProjectPodMember[];
  milestones: ProjectPodMilestone[];
  tasks: ProjectPodTask[];
  activities: ProjectPodActivity[];
  userRole: 'owner' | 'admin' | 'member' | null;
}> {
  return apiRequest(`/api/collaboration/pods/${id}`);
}

export async function createCollaborationPodMilestone(id: string, data: { title: string; description?: string; dueDate?: string }): Promise<{ success: boolean; milestone: ProjectPodMilestone }> {
  return apiRequest(`/api/collaboration/pods/${id}/milestones`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createCollaborationPodTask(id: string, data: {
  title: string;
  description?: string;
  milestoneId?: string;
  assignedToUserId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'blocked' | 'done';
  dueDate?: string;
  notes?: string;
  linkUrl?: string;
  isBlocked?: boolean;
  blockerReason?: string;
  personalTaskId?: string;
}): Promise<{ success: boolean; task: ProjectPodTask }> {
  return apiRequest(`/api/collaboration/pods/${id}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCollaborationPodTask(id: string, taskId: string, data: Partial<ProjectPodTask> & {
  milestoneId?: string;
  assignedToUserId?: string;
  dueDate?: string;
  blockerReason?: string;
  isBlocked?: boolean;
}): Promise<{ success: boolean; task: ProjectPodTask }> {
  return apiRequest(`/api/collaboration/pods/${id}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function launchRoomFromCollaborationPod(id: string, data?: { taskId?: string; milestoneId?: string }): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest(`/api/collaboration/pods/${id}/launch-room`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

// 4. Unblock Exchange API
export async function fetchCollaborationUnblockRequests(params?: { filter?: string; category?: string }): Promise<{ success: boolean; requests: UnblockRequest[] }> {
  const query = new URLSearchParams();
  if (params?.filter) query.set('filter', params.filter);
  if (params?.category) query.set('category', params.category);
  const qStr = query.toString();
  return apiRequest(`/api/collaboration/unblock${qStr ? '?' + qStr : ''}`);
}

export async function createCollaborationUnblockRequest(data: {
  title: string;
  description: string;
  category?: string;
  scopeType: 'pod' | 'circle';
  scopeId: string;
  podTaskId?: string | null;
  circleCommitmentId?: string | null;
}): Promise<{ success: boolean; request: UnblockRequest }> {
  return apiRequest('/api/collaboration/unblock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCollaborationUnblockDetails(id: string): Promise<{
  success: boolean;
  request: UnblockRequest;
  offers: UnblockOffer[];
  isRequester: boolean;
}> {
  return apiRequest(`/api/collaboration/unblock/${id}`);
}

export async function offerCollaborationUnblockHelp(id: string, message: string): Promise<{ success: boolean; offer: UnblockOffer }> {
  return apiRequest(`/api/collaboration/unblock/${id}/offer`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function acceptCollaborationUnblockOffer(id: string, helperUserId: string): Promise<{ success: boolean; request: UnblockRequest }> {
  return apiRequest(`/api/collaboration/unblock/${id}/accept-offer`, {
    method: 'POST',
    body: JSON.stringify({ helperUserId }),
  });
}

export async function resolveCollaborationUnblockRequest(id: string, outcomeNotes?: string): Promise<{ success: boolean; request: UnblockRequest }> {
  return apiRequest(`/api/collaboration/unblock/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ outcomeNotes }),
  });
}

export async function cancelCollaborationUnblockRequest(id: string): Promise<{ success: boolean; request: UnblockRequest }> {
  return apiRequest(`/api/collaboration/unblock/${id}/cancel`, {
    method: 'POST',
  });
}

export async function launchRoomFromCollaborationUnblock(id: string): Promise<{ success: boolean; room: FocusRoom }> {
  return apiRequest(`/api/collaboration/unblock/${id}/launch-room`, {
    method: 'POST',
  });
}

export interface FocusRoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  message_type: 'chat' | 'status' | 'milestone';
  created_at: string;
}

export async function fetchCollaborationRoomMessages(id: string): Promise<{ success: boolean; messages: FocusRoomMessage[] }> {
  return apiRequest(`/api/collaboration/rooms/${id}/messages`);
}

export async function sendCollaborationRoomMessage(
  id: string,
  content: string,
  messageType: 'chat' | 'status' | 'milestone' = 'chat'
): Promise<{ success: boolean; message: FocusRoomMessage }> {
  return apiRequest(`/api/collaboration/rooms/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, messageType }),
  });
}

export async function fetchCollaborationCircleHistory(id: string): Promise<{
  success: boolean;
  history: (FocusCircleCommitment & { user_name?: string })[];
  stats: { totalCommitments: number; completedCommitments: number; consistencyRate: number; userStreak: number };
}> {
  return apiRequest(`/api/collaboration/circles/${id}/history`);
}

export async function archiveCollaborationCircle(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/circles/${id}/archive`, { method: 'POST' });
}

export async function updateCollaborationPodMilestone(
  podId: string,
  milestoneId: string,
  data: { title?: string; description?: string; dueDate?: string | null; isCompleted?: boolean }
): Promise<{ success: boolean; milestone: ProjectPodMilestone }> {
  return apiRequest(`/api/collaboration/pods/${podId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCollaborationPodMilestone(
  podId: string,
  milestoneId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/pods/${podId}/milestones/${milestoneId}`, { method: 'DELETE' });
}

export async function deleteCollaborationPodTask(
  podId: string,
  taskId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/pods/${podId}/tasks/${taskId}`, { method: 'DELETE' });
}

export async function removeCollaborationPodMember(
  podId: string,
  memberUserId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/pods/${podId}/members/remove`, {
    method: 'POST',
    body: JSON.stringify({ memberUserId }),
  });
}

export async function archiveCollaborationPod(podId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/pods/${podId}/archive`, { method: 'POST' });
}

export async function deleteCollaborationUnblockOffer(
  requestId: string,
  offerId: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/collaboration/unblock/${requestId}/offers/${offerId}`, { method: 'DELETE' });
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default api;