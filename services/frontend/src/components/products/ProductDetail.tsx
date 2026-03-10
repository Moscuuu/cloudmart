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
import { useCart } from '@/hooks/use-cart';
import { useInventory } from '@/hooks/use-products';
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

/** Generate a deterministic picsum URL for a product (matches ProductCard). */
function productImageUrl(productId: string): string {
  const seed = productId.replace(/-/g, '').slice(0, 8);
  return `https://picsum.photos/seed/${seed}/600/600`;
}

interface ProductDetailProps {
  product: ProductResponse;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem, items } = useCart();
  const { data: inventory } = useInventory(product.id);
  const isOutOfStock = inventory?.availableQuantity === 0;
  const cartItem = items.find((i) => i.productId === product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: productImageUrl(product.id),
    });
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
            disabled={isOutOfStock}
            className="mt-2 min-h-[44px] cursor-pointer disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {isOutOfStock
              ? 'Out of Stock'
              : cartItem
                ? `In Cart (${cartItem.quantity}) - Add More`
                : 'Add to Cart'}
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
