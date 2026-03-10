import { Outlet } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { CartProvider } from '@/providers/CartProvider';
import { Header } from './Header';
import { Footer } from './Footer';

export function RootLayout() {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <Footer />
        <Toaster />
      </div>
    </CartProvider>
  );
}
