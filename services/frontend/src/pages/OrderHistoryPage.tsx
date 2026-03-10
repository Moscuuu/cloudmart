import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchOrdersByEmail } from '@/api/orders';

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

const EMAIL_STORAGE_KEY = 'cloudmart-email';

export function OrderHistoryPage() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(() => {
    if (emailFromUrl) return emailFromUrl;
    try {
      return localStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [searchEmail, setSearchEmail] = useState(emailFromUrl);

  // Auto-search if email came from URL
  useEffect(() => {
    if (emailFromUrl) {
      setSearchEmail(emailFromUrl);
    }
  }, [emailFromUrl]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['orders', 'list', searchEmail],
    queryFn: () => fetchOrdersByEmail(searchEmail),
    enabled: !!searchEmail,
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim()) {
      setSearchEmail(email.trim());
      try {
        localStorage.setItem(EMAIL_STORAGE_KEY, email.trim());
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Order History</h1>

      {/* Email search */}
      <form onSubmit={handleSearch} className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="order-email">Email Address</Label>
          <Input
            id="order-email"
            type="email"
            required
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px]"
          />
        </div>
        <Button
          type="submit"
          disabled={isFetching}
          className="min-h-[44px] cursor-pointer"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Look Up Orders
        </Button>
      </form>

      <Separator />

      {/* Loading state */}
      {isLoading && searchEmail && (
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
          <h2 className="text-xl font-semibold">No orders found</h2>
          <p className="text-muted-foreground">
            No orders found for this email address.
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

      {/* No search yet */}
      {!searchEmail && !isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Search
            className="h-16 w-16 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold">Look up your orders</h2>
          <p className="text-muted-foreground">
            Enter your email address to find your past orders.
          </p>
        </div>
      )}
    </div>
  );
}
