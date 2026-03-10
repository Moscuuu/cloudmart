import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PLACEHOLDER_IMAGE_BASE } from '@/lib/constants';
import type { ProductResponse } from '@/types/product';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group/link block cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full gap-0 pt-0 transition-shadow duration-200 group-hover/link:shadow-md">
        <div className="relative aspect-square overflow-hidden rounded-t-xl">
          <img
            src={`${PLACEHOLDER_IMAGE_BASE}/${product.id}/400/400`}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover/link:scale-[1.02] motion-reduce:transition-none"
          />
        </div>
        <CardContent className="flex flex-col gap-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug">
              {product.name}
            </h3>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            {product.category.name}
          </Badge>
          <p className="text-base font-semibold">
            {priceFormatter.format(product.price)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="h-full gap-0 pt-0">
      <Skeleton className="aspect-square w-full rounded-t-xl rounded-b-none" />
      <CardContent className="flex flex-col gap-2 pt-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </CardContent>
    </Card>
  );
}
