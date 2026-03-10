import { useInventory } from '@/hooks/use-products';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface StockBadgeProps {
  productId: string;
}

export function StockBadge({ productId }: StockBadgeProps) {
  const { data, isLoading } = useInventory(productId);

  if (isLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  if (!data) {
    return null;
  }

  const { availableQuantity } = data;

  if (availableQuantity === 0) {
    return (
      <Badge variant="destructive" aria-label="Out of stock">
        Out of Stock
      </Badge>
    );
  }

  if (availableQuantity <= 10) {
    return (
      <Badge
        className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
        aria-label={`Low stock: ${availableQuantity} left`}
      >
        Low Stock ({availableQuantity} left)
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400" aria-label="In stock">
      In Stock
    </Badge>
  );
}
