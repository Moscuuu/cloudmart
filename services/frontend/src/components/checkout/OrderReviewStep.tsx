import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { createOrder } from '@/api/orders';
import { ApiError } from '@/api/client';
import type { CustomerData } from './CustomerDetailsStep';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface OrderReviewStepProps {
  customer: CustomerData;
  onBack: () => void;
}

export function OrderReviewStep({ customer, onBack }: OrderReviewStepProps) {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        customer_name: customer.name,
        customer_email: customer.email,
        shipping_address: customer.address,
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      });
      clearCart();
      navigate(`/orders/${order.id}/confirmation`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to place order';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Confirm Your Order</h2>

      {/* Customer details summary */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Shipping Details
        </h3>
        <p className="text-sm font-medium">{customer.name}</p>
        <p className="text-sm text-muted-foreground">{customer.email}</p>
        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
          {customer.address}
        </p>
      </div>

      {/* Items summary */}
      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                Qty: {item.quantity} x {priceFormatter.format(item.price)}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {priceFormatter.format(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">Order Total</span>
        <span className="text-lg font-bold tabular-nums">
          {priceFormatter.format(totalPrice)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="min-h-[44px] cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
    </div>
  );
}
