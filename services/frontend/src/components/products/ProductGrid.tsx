import { Search } from 'lucide-react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import type { ProductResponse } from '@/types/product';

interface ProductGridProps {
  products: ProductResponse[];
  isLoading: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
        <h3 className="text-lg font-medium">No products found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try adjusting your search or filter criteria to find what you are looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
