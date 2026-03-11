import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchOrdersByEmail } from '@/api/orders';
import { useAuth } from '@/auth/useAuth';

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
};

export function OrderHistoryPage() {
  const { user } = useAuth();
  const email = user?.email ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'list', email],
    queryFn: () => fetchOrdersByEmail(email),
    enabled: !!email,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Order History</h1>
        {email && (
          <p className="mt-1 text-sm text-muted-foreground">
            Showing orders for {email}
          </p>
        )}
      </div>

      <Separator />

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.orders.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Package
            className="h-16 w-16 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold">No orders yet</h2>
          <p className="text-muted-foreground">
            You haven't placed any orders yet. Start browsing our products!
          </p>
          <Button
            render={<Link to="/" />}
            className="mt-2 cursor-pointer"
          >
            Start Shopping
          </Button>
        </div>
      )}

      {/* Order cards */}
      {data && data.orders.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {data.total} order{data.total !== 1 ? 's' : ''} found
          </p>
          {data.orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {order.id}
                  </p>
                  <p className="text-sm">
                    {dateFormatter.format(new Date(order.created_at))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'secondary'}>
                    {order.status}
                  </Badge>
                  <span className="text-lg font-bold tabular-nums">
                    {priceFormatter.format(order.total_amount)}
                  </span>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  {' - '}
                  {order.items.map((i) => i.product_name).join(', ')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={`/orders/${order.id}/confirmation`} />}
                  className="cursor-pointer"
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
