import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import type { OrderResponse } from '@/types/order';

// Mock the orders API
vi.mock('@/api/orders', () => ({
  createOrder: vi.fn(),
  fetchOrder: vi.fn(),
  fetchOrdersByEmail: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const sampleOrder: OrderResponse = {
  id: 'order-abc-123',
  customer_name: 'Jane Doe',
  customer_email: 'jane@test.com',
  shipping_address: '456 Oak Ave',
  status: 'PENDING',
  total_amount: 79.98,
  created_at: '2026-03-10T12:00:00Z',
  updated_at: '2026-03-10T12:00:00Z',
  items: [
    {
      id: 'item-1',
      order_id: 'order-abc-123',
      product_id: 'p-1',
      product_name: 'Widget A',
      quantity: 2,
      unit_price: 29.99,
      line_total: 59.98,
    },
    {
      id: 'item-2',
      order_id: 'order-abc-123',
      product_id: 'p-3',
      product_name: 'Widget C',
      quantity: 1,
      unit_price: 20.0,
      line_total: 20.0,
    },
  ],
};

function renderConfirmation() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/orders/:id/confirmation',
        element: <OrderConfirmationPage />,
      },
    ],
    { initialEntries: ['/orders/order-abc-123/confirmation'] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('OrderConfirmationPage', () => {
  it('shows order ID and status', async () => {
    const { fetchOrder } = await import('@/api/orders');
    vi.mocked(fetchOrder).mockResolvedValueOnce(sampleOrder);

    renderConfirmation();

    await waitFor(() => {
      expect(screen.getByText('order-abc-123')).toBeInTheDocument();
    });
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows items with prices', async () => {
    const { fetchOrder } = await import('@/api/orders');
    vi.mocked(fetchOrder).mockResolvedValueOnce(sampleOrder);

    renderConfirmation();

    await waitFor(() => {
      expect(screen.getByText('Widget A')).toBeInTheDocument();
    });
    expect(screen.getByText('Widget C')).toBeInTheDocument();
    // Check line totals are rendered (unit_price and line_total may match, so use getAllByText)
    expect(screen.getByText('$59.98')).toBeInTheDocument();
    expect(screen.getAllByText('$20.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Continue Shopping link', async () => {
    const { fetchOrder } = await import('@/api/orders');
    vi.mocked(fetchOrder).mockResolvedValueOnce(sampleOrder);

    renderConfirmation();

    await waitFor(() => {
      expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
    });
  });

  it('shows success banner', async () => {
    const { fetchOrder } = await import('@/api/orders');
    vi.mocked(fetchOrder).mockResolvedValueOnce(sampleOrder);

    renderConfirmation();

    await waitFor(() => {
      expect(
        screen.getByText('Order placed successfully!'),
      ).toBeInTheDocument();
    });
  });
});
