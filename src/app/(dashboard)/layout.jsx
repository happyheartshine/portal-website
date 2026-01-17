'use client';

import PropTypes from 'prop-types';
import DashboardLayout from '@/layout/Dashboard';
import RouteGuard from '@/components/guards/RouteGuard';

// ==============================|| DASHBOARD LAYOUT ||============================== //

export default function Layout({ children }) {
  return (
    <RouteGuard allowedRoles={['EMPLOYEE', 'MANAGER', 'ADMIN']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RouteGuard>
  );
}

Layout.propTypes = { children: PropTypes.node };
