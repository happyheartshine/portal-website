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

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
