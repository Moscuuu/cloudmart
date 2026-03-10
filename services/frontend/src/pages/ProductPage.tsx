import { useParams, Link } from 'react-router';
import { useProduct } from '@/hooks/use-products';
import { ProductDetail } from '@/components/products/ProductDetail';
import { RelatedProducts } from '@/components/products/RelatedProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronRight, PackageX } from 'lucide-react';

function ProductPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </div>
  );
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(id ?? '');

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageX className="h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button
          render={<Link to="/" />}
          className="cursor-pointer"
        >
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors duration-200 hover:text-foreground">
              Products
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </li>
          <li className="font-medium text-foreground" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Product detail */}
      <ProductDetail product={product} />

      {/* Related products */}
      <RelatedProducts
        categoryName={product.category.name}
        currentProductId={product.id}
      />
    </div>
  );
}
