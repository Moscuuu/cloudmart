import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProductResponse, InventoryResponse } from '@/types/product';
import { CartProvider } from '@/providers/CartProvider';

vi.mock('@/api/products', () => ({
  fetchProducts: vi.fn().mockResolvedValue({ content: [], totalPages: 0, totalElements: 0, size: 20, number: 0, first: true, last: true, empty: true }),
  fetchProduct: vi.fn(),
  fetchInventory: vi.fn(),
}));

import { fetchProduct, fetchInventory } from '@/api/products';
import { ProductPage } from '@/pages/ProductPage';

const mockProduct: ProductResponse = {
  id: 'prod-001',
  name: 'Gaming Laptop Pro',
  description: 'High-performance gaming laptop with RTX 4080',
  price: 1299.99,
  imageUrl: '',
  sku: 'LAP-001',
  status: 'ACTIVE',
  category: { id: 1, name: 'Computers', description: 'Computer hardware' },
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockInventory: InventoryResponse = {
  productId: 'prod-001',
  quantity: 50,
  reservedQuantity: 5,
  availableQuantity: 45,
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderProductPage(productId = 'prod-001') {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <MemoryRouter initialEntries={[`/products/${productId}`]}>
          <Routes>
            <Route path="/products/:id" element={<ProductPage />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </QueryClientProvider>,
  );
}

describe('ProductPage - Product Detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product name, price, and description', async () => {
    vi.mocked(fetchProduct).mockResolvedValue(mockProduct);
    vi.mocked(fetchInventory).mockResolvedValue(mockInventory);

    renderProductPage();

    expect(await screen.findByRole('heading', { name: 'Gaming Laptop Pro' })).toBeInTheDocument();
    expect(screen.getByText('$1,299.99')).toBeInTheDocument();
    expect(screen.getByText('High-performance gaming laptop with RTX 4080')).toBeInTheDocument();
  });

  it('shows stock badge based on inventory data', async () => {
    vi.mocked(fetchProduct).mockResolvedValue(mockProduct);
    vi.mocked(fetchInventory).mockResolvedValue(mockInventory);

    renderProductPage();

    expect(await screen.findByText('In Stock')).toBeInTheDocument();
  });

  it('renders "Add to Cart" button', async () => {
    vi.mocked(fetchProduct).mockResolvedValue(mockProduct);
    vi.mocked(fetchInventory).mockResolvedValue(mockInventory);

    renderProductPage();

    expect(await screen.findByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });
});
