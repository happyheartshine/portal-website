'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| EMPLOYEE DASHBOARD ||============================== //

export default function EmployeeDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, [selectedMonth]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getDashboard(selectedMonth || undefined);
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
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

  if (!dashboardData) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <p className="text-muted">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <input
            type="month"
            className="form-control w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            placeholder="Select month"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6">
        {/* Salary Card */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Salary</h5>
                <i className="ph ph-currency-dollar text-primary-500 text-2xl"></i>
              </div>
              <h2 className="mb-2 text-3xl font-bold">${typeof dashboardData.salary === 'number' ? dashboardData.salary.toFixed(2) : (Number(dashboardData.salary) || 0).toFixed(2)}</h2>
              <p className="mb-0 text-sm text-muted">Monthly Earnings</p>
            </div>
          </div>
        </div>

        {/* Deductions Card */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Deductions</h5>
                <i className="ph ph-minus-circle text-danger-500 text-2xl"></i>
              </div>
              <h2 className="mb-2 text-3xl font-bold text-danger-500">-${typeof dashboardData.totalDeductions === 'number' ? dashboardData.totalDeductions.toFixed(2) : (Number(dashboardData.totalDeductions) || 0).toFixed(2)}</h2>
              <p className="mb-0 text-sm text-muted">Total Deducted</p>
            </div>
          </div>
        </div>

        {/* Approved Orders Card */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Approved Orders</h5>
                <i className="ph ph-check-circle text-success-500 text-2xl"></i>
              </div>
              <h2 className="mb-2 text-3xl font-bold">{dashboardData.approvedOrders || 0}</h2>
              <p className="mb-0 text-sm text-muted">Orders Completed</p>
            </div>
          </div>
        </div>

        {/* Ongoing Refunds Card */}
        <div className="col-span-12 md:col-span-6 xl:col-span-3">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Refunds</h5>
                <i className="ph ph-receipt text-warning-500 text-2xl"></i>
              </div>
              <h2 className="mb-2 text-3xl font-bold">{dashboardData.ongoingRefunds || 0}</h2>
              <p className="mb-0 text-sm text-muted">Pending Refunds</p>
            </div>
          </div>
        </div>

        {/* Warnings Card */}
        {dashboardData.unreadWarnings > 0 && (
          <div className="col-span-12">
            <div className="card border-danger-500 border-l-4">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <i className="ph ph-warning text-danger-500 text-3xl"></i>
                  <div>
                    <h5 className="mb-1">Unread Warnings</h5>
                    <p className="mb-0 text-muted">
                      You have <strong>{dashboardData.unreadWarnings}</strong> unread warning(s). Please check your warnings
                      page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="col-span-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <a href="/attendance" className="btn btn-outline-primary flex items-center justify-center gap-2">
                  <i className="ph ph-calendar-check"></i>
                  <span>Mark Attendance</span>
                </a>
                <a href="/orders" className="btn btn-outline-primary flex items-center justify-center gap-2">
                  <i className="ph ph-shopping-cart"></i>
                  <span>Submit Orders</span>
                </a>
                <a href="/refunds" className="btn btn-outline-primary flex items-center justify-center gap-2">
                  <i className="ph ph-receipt"></i>
                  <span>Create Refund</span>
                </a>
                <a href="/coupons" className="btn btn-outline-primary flex items-center justify-center gap-2">
                  <i className="ph ph-ticket"></i>
                  <span>Coupons</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
