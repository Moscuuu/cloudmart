import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { CartProvider } from '@/providers/CartProvider';
import { useCart } from '@/hooks/use-cart';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

const sampleItem = {
  productId: 'p-1',
  name: 'Widget A',
  price: 29.99,
  imageUrl: 'https://picsum.photos/seed/p1/600/600',
};

const sampleItem2 = {
  productId: 'p-2',
  name: 'Widget B',
  price: 49.99,
  imageUrl: 'https://picsum.photos/seed/p2/600/600',
};

beforeEach(() => {
  localStorage.clear();
});

describe('CartProvider', () => {
  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('adds an item to cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.items[0].name).toBe('Widget A');
  });

  it('increments quantity when adding same product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.addItem(sampleItem));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it('removes an item from cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.addItem(sampleItem2));
    act(() => result.current.removeItem('p-1'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe('p-2');
  });

  it('updates quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.updateQuantity('p-1', 5));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('removes item when updating quantity to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.updateQuantity('p-1', 0));
    expect(result.current.items).toHaveLength(0);
  });

  it('clears the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.addItem(sampleItem2));
    act(() => result.current.clearCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('computes totalItems correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.addItem(sampleItem2));
    act(() => result.current.updateQuantity('p-1', 3));
    // 3 of item1 + 1 of item2 = 4
    expect(result.current.totalItems).toBe(4);
  });

  it('computes totalPrice correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem)); // 29.99
    act(() => result.current.addItem(sampleItem2)); // 49.99
    act(() => result.current.updateQuantity('p-1', 2)); // 2 * 29.99 = 59.98
    // 59.98 + 49.99 = 109.97
    expect(result.current.totalPrice).toBeCloseTo(109.97, 2);
  });
});

describe('localStorage persistence', () => {
  it('persists cart to localStorage on change', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));

    const stored = JSON.parse(localStorage.getItem('cloudmart-cart') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe('p-1');
  });

  it('initializes from localStorage', () => {
    const initialCart = [{ ...sampleItem, quantity: 3 }];
    localStorage.setItem('cloudmart-cart', JSON.stringify(initialCart));

    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
  });

  it('clears localStorage when cart is cleared', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(sampleItem));
    act(() => result.current.clearCart());

    // After clearCart, the useEffect syncs the empty array back to localStorage
    const stored = JSON.parse(localStorage.getItem('cloudmart-cart') || '[]');
    expect(stored).toEqual([]);
  });
});
