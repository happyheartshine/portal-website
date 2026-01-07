import PropTypes from 'prop-types';
import RouteGuard from '@/components/guards/RouteGuard';
import DashboardLayout from '@/layout/Dashboard';

// ==============================|| MANAGER LAYOUT ||============================== //

export default function ManagerLayout({ children }) {
  return (
    <RouteGuard allowedRoles={['MANAGER', 'ADMIN']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RouteGuard>
  );
}

ManagerLayout.propTypes = { children: PropTypes.node };


