import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ShoppingBag
        className="h-16 w-16 text-muted-foreground/50"
        aria-hidden="true"
      />
      <h2 className="text-xl font-semibold">Your cart is empty</h2>
      <p className="max-w-sm text-muted-foreground">
        Browse our products and add items to your cart
      </p>
      <Button
        render={<Link to="/" />}
        className="mt-2 min-h-[44px] cursor-pointer"
      >
        Continue Shopping
      </Button>
    </div>
  );
}
