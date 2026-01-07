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
      const token = sessionStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const refreshToken = sessionStorage.getItem('refresh_token');
        
        // Only attempt refresh if we have a refresh token and this isn't already a refresh request
        if (refreshToken && !originalRequest.url.includes('/auth/refresh')) {
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
            // Refresh failed, clear tokens and redirect to login
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
            
            // Avoid redirect if already on login page
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token or refresh endpoint itself failed
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
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

  // Refunds
  createRefund: (formData) =>
    api.post('/me/refunds', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getRefunds: (status) => api.get('/me/refunds', { params: { status } }),
  confirmRefundInformed: (id) => api.post(`/me/refunds/${id}/confirm-informed`),

  // Coupons
  generateCoupon: (data) => api.post('/me/coupons/generate', data),
  honorCoupon: (code) => api.post('/me/coupons/honor', { code }),
  getCouponHistory: () => api.get('/me/coupons/history')
};

// ==================== MANAGER API ====================

export const managerApi = {
  // Dashboard
  getDashboardStats: () => api.get('/manager/dashboard/stats'),

  // Orders
  getPendingOrders: () => api.get('/manager/orders/pending'),
  approveOrder: (id, data) => api.post(`/manager/orders/${id}/approve`, data),

  // Refunds
  getPendingRefunds: () => api.get('/manager/refunds/pending'),
  processRefund: (id) => api.post(`/manager/refunds/${id}/process`),

  // Warnings
  issueWarning: (data) => api.post('/manager/warnings', data),

  // Attendance
  getTeamAttendanceToday: () => api.get('/manager/attendance/today'),
  getTeamAttendance: (date) => api.get('/manager/attendance', { params: { date } }),

  // Coupons
  searchCoupon: (code) => api.get('/manager/coupons/search', { params: { code } })
};

// ==================== ADMIN API ====================

export const adminApi = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Analytics
  getOrderAnalytics: (range) => api.get('/admin/analytics/orders', { params: { range } }),
  getRefundAnalytics: (month, byEmployee) =>
    api.get('/admin/analytics/refunds', {
      params: { month, byEmployee }
    }),
  getCreditAnalytics: (month) => api.get('/admin/analytics/credits', { params: { month } }),

  // Liability
  getPendingSalary: (month) => api.get('/admin/liability/pending-salary', { params: { month } }),

  // System
  purgeData: (monthKey) => api.post('/admin/purge', { monthKey }),

  // Warnings
  issueWarning: (data) => api.post('/admin/warnings', data)
};

export default api;

