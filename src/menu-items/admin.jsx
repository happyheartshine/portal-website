// Admin menu items
const adminMenu = {
  id: 'admin',
  title: 'Admin',
  type: 'group',
  children: [
    {
      id: 'admin-dashboard',
      title: 'Dashboard',
      type: 'item',
      url: '/admin/dashboard',
      icon: 'ph ph-gauge',
      breadcrumbs: true
    },
    {
      id: 'admin-users',
      title: 'User Management',
      type: 'item',
      url: '/admin/users',
      icon: 'ph ph-users',
      breadcrumbs: true
    },
    {
      id: 'admin-purge',
      title: 'Data Purge',
      type: 'item',
      url: '/admin/purge',
      icon: 'ph ph-trash',
      breadcrumbs: true
    }
  ]
};

export default adminMenu;

