'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| ORDERS PAGE ||============================== //

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getOrders(currentMonth);
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submittedCount < 0) {
      toast.error('Count must be 0 or greater');
      return;
    }

    try {
      setSubmitting(true);
      await employeeApi.createOrder({
        dateKey: selectedDate,
        submittedCount: parseInt(submittedCount)
      });
      toast.success('Order submitted successfully');
      fetchOrders();
      setSubmittedCount(0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit order');
      console.error('Submit order error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOrder = orders.find((o) => o.dateKey === selectedDate);
  const canEdit = !selectedOrder || selectedOrder.status === 'PENDING' || selectedOrder.status === 'REJECTED';

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
        <h1 className="text-2xl font-bold">Daily Orders</h1>
        <p className="text-gray-500 mt-2">Submit and track your daily orders</p>
      </div>

      {/* Submit Order Form */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Submit Order</h5>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="form-control w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Submitted Count</label>
            <input
              type="number"
              value={submittedCount}
              onChange={(e) => setSubmittedCount(e.target.value)}
              disabled={!canEdit}
              min="0"
              className="form-control w-full p-2 border rounded disabled:bg-gray-100"
            />
            {selectedOrder && selectedOrder.status === 'APPROVED' && (
              <p className="text-sm text-red-500 mt-1">Cannot modify approved order</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!canEdit || submitting}
            className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </form>
      </div>

      {/* Order History */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Order History</h5>
        <div className="space-y-2">
          {orders && orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div>
                  <span className="font-medium">
                    {new Date(order.dateKey).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs ${
                      order.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  <div>Submitted: {order.submittedCount}</div>
                  {order.approvedCount !== null && (
                    <div className="text-sm text-green-600">Approved: {order.approvedCount}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No orders submitted this month</p>
          )}
        </div>
      </div>
    </div>
  );
}

