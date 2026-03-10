import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';

function renderWithProviders(initialEntry = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <h1>Home</h1> },
          { path: '*', element: <h1>Not Found</h1> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('renders CloudMart in the header', () => {
    renderWithProviders();
    expect(screen.getByText('CloudMart')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithProviders();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Order History')).toBeInTheDocument();
  });

  it('renders footer with copyright', () => {
    renderWithProviders();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`CloudMart.*${year}`))).toBeInTheDocument();
  });
});
