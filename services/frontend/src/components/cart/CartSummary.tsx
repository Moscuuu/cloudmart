import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function CartSummary() {
  const { totalItems, totalPrice } = useCart();

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold">Order Summary</h3>
      <Separator />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Items ({totalItems})
        </span>
        <span className="font-medium tabular-nums">
          {priceFormatter.format(totalPrice)}
        </span>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="font-semibold">Subtotal</span>
        <span className="text-lg font-bold tabular-nums">
          {priceFormatter.format(totalPrice)}
        </span>
      </div>
      <Button
        size="lg"
        render={<Link to="/checkout" />}
        className="mt-2 min-h-[44px] w-full cursor-pointer"
      >
        Proceed to Checkout
      </Button>
    </div>
  );
}
