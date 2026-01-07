# Frontend Authentication - Quick Reference

## API Client Usage

### Login
```javascript
import { authApi } from '@/lib/apiClient';

const result = await authApi.login('user@example.com', 'password123');
// Response: { access_token, refresh_token, user: { id, email, name, role } }
```

### Get Profile
```javascript
const profile = await authApi.getProfile();
// Response: { id, name, email, role, ratePerOrder, isActive, createdAt, updatedAt }
```

### Request Password Reset
```javascript
const result = await authApi.requestPasswordReset('user@example.com');
// Response: { message: "If the email exists, a password reset OTP has been sent." }
```

### Confirm Password Reset
```javascript
const result = await authApi.confirmPasswordReset({
  email: 'user@example.com',
  otp: '123456',
  newPassword: 'newPassword123'
});
// Response: { message: "Password has been reset successfully" }
```

## Auth Context Usage

### In Components
```javascript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading, login, logout, refreshUser } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Login Handler
```javascript
const handleLogin = async () => {
  const result = await login(email, password);
  if (result.success) {
    console.log('Logged in:', result.user);
    // Automatic redirect based on role
  } else {
    console.error('Login failed:', result.error);
  }
};
```

## Route Protection

### RouteGuard Component
```javascript
import { RouteGuard } from '@/components/guards/RouteGuard';

export default function AdminPage() {
  return (
    <RouteGuard allowedRoles={['ADMIN']}>
      <div>Admin Only Content</div>
    </RouteGuard>
  );
}
```

### RoleGuard Component
```javascript
import { RoleGuard } from '@/components/guards/RoleGuard';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
        <div>Admin and Manager can see this</div>
      </RoleGuard>
      
      <RoleGuard allowedRoles={['EMPLOYEE']}>
        <div>Employees can see this</div>
      </RoleGuard>
    </div>
  );
}
```

## Auth Helpers

### Check Authentication
```javascript
import { isAuthenticated } from '@/lib/auth';

if (isAuthenticated()) {
  console.log('User is logged in');
}
```

### Get Role Landing Page
```javascript
import { getRoleLandingPage } from '@/lib/auth';

const landingPage = getRoleLandingPage('ADMIN'); // '/admin/dashboard'
const landingPage = getRoleLandingPage('MANAGER'); // '/manager/dashboard'
const landingPage = getRoleLandingPage('EMPLOYEE'); // '/dashboard'
```

### Check Role Permission
```javascript
import { hasRole } from '@/lib/auth';

const userRole = 'MANAGER';
const allowed = hasRole(userRole, ['ADMIN', 'MANAGER']); // true
```

### Check Role Hierarchy
```javascript
import { canAccessRole } from '@/lib/auth';

const userRole = 'ADMIN';
const canAccess = canAccessRole(userRole, 'EMPLOYEE'); // true (ADMIN can access EMPLOYEE routes)
```

### Manual Token Management
```javascript
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';

// Get tokens
const accessToken = getAccessToken();
const refreshToken = getRefreshToken();

// Set tokens
setTokens('new-access-token', 'new-refresh-token');

// Clear tokens (logout)
clearTokens();
```

## Role Constants
```javascript
import { ROLES } from '@/lib/auth';

console.log(ROLES.EMPLOYEE); // 'EMPLOYEE'
console.log(ROLES.MANAGER);  // 'MANAGER'
console.log(ROLES.ADMIN);    // 'ADMIN'
```

## User Object Structure
```typescript
interface User {
  id: string;                // UUID
  email: string;             // user@example.com
  name: string;              // "John Doe"
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  ratePerOrder?: number;     // 15.0 (optional)
  isActive: boolean;         // true
  createdAt: string;         // ISO date string
  updatedAt: string;         // ISO date string
}
```

## Error Handling

### Login Errors
```javascript
const result = await login(email, password);
if (!result.success) {
  // Common errors:
  // - "Invalid credentials"
  // - "Email and password are required"
  // - Network errors
  console.error(result.error);
}
```

### API Errors
```javascript
import { employeeApi } from '@/lib/apiClient';

try {
  const data = await employeeApi.getDashboard();
} catch (error) {
  if (error.response?.status === 401) {
    console.log('Token expired, will auto-refresh');
  } else if (error.response?.status === 403) {
    console.log('Forbidden - insufficient permissions');
  } else if (error.response?.status === 404) {
    console.log('Resource not found');
  } else {
    console.log('Network or server error');
  }
}
```

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NODE_ENV=development
```

### Backend (src/api/.env)
```bash
PORT=8080
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=postgresql://...
```

## Common Patterns

### Protected Page Layout
```javascript
// app/(dashboard)/layout.jsx
import { RouteGuard } from '@/components/guards/RouteGuard';

export default function DashboardLayout({ children }) {
  return (
    <RouteGuard allowedRoles={['EMPLOYEE', 'MANAGER', 'ADMIN']}>
      <div className="dashboard-layout">
        {children}
      </div>
    </RouteGuard>
  );
}
```

### Conditional Rendering by Role
```javascript
import { useAuth } from '@/contexts/AuthContext';

function Header() {
  const { user } = useAuth();
  
  return (
    <header>
      {user?.role === 'ADMIN' && <AdminMenu />}
      {user?.role === 'MANAGER' && <ManagerMenu />}
      {user?.role === 'EMPLOYEE' && <EmployeeMenu />}
    </header>
  );
}
```

### Fetching Data with Auth
```javascript
import { employeeApi } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

function DashboardStats() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await employeeApi.getDashboard();
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>Stats: {JSON.stringify(data)}</div>;
}
```

## Debugging Tips

### Check Token Status
```javascript
// In browser console:
console.log('Access Token:', sessionStorage.getItem('access_token'));
console.log('Refresh Token:', sessionStorage.getItem('refresh_token'));
```

### Decode JWT Token
```javascript
// In browser console:
const token = sessionStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);
console.log('Expires at:', new Date(payload.exp * 1000));
```

### Force Token Refresh
```javascript
// In browser console:
// Method 1: Wait for expiry (15 min)
// Method 2: Corrupt the token
sessionStorage.setItem('access_token', 'invalid-token');
// Next API call will trigger refresh
```

### Clear Auth State
```javascript
// In browser console:
sessionStorage.clear();
window.location.reload();
```

## Test Credentials

```
Admin:
  Email: admin@portal.com
  Password: admin123
  
Manager:
  Email: manager@portal.com
  Password: manager123
  
Employee:
  Email: employee@portal.com
  Password: employee123
```

## API Endpoints

```
Base URL: http://localhost:8080/api

Auth:
  POST   /auth/login           - Login
  POST   /auth/refresh         - Refresh token
  GET    /auth/profile         - Get profile
  POST   /auth/reset/request   - Request password reset
  POST   /auth/reset/confirm   - Confirm password reset

Employee:
  GET    /me/dashboard         - Dashboard data
  GET    /me/orders/trends     - Order trends
  GET    /me/warnings          - Get warnings
  POST   /me/warnings/:id/read - Mark warning as read
  POST   /me/attendance/mark   - Mark attendance
  GET    /me/attendance        - Get attendance
  POST   /me/orders            - Create order
  GET    /me/orders            - Get orders
  POST   /me/refunds           - Create refund
  GET    /me/refunds           - Get refunds
  POST   /me/coupons/generate  - Generate coupon
  POST   /me/coupons/honor     - Honor coupon
  GET    /me/coupons/history   - Coupon history

Manager:
  GET    /manager/dashboard/stats      - Dashboard stats
  GET    /manager/orders/pending       - Pending orders
  POST   /manager/orders/:id/approve   - Approve order
  GET    /manager/refunds/pending      - Pending refunds
  POST   /manager/refunds/:id/process  - Process refund
  POST   /manager/warnings             - Issue warning
  GET    /manager/attendance/today     - Team attendance today
  GET    /manager/attendance           - Team attendance
  GET    /manager/coupons/search       - Search coupon

Admin:
  GET    /admin/users                  - Get users
  POST   /admin/users                  - Create user
  DELETE /admin/users/:id              - Delete user
  GET    /admin/analytics/orders       - Order analytics
  GET    /admin/analytics/refunds      - Refund analytics
  GET    /admin/analytics/credits      - Credit analytics
  GET    /admin/liability/pending-salary - Pending salary
  POST   /admin/purge                  - Purge data
  POST   /admin/warnings               - Issue warning
```

## Support

- API Documentation: http://localhost:8080/docs
- Backend Code: `src/api/src/`
- Frontend Code: `src/`
- Auth Documentation: `AUTH_IMPROVEMENTS.md`
- Summary: `FRONTEND_AUTH_SUMMARY.md`
- Environment Config: `ENV_CONFIG.md`

