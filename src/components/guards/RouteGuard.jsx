'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLandingPage, hasRole } from '@/lib/auth';

/**
 * RouteGuard component to protect routes based on authentication and roles
 * @param {React.ReactNode} children - Child components to render if authorized
 * @param {Array<string>} allowedRoles - Array of roles that can access this route
 */
export function RouteGuard({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!user) {
        router.push('/login');
        return;
      }

      // Authenticated but wrong role - redirect to role-specific home
      if (allowedRoles && !hasRole(user.role, allowedRoles)) {
        const landingPage = getRoleLandingPage(user.role);
        router.push(landingPage);
      }
    }
  }, [user, loading, allowedRoles, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Wrong role
  if (allowedRoles && !hasRole(user.role, allowedRoles)) {
    return null;
  }

  // Authorized - render children
  return <>{children}</>;
}

export default RouteGuard;

