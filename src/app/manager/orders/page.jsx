'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatDateInput, formatDateDisplay } from '@/utils/datetime';

// ==============================|| VERIFY ORDERS PAGE ||============================== //

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    status: 'pending',
    employeeId: '',
    from: '',
    to: ''
  });
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchEmployees();
    fetchOrders();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchEmployees = async () => {
    try {
      const response = await managerApi.getEmployeeOptions();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const fetchOrders = async (nextCursor = null) => {
    try {
      if (!nextCursor) setLoading(true);
      const params = {
        cursor: nextCursor || undefined,
        limit: 20,
        status: filters.status || undefined,
        employeeId: filters.employeeId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined
      };
      const response = await managerApi.getManagementOrders(params);
      const newOrders = response.data?.items || response.data || [];
      if (nextCursor) {
        setOrders(prev => [...prev, ...newOrders]);
      } else {
        setOrders(newOrders);
      }
      setCursor(response.data?.nextCursor || null);
      setHasMore(!!response.data?.nextCursor);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId) => {
    if (!confirm('Are you sure you want to approve this order?')) return;

    try {
      setProcessingId(orderId);
      await managerApi.approveManagementOrder(orderId);
      toast.success('Order approved successfully');
      fetchOrders(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
      console.error('Approve error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Order Approvals</h1>
          <p className="text-gray-500 mt-2">Review and approve pending orders</p>
        </div>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verify Orders</h1>
        <p className="text-gray-500 mt-2">View and approve orders from all employees</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="form-control w-full"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Employee</label>
              <select
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                className="form-control w-full"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="form-control w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="form-control w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="card bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <i className="ph ph-check-circle text-success-500 text-5xl mb-3"></i>
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-gray-600 dark:text-gray-400">No pending orders to review at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`card p-6 rounded-lg shadow border-l-4 ${
                order.status === 'APPROVED' 
                  ? 'border-success-500' 
                  : 'border-yellow-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">Order #{order.id}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      order.status === 'APPROVED'
                        ? 'bg-success-100 text-success-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'APPROVED' ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <i className="ph ph-user text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-400">
                        Employee: <strong>{order.employee?.name || order.employeeName || 'N/A'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ph ph-calendar text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-400">
                        Date: {formatDateDisplay(order.createdAt || order.date)}
                      </span>
                    </div>
                    {order.description && (
                      <div className="flex items-start gap-2 mt-2">
                        <i className="ph ph-note text-gray-400 mt-0.5"></i>
                        <span className="text-gray-600 dark:text-gray-400">
                          <strong>Details:</strong> {order.description}
                        </span>
                      </div>
                    )}
                    {order.count !== undefined && (
                      <div className="flex items-center gap-2">
                        <i className="ph ph-hash text-gray-400"></i>
                        <span className="text-gray-600 dark:text-gray-400">
                          Count: <strong>{order.count}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {order.status !== 'APPROVED' && (
                  <div className="flex md:flex-col gap-2">
                    <button
                      onClick={() => handleApprove(order.id)}
                      disabled={processingId === order.id}
                      className="flex-1 md:flex-initial px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processingId === order.id ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          <i className="ph ph-check"></i>
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => fetchOrders(cursor)}
                disabled={loading}
                className="btn btn-outline-primary"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
