'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getApiBaseUrl, verifySession, apiRequest, fetchWithFallback } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  dailyGoalHours?: number;
  streakDays?: number;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  onboardingAnswers?: string[];
  plan?: "free" | "pro";
  isPro?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  plan: "free" | "pro";
  isPro: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthResult>;
  logout: () => void;
  updateUser: (updates: Pick<User, 'name' | 'email'>) => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);


const TOKEN_KEY = 'focusflow_token';
const USER_KEY = 'focusflow_user';
const NEW_USER_KEY = 'focusflow_new_user';

function normalizeUser(user: User): User {
  const name = String(user.name || 'User').trim();
  const plan: "free" | "pro" = user.plan === "pro" || Boolean(user.isPro) ? "pro" : "free";

  return {
    ...user,
    id: String(user.id),
    name,
    email: String(user.email || '').toLowerCase(),
    initials:
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'US',
    plan,
    isPro: plan === "pro",
  };
}

function syncExtensionAuth(token: string | null, user: User | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('FOCUSFLOW_AUTH_SYNC', { detail: { token, user } }));
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // =====================================================
  // RESTORE LOCAL SESSION
  // =====================================================

  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken =
          window.localStorage.getItem(TOKEN_KEY);

        const storedUser =
          window.localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Reject expired tokens immediately without network latency
          if (isTokenExpired(storedToken)) {
            window.localStorage.removeItem(TOKEN_KEY);
            window.localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
            setIsLoading(false);
            return;
          }

          const parsedUser = JSON.parse(storedUser) as User;
          const normalized = normalizeUser(parsedUser);

          // Fast optimistic hydration to prevent layout shift & navbar flicker
          setToken(storedToken);
          setUser(normalized);
          setIsLoading(false);
          syncExtensionAuth(storedToken, normalized);

          // Validate against authoritative backend in background
          verifySession()
            .then((valid) => {
              if (!valid) {
                window.localStorage.removeItem(TOKEN_KEY);
                window.localStorage.removeItem(USER_KEY);
                setToken(null);
                setUser(null);
                syncExtensionAuth(null, null);
              } else {
                apiRequest<{ success: boolean; user: User }>('/api/analytics/me')
                  .then((res) => {
                    if (res?.success && res.user) {
                      const fresh = normalizeUser(res.user);
                      setUser(fresh);
                      window.localStorage.setItem(USER_KEY, JSON.stringify(fresh));
                      syncExtensionAuth(storedToken, fresh);
                    }
                  })
                  .catch(() => {});
              }
            })
            .catch(() => {});
        } else {
          setToken(null);
          setUser(null);
          setIsLoading(false);
          syncExtensionAuth(null, null);
        }
      } catch (error) {
        console.error('Failed to restore authentication:', error);
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setIsLoading(false);
      }
    };

    restore();
  }, []);

    // =====================================================
    // PROTECT DASHBOARD
    // =====================================================

  useEffect(() => {
    if (
      !isLoading &&
      !user &&
      pathname?.startsWith('/dashboard')
    ) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [
    user,
    isLoading,
    pathname,
    router,
  ]);

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    if (!email || !password) {
      return {
        success: false,
        error:
          'Email and password are required.',
      };
    }

    setIsLoading(true);

    try {
      const response = await fetchWithFallback(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        },
        1
      );

      let data: {
        success?: boolean;
        message?: string;
        token?: string;
        user?: User;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data.message ||
            'Invalid email or password.',
        };
      }

      if (
        !data.token ||
        !data.user
      ) {
        return {
          success: false,
          error:
            'The server returned an invalid login response.',
        };
      }

      const normalizedUser =
        normalizeUser(data.user);

      window.localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      window.localStorage.setItem(
        USER_KEY,
        JSON.stringify(normalizedUser)
      );

      setToken(data.token);
      setUser(normalizedUser);
      syncExtensionAuth(data.token, normalizedUser);

      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
        ? next
        : null;
      router.push(safeNext || '/dashboard');

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        'Login request failed:',
        error
      );

      return {
        success: false,
        error:
          'Unable to connect to the server. Please make sure the backend is running on port 5001.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResult> => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return {
        success: false,
        error:
          'Name, email and password are required.',
      };
    }

    setIsLoading(true);

    try {
      const response = await fetchWithFallback(
        '/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            confirmPassword: password,
          }),
        },
        1
      );

      let data: {
        success?: boolean;
        message?: string;
        token?: string;
        user?: User;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            data.message ||
            'Registration failed.',
        };
      }

      if (
        !data.token ||
        !data.user
      ) {
        return {
          success: false,
          error:
            'The server returned an invalid registration response.',
        };
      }

      const normalizedUser =
        normalizeUser(data.user);

      window.localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      window.localStorage.setItem(
        USER_KEY,
        JSON.stringify(normalizedUser)
      );

      // Mark as new user for onboarding
      window.localStorage.setItem(NEW_USER_KEY, 'true');

      const searchParams = new URLSearchParams(window.location.search);
      const requestedPlan = searchParams.get('plan');
      const requestedNext =
        searchParams.get('next') ||
        (requestedPlan === 'pro' || requestedPlan === 'student_pro'
          ? '/billing/checkout?plan=pro'
          : null);
      if (
        requestedNext &&
        requestedNext.startsWith('/') &&
        !requestedNext.startsWith('//') &&
        !requestedNext.includes('\\')
      ) {
        try {
          const destination = new URL(requestedNext, window.location.origin);
          const requestedPlan = destination.searchParams.get('plan');
          if (
            destination.origin === window.location.origin &&
            destination.pathname === '/billing/checkout' &&
            (requestedPlan === 'pro' || requestedPlan === 'student_pro')
          ) {
            window.localStorage.setItem('focusflow_pending_plan', 'pro');
          }
        } catch {
          // Invalid redirect input is ignored; registration still succeeds.
        }
      }

      setToken(data.token);
      setUser(normalizedUser);
      syncExtensionAuth(data.token, normalizedUser);

      router.push('/dashboard');

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        'Registration request failed:',
        error
      );

      return {
        success: false,
        error:
          'Unable to connect to the server. Please make sure the backend is running on port 5001.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    // Remove all focusflow_* keys to ensure no stale data from
    // the previous user can bleed into the next login session.
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('focusflow_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // If localStorage is unavailable, just proceed
    }

    setToken(null);
    setUser(null);
    setIsLoading(false);
    syncExtensionAuth(null, null);

    // Hard replace to /login so React state is fully reset
    router.replace('/login');
  };

  // =====================================================
  // UPDATE USER
  // =====================================================

  const updateUser = (
    updates: Pick<User, 'name' | 'email'>
  ) => {
    if (!user) {
      return;
    }

    const nextUser = normalizeUser({
      ...user,
      ...updates,
    });

    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify(nextUser)
    );

    setUser(nextUser);
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest<{ success: boolean; user: User }>('/api/analytics/me');
      if (res?.success && res.user) {
        const fresh = normalizeUser(res.user);
        setUser(fresh);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(USER_KEY, JSON.stringify(fresh));
        }
      }
    } catch {
      // offline-friendly fallback
    }
  };

  const isPro = Boolean(user?.isPro || user?.plan === 'pro');
  const plan: "free" | "pro" = isPro ? 'pro' : 'free';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        plan,
        isPro,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// useAuth
// =====================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside <AuthProvider>.'
    );
  }

  return context;
}