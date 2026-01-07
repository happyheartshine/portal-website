'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/apiClient';
import { setTokens, clearTokens, getRoleLandingPage } from '@/lib/auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user profile
  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile();
      const userData = response.data;
      
      // Ensure we only store the necessary user fields
      const userProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        ratePerOrder: userData.ratePerOrder || null,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };
      
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Only clear user if the error is auth-related (401)
      if (error.response?.status === 401) {
        setUser(null);
        clearTokens();
      }
      return null;
    }
  };

  // Bootstrap: Check if user is authenticated on mount
  useEffect(() => {
    const bootstrap = async () => {
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('access_token');
        if (token) {
          await refreshUser();
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      const { user: userData, access_token, refresh_token } = response.data;

      // Validate response structure
      if (!access_token || !refresh_token || !userData) {
        throw new Error('Invalid response from server');
      }

      // Store tokens
      setTokens(access_token, refresh_token);

      // Ensure user data has all required fields
      const userProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      };

      // Set user state
      setUser(userProfile);

      // Route based on role
      const landingPage = getRoleLandingPage(userData.role);
      router.push(landingPage);

      return { success: true, user: userProfile };
    } catch (error) {
      console.error('Login failed:', error);
      
      // Clear any partial auth state
      clearTokens();
      setUser(null);
      
      // Extract error message
      const message = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    // Clear user state
    setUser(null);
    
    // Clear tokens from storage
    clearTokens();
    
    // Redirect to login
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

