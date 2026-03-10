import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { ProductImageGallery } from './ProductImageGallery';
import { StockBadge } from './StockBadge';
import type { ProductResponse } from '@/types/product';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

interface ProductDetailProps {
  product: ProductResponse;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const handleAddToCart = () => {
    toast.success(`Added ${product.name} to cart`);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Image gallery */}
        <ProductImageGallery productId={product.id} productName={product.name} />

        {/* Product info */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
              {product.name}
            </h1>
            <Badge variant="secondary" className="w-fit">
              {product.category.name}
            </Badge>
          </div>

          <p className="text-3xl font-bold">
            {priceFormatter.format(product.price)}
          </p>

          <StockBadge productId={product.id} />

          <p className="leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <Button
            size="lg"
            onClick={handleAddToCart}
            className="mt-2 min-h-[44px] cursor-pointer"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            Add to Cart
          </Button>

          {/* Specs table */}
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Specifications
            </h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">SKU</TableCell>
                  <TableCell>{product.sku}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Category</TableCell>
                  <TableCell>{product.category.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  <TableCell className="capitalize">{product.status.toLowerCase()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Added</TableCell>
                  <TableCell>{dateFormatter.format(new Date(product.createdAt))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
