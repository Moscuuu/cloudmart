import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useDebouncedValue } from '@/hooks/use-debounce';

const CATEGORIES = ['Computers', 'Audio', 'Accessories', 'Peripherals'];

export interface FilterValues {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
}

interface ProductFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
}

function FilterPanel({ filters, onFilterChange }: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Track whether we are the source of the change to avoid echo loops
  const isLocalChange = useRef(false);

  // Sync debounced search value to parent when it changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      isLocalChange.current = true;
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync parent search value back to local input (e.g. when filters are cleared externally)
  useEffect(() => {
    if (!isLocalChange.current && filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
    isLocalChange.current = false;
  }, [filters.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryToggle = useCallback(
    (category: string) => {
      const current = filters.category;
      const categories = current ? current.split(',') : [];
      const updated = categories.includes(category)
        ? categories.filter((c) => c !== category)
        : [...categories, category];
      onFilterChange({ ...filters, category: updated.join(',') });
    },
    [filters, onFilterChange],
  );

  const handlePriceChange = useCallback(
    (field: 'minPrice' | 'maxPrice', value: string) => {
      onFilterChange({ ...filters, [field]: value });
    },
    [filters, onFilterChange],
  );

  const hasActiveFilters =
    filters.search || filters.category || filters.minPrice || filters.maxPrice;

  const clearFilters = useCallback(() => {
    setSearchInput('');
    onFilterChange({ search: '', category: '', minPrice: '', maxPrice: '' });
  }, [onFilterChange]);

  const selectedCategories = filters.category ? filters.category.split(',') : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          aria-label="Search products"
        />
      </div>

      <Separator />

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-medium">Categories</h4>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((category) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              {category}
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-medium">Price Range</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="minPrice" className="sr-only">
              Minimum price
            </Label>
            <Input
              id="minPrice"
              type="number"
              placeholder="Min"
              min={0}
              value={filters.minPrice}
              onChange={(e) => handlePriceChange('minPrice', e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground">to</span>
          <div className="flex-1">
            <Label htmlFor="maxPrice" className="sr-only">
              Maximum price
            </Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="Max"
              min={0}
              value={filters.maxPrice}
              onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </Button>
        </>
      )}
    </div>
  );
}

export function ProductFilters(props: ProductFiltersProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="Product filters">
        <div className="sticky top-20">
          <FilterPanel {...props} />
        </div>
      </aside>

      {/* Mobile sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="cursor-pointer" />
            }
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Narrow down products</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              <FilterPanel {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
