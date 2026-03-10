import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { CartItemRow } from './CartItem';
import { CartSummary } from './CartSummary';
import { EmptyCart } from './EmptyCart';
import { useState } from 'react';

export function CartDrawer() {
  const { items, totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="relative cursor-pointer"
            aria-label={`Cart with ${totalItems} items`}
          />
        }
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {totalItems > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
          >
            {totalItems}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-6 sm:max-w-md">
        <SheetTitle className="text-lg font-semibold">
          Shopping Cart ({totalItems})
        </SheetTitle>
        <Separator className="my-2" />
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <CartItemRow key={item.productId} item={item} />
                ))}
              </div>
            </div>
            <div className="mt-auto shrink-0 pt-4" onClick={() => setOpen(false)}>
              <CartSummary />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
