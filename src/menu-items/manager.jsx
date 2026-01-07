// Manager menu items
const managerMenu = {
  id: 'manager',
  title: 'Manager',
  type: 'group',
  children: [
    {
      id: 'manager-dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/manager/dashboard',
      icon: 'ph ph-gauge',
      breadcrumbs: true
    },
    {
      id: 'manager-orders',
      title: 'Order Approvals',
      type: 'item',
      url: '/manager/orders',
      icon: 'ph ph-shopping-cart',
      breadcrumbs: true
    },
    {
      id: 'manager-refunds',
      title: 'Refund Processing',
      type: 'item',
      url: '/manager/refunds',
      icon: 'ph ph-receipt',
      breadcrumbs: true
    },
    {
      id: 'manager-attendance',
      title: 'Team Attendance',
      type: 'item',
      url: '/manager/attendance',
      icon: 'ph ph-calendar-check',
      breadcrumbs: true
    },
    {
      id: 'manager-discipline',
      title: 'Issue Warning',
      type: 'item',
      url: '/manager/discipline',
      icon: 'ph ph-warning',
      breadcrumbs: true
    },
    {
      id: 'manager-coupon-audit',
      title: 'Coupon Audit',
      type: 'item',
      url: '/manager/coupon-audit',
      icon: 'ph ph-ticket',
      breadcrumbs: true
    }
  ]
};

export default managerMenu;

