import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PageResponse, ProductResponse } from '@/types/product';

// Mock the API module before importing components that use it
vi.mock('@/api/products', () => ({
  fetchProducts: vi.fn(),
  fetchProduct: vi.fn(),
  fetchInventory: vi.fn(),
}));

import { fetchProducts } from '@/api/products';
import { HomePage } from '@/pages/HomePage';

const mockProducts: ProductResponse[] = [
  {
    id: 'prod-001',
    name: 'Gaming Laptop Pro',
    description: 'High-performance gaming laptop',
    price: 1299.99,
    imageUrl: '',
    sku: 'LAP-001',
    status: 'ACTIVE',
    category: { id: 1, name: 'Computers', description: 'Computer hardware' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-002',
    name: 'Wireless Headphones',
    description: 'Noise-cancelling headphones',
    price: 249.99,
    imageUrl: '',
    sku: 'AUD-001',
    status: 'ACTIVE',
    category: { id: 2, name: 'Audio', description: 'Audio equipment' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-003',
    name: 'USB-C Hub',
    description: 'Multi-port USB-C adapter',
    price: 59.99,
    imageUrl: '',
    sku: 'ACC-001',
    status: 'ACTIVE',
    category: { id: 3, name: 'Accessories', description: 'Computer accessories' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function makePage(
  content: ProductResponse[],
  overrides: Partial<PageResponse<ProductResponse>> = {},
): PageResponse<ProductResponse> {
  return {
    content,
    totalPages: 1,
    totalElements: content.length,
    size: 20,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage - Product Listing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product cards with names and prices', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(makePage(mockProducts));

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Gaming Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('USB-C Hub')).toBeInTheDocument();

    expect(screen.getByText('$1,299.99')).toBeInTheDocument();
    expect(screen.getByText('$249.99')).toBeInTheDocument();
    expect(screen.getByText('$59.99')).toBeInTheDocument();
  });

  it('shows "No products found" when content is empty', async () => {
    vi.mocked(fetchProducts).mockResolvedValue(makePage([]));

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });
});
