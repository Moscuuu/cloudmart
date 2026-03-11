import { createBrowserRouter, RouterProvider, Link, useRouteError, isRouteErrorResponse } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ProtectedRoute } from '@/auth/ProtectedRoute';

import { HomePage } from '@/pages/HomePage';
import { ProductPage } from '@/pages/ProductPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import { OrderHistoryPage } from '@/pages/OrderHistoryPage';

/* -- Error boundary -- */

function ErrorBoundary() {
  const error = useRouteError();
  let message = 'An unexpected error occurred.';

  if (isRouteErrorResponse(error)) {
    message = error.statusText || `Error ${error.status}`;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-16 w-16 text-destructive" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{message}</p>
      <Button render={<Link to="/" />} className="cursor-pointer">
        Back to home
      </Button>
    </div>
  );
}

/* -- Router -- */

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <HomePage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/:id/confirmation',
        element: (
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute>
            <OrderHistoryPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
