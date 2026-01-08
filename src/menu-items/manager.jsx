// Manager menu items - Manager-only features
const managerMenu = {
  id: 'manager',
  title: 'Manager',
  type: 'group',
  children: [
    {
      id: 'management-dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/manager/dashboard',
      icon: 'ph ph-gauge',
      breadcrumbs: true
    },
    {
      id: 'management-orders',
      title: 'Verify Orders',
      type: 'item',
      url: '/manager/orders',
      icon: 'ph ph-shopping-cart',
      breadcrumbs: true
    },
    {
      id: 'management-refunds',
      title: 'Process Refunds',
      type: 'item',
      url: '/manager/refunds',
      icon: 'ph ph-receipt',
      breadcrumbs: true
    },
    {
      id: 'management-discipline',
      title: 'Discipline',
      type: 'item',
      url: '/manager/discipline',
      icon: 'ph ph-warning',
      breadcrumbs: true
    },
    {
      id: 'management-deduction',
      title: 'Deduction',
      type: 'item',
      url: '/manager/deduction',
      icon: 'ph ph-minus-circle',
      breadcrumbs: true
    },
    {
      id: 'management-coupon-audit',
      title: 'Coupon Audit',
      type: 'item',
      url: '/manager/coupon-audit',
      icon: 'ph ph-ticket',
      breadcrumbs: true
    }
  ]
};

export default managerMenu;

