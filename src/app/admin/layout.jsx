import PropTypes from 'prop-types';
import RouteGuard from '@/components/guards/RouteGuard';
import DashboardLayout from '@/layout/Dashboard';

// ==============================|| ADMIN LAYOUT ||============================== //

export default function AdminLayout({ children }) {
  return (
    <RouteGuard allowedRoles={['ADMIN']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RouteGuard>
  );
}

AdminLayout.propTypes = { children: PropTypes.node };


