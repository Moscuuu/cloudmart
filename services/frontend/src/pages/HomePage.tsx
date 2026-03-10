import { useSearchParams } from 'react-router';
import { useProducts } from '@/hooks/use-products';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters, type FilterValues } from '@/components/products/ProductFilters';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { useCallback } from 'react';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FilterValues = {
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
  };

  const page = Number(searchParams.get('page') ?? '0');

  // Build query params for the API
  const queryParams: Record<string, string> = {
    page: String(page),
    size: String(DEFAULT_PAGE_SIZE),
  };

  if (filters.search) queryParams.search = filters.search;
  if (filters.category) queryParams.category = filters.category;
  if (filters.minPrice) queryParams.minPrice = filters.minPrice;
  if (filters.maxPrice) queryParams.maxPrice = filters.maxPrice;

  const { data, isLoading } = useProducts(queryParams);

  const handleFilterChange = useCallback(
    (newFilters: FilterValues) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.category) params.set('category', newFilters.category);
      if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
      if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
      // Reset to page 0 when filters change
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      if (newPage === 0) {
        params.delete('page');
      } else {
        params.set('page', String(newPage));
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          {/* Mobile filter trigger rendered inline with heading */}
          <div className="lg:hidden">
            <ProductFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>
        {data && !data.empty && (
          <p className="text-sm text-muted-foreground">
            Showing {data.content.length} of {data.totalElements} products
          </p>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-8">
        {/* Desktop sidebar only */}
        <div className="hidden lg:block">
          <ProductFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Product grid */}
        <div className="flex-1">
          <ProductGrid
            products={data?.content ?? []}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={data.first}
                onClick={() => goToPage(page - 1)}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.number + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.last}
                onClick={() => goToPage(page + 1)}
                className="cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
