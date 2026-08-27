'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  dailyGoalHours?: number;
  streakDays?: number;
  emailVerified?: boolean;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<AuthResult>;
  logout: () => void;
  updateUser: (updates: Pick<User, 'name' | 'email'>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5001';

const TOKEN_KEY = 'focusflow_token';
const USER_KEY = 'focusflow_user';

function normalizeUser(user: User): User {
  const name = String(user.name || 'User').trim();

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
  };
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
    try {
      const storedToken =
        window.localStorage.getItem(TOKEN_KEY);

      const storedUser =
        window.localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(
          storedUser
        ) as User;

        setToken(storedToken);
        setUser(
          normalizeUser(parsedUser)
        );
      }
    } catch (error) {
      console.error(
        'Failed to restore authentication:',
        error
      );

      window.localStorage.removeItem(
        TOKEN_KEY
      );

      window.localStorage.removeItem(
        USER_KEY
      );

      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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
      router.replace('/login');
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
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
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

      router.push('/dashboard');

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
      const response = await fetch(
        `${API_URL}/api/auth/register`,
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
        }
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

      setToken(data.token);
      setUser(normalizedUser);

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
    window.localStorage.removeItem(
      TOKEN_KEY
    );

    window.localStorage.removeItem(
      USER_KEY
    );

    setToken(null);
    setUser(null);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateUser,
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