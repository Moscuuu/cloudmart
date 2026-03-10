import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchOrder } from '@/api/orders';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
};

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Order not found</h2>
        <p className="text-muted-foreground">
          We could not find an order with that ID.
        </p>
        <Button
          render={<Link to="/" />}
          className="mt-2 cursor-pointer"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2
          className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-green-900 dark:text-green-100">
            Order placed successfully!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Your order has been received and is being processed.
          </p>
        </div>
      </div>

      {/* Order details */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Order Details</h2>
          <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'}>
            {order.status}
          </Badge>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Order ID</p>
            <p className="font-mono text-xs">{order.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p>{dateFormatter.format(new Date(order.created_at))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p>{order.customer_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{order.customer_email}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Shipping Address</p>
            <p className="whitespace-pre-line">{order.shipping_address}</p>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.product_name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {priceFormatter.format(item.unit_price)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {priceFormatter.format(item.line_total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order total */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <span className="text-lg font-semibold">Order Total</span>
        <span className="text-xl font-bold tabular-nums">
          {priceFormatter.format(order.total_amount)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          render={<Link to={`/orders?email=${encodeURIComponent(order.customer_email)}`} />}
          className="cursor-pointer"
        >
          View Order History
        </Button>
        <Button
          render={<Link to="/" />}
          className="cursor-pointer"
        >
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}
