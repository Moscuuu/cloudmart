import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { API_BASE } from '@/lib/constants';
import { setAccessTokenGetter, setTokenRefreshCallback } from '@/api/client';

/* ---------- types ---------- */

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

/* ---------- context ---------- */

const AuthContext = createContext<AuthContextValue | null>(null);

/* ---------- provider ---------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const updateAuth = useCallback((data: AuthResponse) => {
    accessTokenRef.current = data.access_token;
    setUser(data.user);
  }, []);

  const clearAuth = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
  }, []);

  const login = useCallback(
    async (code: string) => {
      const res = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, unknown>).detail as string ?? 'Login failed',
        );
      }

      const data: AuthResponse = await res.json();
      updateAuth(data);
    },
    [updateAuth],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort logout -- clear local state regardless
    }
    clearAuth();
  }, [clearAuth]);

  // Register token getter and refresh callback for the API client
  useEffect(() => {
    setAccessTokenGetter(getAccessToken);
    setTokenRefreshCallback((token: string, newUser: unknown) => {
      accessTokenRef.current = token;
      setUser(newUser as AuthUser);
    });
  }, [getAccessToken]);

  // Silent refresh on mount (check if user has a valid refresh cookie)
  useEffect(() => {
    let cancelled = false;

    async function silentRefresh() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok && !cancelled) {
          const data: AuthResponse = await res.json();
          updateAuth(data);
        }
      } catch {
        // No valid session -- stay unauthenticated
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    silentRefresh();
    return () => {
      cancelled = true;
    };
  }, [updateAuth]);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    getAccessToken,
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const tree = (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );

  // Only wrap with GoogleOAuthProvider if client ID is configured
  if (clientId) {
    return <GoogleOAuthProvider clientId={clientId}>{tree}</GoogleOAuthProvider>;
  }

  return tree;
}

/* ---------- hook ---------- */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
