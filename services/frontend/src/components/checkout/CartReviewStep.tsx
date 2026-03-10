import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface CartReviewStepProps {
  onNext: () => void;
}

export function CartReviewStep({ onNext }: CartReviewStepProps) {
  const { items, totalPrice } = useCart();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Review Your Cart</h2>

      <div className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-12 w-12 rounded-md border border-border object-cover"
                loading="lazy"
              />
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Qty: {item.quantity} x {priceFormatter.format(item.price)}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium tabular-nums">
              {priceFormatter.format(item.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-lg font-bold tabular-nums">
          {priceFormatter.format(totalPrice)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          render={<Link to="/cart" />}
          className="cursor-pointer"
        >
          Edit Cart
        </Button>
        <Button
          size="lg"
          onClick={onNext}
          className="min-h-[44px] cursor-pointer"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
