'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| ADMIN DASHBOARD PAGE ||============================== //

export default function AdminDashboardPage() {
  const [orderAnalytics, setOrderAnalytics] = useState(null);
  const [refundAnalytics, setRefundAnalytics] = useState(null);
  const [creditAnalytics, setCreditAnalytics] = useState(null);
  const [pendingSalary, setPendingSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('week');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchAllAnalytics();
  }, [selectedRange, selectedMonth]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      
      // Map string range values to numeric values expected by backend
      const rangeMap = {
        'week': 7,
        'month': 30,
        'year': 30  // Backend only supports 7, 15, 30, so use 30 for year
      };
      const numericRange = rangeMap[selectedRange] || 7;
      
      const [orders, refunds, credits, salary] = await Promise.all([
        adminApi.getOrderAnalytics(numericRange).catch(err => {
          console.error('Order analytics error:', err);
          console.error('Error response:', err.response?.data);
          console.error('Request params:', { range: numericRange });
          return { data: null };
        }),
        adminApi.getRefundAnalytics(selectedMonth, false).catch(err => {
          console.error('Refund analytics error:', err);
          console.error('Error response:', err.response?.data);
          return { data: null };
        }),
        adminApi.getCreditAnalytics(selectedMonth).catch(err => {
          console.error('Credit analytics error:', err);
          console.error('Error response:', err.response?.data);
          return { data: null };
        }),
        adminApi.getPendingSalary(selectedMonth).catch(err => {
          console.error('Pending salary error:', err);
          console.error('Error response:', err.response?.data);
          return { data: null };
        })
      ]);
      
      setOrderAnalytics(orders.data);
      setRefundAnalytics(refunds.data);
      setCreditAnalytics(credits.data);
      setPendingSalary(salary.data);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">System overview and analytics</p>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-2">System overview and analytics</p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-500">Total Orders</h5>
            <i className="ph ph-shopping-cart text-primary-500 text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold mb-1">{orderAnalytics?.totalOrders || 0}</h2>
          <p className="text-sm text-gray-500">
            {orderAnalytics?.approvedOrders || 0} approved
          </p>
        </div>

        {/* Total Refunds */}
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-500">Total Refunds</h5>
            <i className="ph ph-receipt text-warning-500 text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold mb-1">{refundAnalytics?.totalRefunds || 0}</h2>
          <p className="text-sm text-red-600">
            ${refundAnalytics?.totalAmount?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Credits Generated */}
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-500">Credits</h5>
            <i className="ph ph-currency-dollar text-success-500 text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold mb-1">{creditAnalytics?.totalCredits || 0}</h2>
          <p className="text-sm text-success-600">
            ${creditAnalytics?.totalAmount?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Pending Salary */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-purple-100">Pending Salary</h5>
            <i className="ph ph-wallet text-white text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold mb-1">
            ${pendingSalary?.totalPending?.toFixed(2) || '0.00'}
          </h2>
          <p className="text-sm text-purple-100">
            {pendingSalary?.employeeCount || 0} employees
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Order Analytics */}
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Order Analytics</h3>
          {orderAnalytics ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-300">Total Orders</span>
                <span className="font-bold text-lg">{orderAnalytics.totalOrders || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="text-gray-600 dark:text-gray-300">Approved</span>
                <span className="font-bold text-lg text-green-600">{orderAnalytics.approvedOrders || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span className="text-gray-600 dark:text-gray-300">Pending</span>
                <span className="font-bold text-lg text-yellow-600">{orderAnalytics.pendingOrders || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <span className="text-gray-600 dark:text-gray-300">Rejected</span>
                <span className="font-bold text-lg text-red-600">{orderAnalytics.rejectedOrders || 0}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No order data available</p>
          )}
        </div>

        {/* Refund Analytics */}
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Refund Analytics</h3>
          {refundAnalytics ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-300">Total Refunds</span>
                <span className="font-bold text-lg">{refundAnalytics.totalRefunds || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-gray-600 dark:text-gray-300">Total Amount</span>
                <span className="font-bold text-lg text-blue-600">
                  ${refundAnalytics.totalAmount?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                <span className="text-gray-600 dark:text-gray-300">Average Refund</span>
                <span className="font-bold text-lg text-orange-600">
                  ${refundAnalytics.averageAmount?.toFixed(2) || '0.00'}
                </span>
              </div>
              {refundAnalytics.byStatus && (
                <div className="pt-2 space-y-2">
                  {Object.entries(refundAnalytics.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No refund data available</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/admin/users"
            className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="ph ph-users text-primary-500 text-2xl"></i>
            <div>
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-gray-500">Create and manage accounts</div>
            </div>
          </a>
          
          <a
            href="/admin/purge"
            className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="ph ph-trash text-red-500 text-2xl"></i>
            <div>
              <div className="font-medium">Data Purge</div>
              <div className="text-sm text-gray-500">Clean up old records</div>
            </div>
          </a>
          
          <button
            onClick={fetchAllAnalytics}
            className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="ph ph-arrow-clockwise text-success-500 text-2xl"></i>
            <div>
              <div className="font-medium">Refresh Data</div>
              <div className="text-sm text-gray-500">Update analytics</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
