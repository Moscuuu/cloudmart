export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sku: string;
  status: 'ACTIVE' | 'INACTIVE';
  category: CategoryResponse;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
}

export interface InventoryResponse {
  productId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
