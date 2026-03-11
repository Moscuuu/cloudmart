import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        state={{ from: location.pathname, authRequired: true }}
        replace
      />
    );
  }

  return <>{children}</>;
}
