import { API_BASE } from '@/lib/constants';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* ---------- auth integration ---------- */

/** Returns access token synchronously (set by AuthProvider) */
let getAccessTokenFn: (() => string | null) | null = null;

/** Called when a 401 refresh succeeds, to update AuthProvider state */
let onTokenRefreshed: ((token: string, user: unknown) => void) | null = null;

export function setAccessTokenGetter(fn: () => string | null): void {
  getAccessTokenFn = fn;
}

export function setTokenRefreshCallback(
  fn: (token: string, user: unknown) => void,
): void {
  onTokenRefreshed = fn;
}

/* ---------- extended init ---------- */

interface ApiFetchInit extends RequestInit {
  /** Skip Bearer header injection */
  skipAuth?: boolean;
  /** Internal: marks a retry after 401 refresh */
  _retrying?: boolean;
}

/* ---------- main fetch ---------- */

export async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  // Attach Bearer token if available and not skipped
  if (!init?.skipAuth) {
    const token = getAccessTokenFn?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  // On 401, attempt transparent token refresh (once)
  if (res.status === 401 && !init?._retrying) {
    try {
      const refreshResp = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResp.ok) {
        const data = await refreshResp.json();
        // Update AuthProvider state
        onTokenRefreshed?.(data.access_token, data.user);
        // Retry the original request with the new token
        return apiFetch(path, { ...init, _retrying: true });
      }
    } catch {
      // Refresh failed -- fall through to error handling
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as Record<string, unknown>).detail ??
      (body as Record<string, unknown>).title ??
      'Request failed';
    throw new ApiError(res.status, String(message));
  }

  return res.json() as Promise<T>;
}
