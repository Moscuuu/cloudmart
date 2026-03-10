export interface OrderItemRequest {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  items: OrderItemRequest[];
}

export interface OrderItemResponse {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface OrderResponse {
  id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  orders: OrderResponse[];
  total: number;
}
