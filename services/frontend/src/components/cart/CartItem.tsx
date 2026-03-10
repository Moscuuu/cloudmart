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
    <div className="flex items-center gap-4 py-4">
      {/* Thumbnail */}
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
        loading="lazy"
      />

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {priceFormatter.format(item.price)}
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 min-h-[44px] min-w-[44px] cursor-pointer"
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          aria-label={`Decrease quantity of ${item.name}`}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 min-h-[44px] min-w-[44px] cursor-pointer"
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          aria-label={`Increase quantity of ${item.name}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Line total */}
      <p className="w-20 text-right text-sm font-medium tabular-nums">
        {priceFormatter.format(item.price * item.quantity)}
      </p>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 min-h-[44px] min-w-[44px] cursor-pointer text-destructive hover:text-destructive"
        onClick={() => removeItem(item.productId)}
        aria-label={`Remove ${item.name} from cart`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
