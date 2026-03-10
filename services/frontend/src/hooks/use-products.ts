import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchProduct, fetchInventory } from '@/api/products';
import type { ProductResponse, InventoryResponse, PageResponse } from '@/types/product';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  inventories: () => ['inventory'] as const,
  inventory: (productId: string) => [...productKeys.inventories(), productId] as const,
};

export function useProducts(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return useQuery<PageResponse<ProductResponse>>({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(params),
  });
}

export function useProduct(id: string) {
  return useQuery<ProductResponse>({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

export function useInventory(productId: string) {
  return useQuery<InventoryResponse>({
    queryKey: productKeys.inventory(productId),
    queryFn: () => fetchInventory(productId),
    enabled: !!productId,
    staleTime: 30_000,
  });
}

/**
 * Derive unique categories from product listing results client-side.
 * The Product Service doesn't expose a /categories endpoint.
 */
export function useCategories() {
  const params = new URLSearchParams({ size: '100' });
  const query = useQuery<PageResponse<ProductResponse>>({
    queryKey: [...productKeys.all, 'categories-source'],
    queryFn: () => fetchProducts(params),
    staleTime: 5 * 60_000,
  });

  const categories = query.data
    ? Array.from(
        new Map(
          query.data.content.map((p) => [p.category.id, p.category]),
        ).values(),
      )
    : [];

  return { ...query, categories };
}
