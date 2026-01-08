import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token from sessionStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Don't add Authorization header for public auth endpoints
      const isPublicAuthEndpoint = config.url?.includes('/auth/login') || 
                                   config.url?.includes('/auth/refresh') ||
                                   config.url?.includes('/auth/reset');
      
      if (!isPublicAuthEndpoint) {
        const token = sessionStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't attempt token refresh for auth endpoints (login, refresh, password reset)
    // These endpoints return 401 for invalid credentials, not expired tokens
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                           originalRequest.url?.includes('/auth/refresh') ||
                           originalRequest.url?.includes('/auth/reset');

    // Handle 401 errors (token expired) - but not for auth endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const refreshToken = sessionStorage.getItem('refresh_token');
        
        // Only attempt refresh if we have a refresh token
        if (refreshToken) {
          try {
            // Use direct axios call to avoid interceptor recursion
            const response = await axios.post(
              `${API_URL}/api/auth/refresh`,
              { refresh_token: refreshToken },
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            const { access_token } = response.data;
            
            // Update token in storage
            sessionStorage.setItem('access_token', access_token);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Refresh failed, clear tokens
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            
            // Don't redirect here - let components handle redirects
            // This prevents interference with bootstrap and other error handling
            return Promise.reject(error); // Return original error, not refresh error
          }
        } else {
          // No refresh token available, clear tokens
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          
          // Don't redirect here - let components handle redirects
          // Return the original error so components can handle it
        }
      }
    }

    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const authApi = {
  login: (email, password) => {
    if (!email || !password) {
      return Promise.reject(new Error('Email and password are required'));
    }
    return api.post('/auth/login', { email, password });
  },
  
  refresh: (refreshToken) => {
    if (!refreshToken) {
      return Promise.reject(new Error('Refresh token is required'));
    }
    return api.post('/auth/refresh', { refresh_token: refreshToken });
  },
  
  getProfile: () => api.get('/auth/profile'),
  
  requestPasswordReset: (email) => {
    if (!email) {
      return Promise.reject(new Error('Email is required'));
    }
    return api.post('/auth/reset/request', { email });
  },
  
  confirmPasswordReset: (data) => {
    if (!data.email || !data.otp || !data.newPassword) {
      return Promise.reject(new Error('Email, OTP, and new password are required'));
    }
    return api.post('/auth/reset/confirm', data);
  }
};

// ==================== EMPLOYEE API ====================

export const employeeApi = {
  // Dashboard
  getDashboard: (month) => api.get('/me/dashboard', { params: { month } }),
  getOrderTrends: (range) => api.get('/me/orders/trends', { params: { range } }),

  // Warnings
  getWarnings: () => api.get('/me/warnings'),
  markWarningRead: (id) => api.post(`/me/warnings/${id}/read`),

  // Attendance
  markAttendance: () => api.post('/me/attendance/mark'),
  getAttendance: (month) => api.get('/me/attendance', { params: { month } }),

  // Orders
  createOrder: (data) => api.post('/me/orders', data),
  getOrders: (month) => api.get('/me/orders', { params: { month } }),
  getApprovedOrders: (cursor, limit) => 
    api.get('/orders/approved', { params: { cursor, limit } }),

  // Refunds
  createRefund: (formData) =>
    api.post('/me/refunds', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getRefunds: (status, cursor, limit) => 
    api.get('/me/refunds', { params: { status, cursor, limit } }),
  updateRefund: (id, formData) =>
    api.put(`/me/refunds/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  searchRefunds: (q, amount, cursor, limit) =>
    api.get('/me/refunds/search', { params: { q, amount, cursor, limit } }),
  confirmRefundInformed: (id) => api.post(`/me/refunds/${id}/confirm-informed`),

  // Coupons
  generateCoupon: (data) => api.post('/me/coupons/generate', data),
  honorCoupon: (code) => api.post('/me/coupons/honor', { code }),
  getCouponHistory: () => api.get('/me/coupons/history'),
  getCoupon: (code) => api.get(`/coupons/${code}`),
  sendCoupon: (code) => api.post(`/coupons/${code}/send`),
  sendCouponCredit: (code) => api.post(`/coupons/${code}/send-credit`),
  clearCouponBalance: (code, amount) => 
    api.post(`/coupons/${code}/clear-full`, { amount })
};

// ==================== MANAGER API ====================

export const managerApi = {
  // Dashboard
  getDashboardStats: () => api.get('/manager/dashboard/stats'),
  getDashboardSummary: () => api.get('/management/dashboard/summary'),
  getDailyOrdersThisMonth: () => api.get('/analytics/orders/daily-this-month'),
  getMonthlyOrdersLast3: () => api.get('/analytics/orders/monthly-last-3'),

  // Orders
  getPendingOrders: () => api.get('/manager/orders/pending'),
  getManagementOrders: (params) => 
    api.get('/management/orders', { params }),
  approveOrder: (id, data) => api.post(`/manager/orders/${id}/approve`, data),
  approveManagementOrder: (orderId) => 
    api.post(`/management/orders/${orderId}/approve`),
  getApprovedOrders: (cursor, limit) => 
    api.get('/orders/approved', { params: { cursor, limit } }),
  getDailyOrdersRecent: (days = 14) => 
    api.get('/analytics/orders/daily-recent', { params: { days } }),

  // Refunds
  getPendingRefunds: () => api.get('/manager/refunds/pending'),
  getRefunds: (status, cursor, limit) => 
    api.get('/refunds', { params: { status, cursor, limit } }),
  getManagementRefunds: (params) => 
    api.get('/management/refunds', { params }),
  searchRefunds: (q, amount, cursor, limit) =>
    api.get('/refunds/search', { params: { q, amount, cursor, limit } }),
  updateRefund: (id, formData) =>
    api.put(`/refunds/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  processRefund: (id) => api.post(`/manager/refunds/${id}/process`),
  processManagementRefund: (refundId, data) => 
    api.post(`/management/refunds/${refundId}/process`, data),
  confirmRefundNotified: (id) => api.post(`/refunds/${id}/confirm-notified`),

  // Warnings
  issueWarning: (data) => api.post('/manager/warnings', data),
  getWarnings: (params) => 
    api.get('/manager/warnings', { params }),

  // Employees
  getEmployeeOptions: () => api.get('/employees/options'),

  // Deductions
  getDeductionReasons: () => api.get('/management/deductions/reasons'),
  createDeduction: (data) => api.post('/management/deductions', data),

  // Attendance
  getTeamAttendanceToday: () => api.get('/manager/attendance/today'),
  getTeamAttendance: (date) => api.get('/manager/attendance', { params: { date } }),

  // Coupons
  searchCoupon: (code) => api.get('/manager/coupons/search', { params: { code } }),
  getCoupon: (code) => api.get(`/coupons/${code}`),
  sendCoupon: (code) => api.post(`/coupons/${code}/send`),
  sendCouponCredit: (code) => api.post(`/coupons/${code}/send-credit`),
  clearCouponBalance: (code, amount) => 
    api.post(`/coupons/${code}/clear-full`, { amount })
};

// ==================== ADMIN API ====================

export const adminApi = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Analytics
  getOrderAnalytics: (range) => {
    const params = {};
    if (range !== undefined && range !== null) {
      params.range = range;
    }
    return api.get('/admin/analytics/orders', { params });
  },
  getRefundAnalytics: (month, byEmployee) => {
    const params = {};
    // Only include month if provided (backend will default to current month)
    if (month !== undefined && month !== null && month !== '') {
      params.month = month;
    }
    // Only include byEmployee if it's truthy (backend expects 'true' or '1' as string)
    if (byEmployee) {
      params.byEmployee = 'true';
    }
    return api.get('/admin/analytics/refunds', { params });
  },
  getCreditAnalytics: (month) => {
    const params = {};
    // Only include month if provided (backend will default to current month)
    if (month !== undefined && month !== null && month !== '') {
      params.month = month;
    }
    return api.get('/admin/analytics/credits', { params });
  },

  // Liability
  getPendingSalary: (month) => {
    const params = {};
    // Only include month if provided (backend will default to current month)
    if (month !== undefined && month !== null && month !== '') {
      params.month = month;
    }
    return api.get('/admin/liability/pending-salary', { params });
  },

  // System
  purgeData: (monthKey) => api.post('/admin/purge', { monthKey }),

  // Warnings
  issueWarning: (data) => api.post('/admin/warnings', data)
};

export default api;

