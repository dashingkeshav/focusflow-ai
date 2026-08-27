const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5001';


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

  return `${API_URL}${cleanPath}`;
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


  const response =
    await fetch(
      getApiUrl(path),
      {
        ...options,
        headers,
        credentials: 'include',
        cache: 'no-store',
      }
    );


  let data:
    any = null;


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

        window.location.href =
          '/login';
      }
    }


    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }


  if (
    !response.ok
  ) {

    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`
    );
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
) {

  return apiRequest(
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
) {

  return apiRequest(
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
) {

  return apiRequest(
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
  title = 'Study Focus Session'
) {

  return apiRequest(
    '/api/sessions/start',
    {
      method: 'POST',

      body: JSON.stringify({
        title,
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

        distractionDomainCount:
          data.distractionDomainCount ?? 0,
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

  // Focus
  calculateFocusScore,

  // Health
  checkBackendHealth,

  // -------------------------------------------------
  // Compatibility aliases
  // -------------------------------------------------

  async startSession(
    _token?: string,
    title = 'Study Focus Session'
  ) {
    return startFocusSession(title);
  },


  async endSession(
    _token?: string,
    data: Record<string, unknown> = {}
  ) {
    return endFocusSession(data);
  },


  async getSessions(
    _token?: string
  ) {
    return getSessionHistory();
  },


  async getActive(
    _token?: string
  ) {
    return getActiveSession();
  },


  async getDashboard(
    _token?: string
  ) {
    return getDashboardStats();
  },


  async recordEvent(
    _token?: string,
    data: Record<string, unknown> = {}
  ) {
    return recordActivityEvent(data);
  },


  async calculateScore(
    _token?: string,
    data: {
      tabSwitches?: number;
      idleTimeSeconds?: number;
      keyboardRate?: number;
      mouseRate?: number;
      cameraDistractions?: number;
      distractionDomainCount?: number;
    } = {}
  ) {
    return calculateFocusScore(data);
  },

};


// =====================================================
// DEFAULT EXPORT
// =====================================================

export default api;