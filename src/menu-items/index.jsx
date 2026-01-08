// project imports
import employeeMenu from './employee';
import managerMenu from './manager';
import adminMenu from './admin';

// ==============================|| MENU ITEMS ||============================== //

/**
 * Get menu items based on user role
 * @param {string} role - User role (EMPLOYEE, MANAGER, ADMIN)
 * @returns {object} Menu items configuration
 */
export default function getMenuItems(role) {
  // Normalize role to uppercase for case-insensitive matching
  const normalizedRole = role ? String(role).toUpperCase() : '';
  
  switch (normalizedRole) {
    case 'ADMIN':
      return {
        items: [adminMenu]
      };
    case 'MANAGER':
      return {
        items: [managerMenu]
      };
    case 'EMPLOYEE':
      return {
        items: [employeeMenu]
      };
    default:
      return {
        items: []
      };
  }
}

// Export individual menus for direct use if needed
export { employeeMenu, managerMenu, adminMenu };
