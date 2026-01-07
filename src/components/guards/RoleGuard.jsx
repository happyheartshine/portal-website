'use client';

import { useAuth } from '@/contexts/AuthContext';
import { hasRole } from '@/lib/auth';

/**
 * RoleGuard component to conditionally render content based on user role
 * @param {React.ReactNode} children - Child components to render if user has required role
 * @param {Array<string>} allowedRoles - Array of roles that can see this content
 * @param {React.ReactNode} fallback - Optional fallback content if user doesn't have required role
 */
export function RoleGuard({ children, allowedRoles, fallback = null }) {
  const { user, loading } = useAuth();

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // User not authenticated
  if (!user) {
    return fallback;
  }

  // Check if user has required role
  if (!hasRole(user.role, allowedRoles)) {
    return fallback;
  }

  // User has required role - render children
  return <>{children}</>;
}

export default RoleGuard;

