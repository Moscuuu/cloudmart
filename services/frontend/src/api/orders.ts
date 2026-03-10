import { apiFetch } from './client';
import type { CreateOrderRequest, OrderResponse, OrderListResponse } from '@/types/order';

export function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
  return apiFetch<OrderResponse>('/api/v1/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchOrder(id: string): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/api/v1/orders/${id}`);
}

export function fetchOrdersByEmail(
  email: string,
  skip = 0,
  limit = 20,
): Promise<OrderListResponse> {
  const params = new URLSearchParams({
    customer_email: email,
    skip: String(skip),
    limit: String(limit),
  });
  return apiFetch<OrderListResponse>(`/api/v1/orders?${params}`);
}
