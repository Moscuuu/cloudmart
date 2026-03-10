import { Link } from 'react-router';
import { Menu, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'Products' },
  { to: '/orders', label: 'Order History' },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Cart count will be wired to CartProvider in a future plan
  const cartCount = 0;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-colors hover:text-primary/80 cursor-pointer"
        >
          <Package className="h-5 w-5" aria-hidden="true" />
          CloudMart
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.to}
              variant="ghost"
              size="sm"
              render={<Link to={link.to} />}
              className="cursor-pointer"
            >
              {link.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/cart" aria-label={`Cart with ${cartCount} items`} />}
            className="relative cursor-pointer"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {cartCount}
              </Badge>
            )}
          </Button>
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/cart" aria-label={`Cart with ${cartCount} items`} />}
            className="relative cursor-pointer"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {cartCount}
              </Badge>
            )}
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
              <Separator className="my-4" />
              <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                {NAV_LINKS.map((link) => (
                  <Button
                    key={link.to}
                    variant="ghost"
                    className="w-full justify-start cursor-pointer"
                    render={<Link to={link.to} />}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
