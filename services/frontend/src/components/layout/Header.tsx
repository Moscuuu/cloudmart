import { Link } from 'react-router';
import { LogIn, LogOut, Menu, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useState } from 'react';
import { useAuth } from '@/auth/useAuth';

import { useGoogleLogin } from '@react-oauth/google';

const NAV_LINKS = [
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Order History' },
] as const;

function GoogleSignInButton() {
  const { login } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (response) => {
      setIsLoggingIn(true);
      try {
        await login(response.code);
      } catch {
        // Error handled by AuthProvider
      } finally {
        setIsLoggingIn(false);
      }
    },
    onError: () => {
      setIsLoggingIn(false);
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => googleLogin()}
      disabled={isLoggingIn}
      className="cursor-pointer gap-2"
    >
      <LogIn className="h-4 w-4" aria-hidden="true" />
      {isLoggingIn ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}

/** Renders GoogleSignInButton only when GoogleOAuthProvider is active (VITE_GOOGLE_CLIENT_ID set) */
function SignInGate() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        OAuth not configured
      </Button>
    );
  }
  return <GoogleSignInButton />;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm">
        <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {user?.name ?? user?.email ?? 'User'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="cursor-pointer gap-1"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

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
          <CartDrawer />
          <Separator orientation="vertical" className="mx-1 h-6" />
          {!isLoading && (isAuthenticated ? <UserMenu /> : <SignInGate />)}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          <CartDrawer />

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
                <Separator className="my-2" />
                {!isLoading && (
                  isAuthenticated ? <UserMenu /> : <SignInGate />
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
