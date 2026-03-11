import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';

/* ---------- module mocks (hoisted) ---------- */

// Mock @react-oauth/google before any imports that use it
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useGoogleLogin: () => vi.fn(),
}));

/* ---------- lazy imports (after mocks) ---------- */

import { AuthProvider, useAuth, type AuthUser } from '@/auth/AuthProvider';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { apiFetch } from '@/api/client';

/* ---------- helpers ---------- */

const mockUser: AuthUser = {
  sub: 'google-oauth2|12345',
  email: 'test@example.com',
  name: 'Test User',
  role: 'customer',
};

const mockAuthResponse = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  user: mockUser,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/** Renders children inside AuthProvider + QueryClientProvider */
function renderWithAuth(ui: React.ReactNode) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

/** A test component that exposes auth context */
function AuthConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-name">{user?.name ?? 'none'}</span>
      <button data-testid="login-btn" onClick={() => login('test-auth-code')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

/* ---------- test setup ---------- */

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  // Default: silent refresh fails (user is not logged in)
  fetchSpy.mockResolvedValue(
    new Response(JSON.stringify({ detail: 'No refresh token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.restoreAllMocks();
});

/* ---------- tests ---------- */

describe('AuthProvider', () => {
  it('renders children with isAuthenticated=false initially', async () => {
    renderWithAuth(<AuthConsumer />);

    // Wait for loading to finish (silent refresh attempt completes)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-name').textContent).toBe('none');
  });

  it('login stores token and sets user', async () => {
    // First call: silent refresh fails. Second call: login succeeds.
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'No refresh token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const user = userEvent.setup();
    renderWithAuth(<AuthConsumer />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('user-name').textContent).toBe('Test User');

    // Verify the login call was made with correct body
    const loginCall = fetchSpy.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/auth/google'),
    );
    expect(loginCall).toBeDefined();
    const body = JSON.parse((loginCall![1] as RequestInit).body as string);
    expect(body.code).toBe('test-auth-code');
  });

  it('logout clears auth state', async () => {
    // Silent refresh fails, login succeeds, logout succeeds
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'No refresh token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Logged out' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const user = userEvent.setup();
    renderWithAuth(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Login first
    await user.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    // Then logout
    await user.click(screen.getByTestId('logout-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
    expect(screen.getByTestId('user-name').textContent).toBe('none');
  });
});

describe('apiFetch with auth', () => {
  it('attaches Bearer header when token is available', async () => {
    // Silent refresh fails, login succeeds
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'No refresh token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    let resolveApiFetch: () => void;
    const apiFetchDone = new Promise<void>((r) => (resolveApiFetch = r));

    function ApiFetchTester() {
      const { isLoading, isAuthenticated, login } = useAuth();
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button data-testid="login-btn" onClick={() => login('test-code')}>
            Login
          </button>
          <button
            data-testid="fetch-btn"
            onClick={async () => {
              // Mock the response for the api call
              fetchSpy.mockResolvedValueOnce(
                new Response(JSON.stringify({ data: 'ok' }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              );
              await apiFetch('/api/v1/products');
              resolveApiFetch();
            }}
          >
            Fetch
          </button>
        </div>
      );
    }

    const user = userEvent.setup();
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ApiFetchTester />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByTestId('login-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await user.click(screen.getByTestId('fetch-btn'));
    await apiFetchDone;

    // Find the products fetch call
    const productCall = fetchSpy.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/products'),
    );
    expect(productCall).toBeDefined();
    const headers = (productCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-access-token');
  });
});

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to home', async () => {
    // Silent refresh fails
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'No refresh token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const qc = createQueryClient();
    const router = createMemoryRouter(
      [
        { path: '/', element: <div>Home Page</div> },
        {
          path: '/protected',
          element: (
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          ),
        },
      ],
      { initialEntries: ['/protected'] },
    );

    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('allows authenticated users to access protected content', async () => {
    // Silent refresh succeeds (user is logged in)
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockAuthResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const qc = createQueryClient();
    const router = createMemoryRouter(
      [
        { path: '/', element: <div>Home Page</div> },
        {
          path: '/protected',
          element: (
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          ),
        },
      ],
      { initialEntries: ['/protected'] },
    );

    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
