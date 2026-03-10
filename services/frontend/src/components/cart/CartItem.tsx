import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartItem as CartItemType } from '@/lib/cart-store';
import { useCart } from '@/hooks/use-cart';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface CartItemProps {
  item: CartItemType;
}

export function CartItemRow({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="flex gap-3 py-4">
      {/* Thumbnail */}
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
        loading="lazy"
      />

      {/* Info + controls */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        {/* Name + remove button */}
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 cursor-pointer text-destructive hover:text-destructive"
            onClick={() => removeItem(item.productId)}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Price + quantity controls */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {priceFormatter.format(item.price)}
          </p>

          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-7 text-center text-sm font-medium tabular-nums">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Line total */}
          <p className="text-sm font-medium tabular-nums">
            {priceFormatter.format(item.price * item.quantity)}
          </p>
        </div>
      </div>
    </div>
  );
}
