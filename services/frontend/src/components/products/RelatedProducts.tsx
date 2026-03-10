import { useProducts } from '@/hooks/use-products';
import { ProductCard } from './ProductCard';
import { Separator } from '@/components/ui/separator';

interface RelatedProductsProps {
  categoryName: string;
  currentProductId: string;
}

export function RelatedProducts({ categoryName, currentProductId }: RelatedProductsProps) {
  const { data } = useProducts({ category: categoryName, size: '5' });

  const related = (data?.content ?? [])
    .filter((p) => p.id !== currentProductId)
    .slice(0, 4);

  if (related.length === 0) {
    return null;
  }

  return (
    <section aria-label="Related products">
      <Separator className="mb-8" />
      <h2 className="mb-6 text-xl font-semibold tracking-tight">Related Products</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
