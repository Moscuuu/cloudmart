import { apiFetch } from './client';
import type { ProductResponse, InventoryResponse, PageResponse } from '@/types/product';

export function fetchProducts(
  params: URLSearchParams,
): Promise<PageResponse<ProductResponse>> {
  return apiFetch<PageResponse<ProductResponse>>(`/api/v1/products?${params}`);
}

export function fetchProduct(id: string): Promise<ProductResponse> {
  return apiFetch<ProductResponse>(`/api/v1/products/${id}`);
}

export function fetchInventory(productId: string): Promise<InventoryResponse> {
  return apiFetch<InventoryResponse>(`/api/v1/inventory/${productId}`);
}
