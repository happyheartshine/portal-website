// Employee menu items
const employeeMenu = {
  id: 'employee',
  title: 'Employee',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/dashboard',
      icon: 'ph ph-gauge',
      breadcrumbs: true
    },
    {
      id: 'attendance',
      title: 'Attendance',
      type: 'item',
      url: '/attendance',
      icon: 'ph ph-calendar-check',
      breadcrumbs: true
    },
    {
      id: 'orders',
      title: 'Orders',
      type: 'item',
      url: '/orders',
      icon: 'ph ph-shopping-cart',
      breadcrumbs: true
    },
    {
      id: 'refunds',
      title: 'Refunds',
      type: 'item',
      url: '/refunds',
      icon: 'ph ph-receipt',
      breadcrumbs: true
    },
    {
      id: 'coupons',
      title: 'Coupons',
      type: 'item',
      url: '/coupons',
      icon: 'ph ph-ticket',
      breadcrumbs: true
    },
    {
      id: 'warnings',
      title: 'Warnings',
      type: 'item',
      url: '/warnings',
      icon: 'ph ph-warning',
      breadcrumbs: true
    }
  ]
};

export default employeeMenu;

