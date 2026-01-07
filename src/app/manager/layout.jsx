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

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
