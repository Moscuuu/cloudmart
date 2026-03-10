import { useContext } from 'react';
import { CartContext } from '@/providers/CartProvider';
import type { CartStore } from '@/lib/cart-store';

export function useCart(): CartStore {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
