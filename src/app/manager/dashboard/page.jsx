'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| MANAGER DASHBOARD PAGE ||============================== //

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manager Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of team performance and pending approvals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-12 gap-4">
        {/* Pending Orders */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="mb-0 text-sm font-medium text-gray-500">Pending Orders</h5>
              <i className="ph ph-shopping-cart text-primary-500 text-2xl"></i>
            </div>
            <h2 className="mb-2 text-3xl font-bold">{stats?.pendingOrders || 0}</h2>
            <a href="/manager/orders" className="text-sm text-primary-500 hover:text-primary-600">
              Review Orders →
            </a>
          </div>
        </div>

        {/* Pending Refunds */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="mb-0 text-sm font-medium text-gray-500">Pending Refunds</h5>
              <i className="ph ph-receipt text-warning-500 text-2xl"></i>
            </div>
            <h2 className="mb-2 text-3xl font-bold">{stats?.pendingRefunds || 0}</h2>
            <a href="/manager/refunds" className="text-sm text-warning-500 hover:text-warning-600">
              Process Refunds →
            </a>
          </div>
        </div>

        {/* Team Members */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="mb-0 text-sm font-medium text-gray-500">Team Members</h5>
              <i className="ph ph-users text-success-500 text-2xl"></i>
            </div>
            <h2 className="mb-2 text-3xl font-bold">{stats?.teamMembers || 0}</h2>
            <a href="/manager/attendance" className="text-sm text-success-500 hover:text-success-600">
              View Attendance →
            </a>
          </div>
        </div>

        {/* Present Today */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="mb-0 text-sm font-medium text-gray-500">Present Today</h5>
              <i className="ph ph-calendar-check text-info-500 text-2xl"></i>
            </div>
            <h2 className="mb-2 text-3xl font-bold">{stats?.presentToday || 0}</h2>
            <p className="text-sm text-gray-500">
              {stats?.teamMembers > 0 
                ? `${Math.round((stats?.presentToday / stats?.teamMembers) * 100)}% attendance`
                : 'No team members'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Quick Actions</h5>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <a 
            href="/manager/orders" 
            className="btn btn-outline-primary flex items-center justify-center gap-2 p-3 border border-primary-500 text-primary-500 rounded hover:bg-primary-50"
          >
            <i className="ph ph-shopping-cart"></i>
            <span>Approve Orders</span>
          </a>
          <a 
            href="/manager/refunds" 
            className="btn btn-outline-warning flex items-center justify-center gap-2 p-3 border border-warning-500 text-warning-500 rounded hover:bg-warning-50"
          >
            <i className="ph ph-receipt"></i>
            <span>Process Refunds</span>
          </a>
          <a 
            href="/manager/discipline" 
            className="btn btn-outline-danger flex items-center justify-center gap-2 p-3 border border-red-500 text-red-500 rounded hover:bg-red-50"
          >
            <i className="ph ph-warning"></i>
            <span>Issue Warning</span>
          </a>
          <a 
            href="/manager/attendance" 
            className="btn btn-outline-success flex items-center justify-center gap-2 p-3 border border-success-500 text-success-500 rounded hover:bg-success-50"
          >
            <i className="ph ph-calendar-check"></i>
            <span>Team Attendance</span>
          </a>
          <a 
            href="/manager/coupon-audit" 
            className="btn btn-outline-info flex items-center justify-center gap-2 p-3 border border-info-500 text-info-500 rounded hover:bg-info-50"
          >
            <i className="ph ph-ticket"></i>
            <span>Coupon Audit</span>
          </a>
        </div>
      </div>

      {/* Recent Activity / Alerts */}
      {(stats?.pendingOrders > 0 || stats?.pendingRefunds > 0) && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-start gap-3">
            <i className="ph ph-bell text-yellow-500 text-2xl"></i>
            <div>
              <h5 className="mb-1 font-semibold">Action Required</h5>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {stats?.pendingOrders > 0 && (
                  <li>You have {stats.pendingOrders} pending order(s) waiting for approval</li>
                )}
                {stats?.pendingRefunds > 0 && (
                  <li>You have {stats.pendingRefunds} pending refund(s) to process</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
