import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { CartContext } from '@/providers/CartProvider';
import { CheckoutPage } from '@/pages/CheckoutPage';
import type { CartStore } from '@/lib/cart-store';

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

const sampleCartItems = [
  {
    productId: 'p-1',
    name: 'Widget A',
    price: 29.99,
    imageUrl: 'https://picsum.photos/seed/p1/600/600',
    quantity: 2,
  },
  {
    productId: 'p-2',
    name: 'Widget B',
    price: 49.99,
    imageUrl: 'https://picsum.photos/seed/p2/600/600',
    quantity: 1,
  },
];

function createMockCartStore(items = sampleCartItems): CartStore {
  return {
    items,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  };
}

function renderCheckout(cartStore?: CartStore) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const store = cartStore ?? createMockCartStore();

  const router = createMemoryRouter(
    [
      {
        path: '/checkout',
        element: <CheckoutPage />,
      },
      {
        path: '/',
        element: <div>Home</div>,
      },
    ],
    { initialEntries: ['/checkout'] },
  );

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <CartContext value={store}>{children}</CartContext>
      </QueryClientProvider>
    );
  }

  return render(
    <Wrapper>
      <RouterProvider router={router} />
    </Wrapper>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('CheckoutPage', () => {
  it('shows the checkout stepper with 3 steps', () => {
    renderCheckout();
    expect(screen.getByText('Cart Review')).toBeInTheDocument();
    expect(screen.getByText('Customer Details')).toBeInTheDocument();
    expect(screen.getByText('Confirm Order')).toBeInTheDocument();
  });

  it('shows cart items in the review step', () => {
    renderCheckout();
    expect(screen.getByText('Widget A')).toBeInTheDocument();
    expect(screen.getByText('Widget B')).toBeInTheDocument();
  });

  it('navigates to customer details step', async () => {
    const user = userEvent.setup();
    renderCheckout();

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    await user.click(continueBtn);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
  });

  it('validates required fields on customer form', async () => {
    const user = userEvent.setup();
    renderCheckout();

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Full Name field should be required
    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toBeRequired();

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeRequired();

    const addressInput = screen.getByLabelText(/shipping address/i);
    expect(addressInput).toBeRequired();
  });

  it('calls createOrder with correct payload shape on Place Order', async () => {
    const { createOrder } = await import('@/api/orders');
    const mockedCreateOrder = vi.mocked(createOrder);
    mockedCreateOrder.mockResolvedValueOnce({
      id: 'order-123',
      customer_name: 'John Doe',
      customer_email: 'john@test.com',
      shipping_address: '123 Main St',
      status: 'PENDING',
      total_amount: 109.97,
      created_at: '2026-03-10T00:00:00Z',
      updated_at: '2026-03-10T00:00:00Z',
      items: [],
    });

    const user = userEvent.setup();
    const store = createMockCartStore();
    renderCheckout(store);

    // Step 1: Continue
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Fill form and continue
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@test.com');
    await user.type(screen.getByLabelText(/shipping address/i), '123 Main St');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Place order
    await user.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledWith({
        customer_name: 'John Doe',
        customer_email: 'john@test.com',
        shipping_address: '123 Main St',
        items: [
          {
            product_id: 'p-1',
            product_name: 'Widget A',
            quantity: 2,
            unit_price: 29.99,
          },
          {
            product_id: 'p-2',
            product_name: 'Widget B',
            quantity: 1,
            unit_price: 49.99,
          },
        ],
      });
    });
  });
});
