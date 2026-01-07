'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| MANAGER ORDER APPROVALS PAGE ||============================== //

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getPendingOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load pending orders');
      console.error('Orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId) => {
    if (!confirm('Are you sure you want to approve this order?')) return;

    try {
      setProcessingId(orderId);
      await managerApi.approveOrder(orderId, { approved: true });
      toast.success('Order approved successfully');
      fetchPendingOrders(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve order');
      console.error('Approve error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (orderId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessingId(orderId);
      await managerApi.approveOrder(orderId, { approved: false, reason });
      toast.success('Order rejected');
      fetchPendingOrders(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject order');
      console.error('Reject error:', error);
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
        <h1 className="text-2xl font-bold">Order Approvals</h1>
        <p className="text-gray-500 mt-2">Review and approve pending orders</p>
      </div>

      {orders.length === 0 ? (
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
              className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-yellow-500"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">Order #{order.id}</h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                      Pending
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <i className="ph ph-user text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-400">
                        Employee: <strong>{order.employee?.name || 'N/A'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ph ph-calendar text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-400">
                        Submitted: {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                    {order.amount && (
                      <div className="flex items-center gap-2">
                        <i className="ph ph-currency-dollar text-gray-400"></i>
                        <span className="text-gray-600 dark:text-gray-400">
                          Amount: <strong className="text-lg">${order.amount.toFixed(2)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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
                  <button
                    onClick={() => handleReject(order.id)}
                    disabled={processingId === order.id}
                    className="flex-1 md:flex-initial px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <i className="ph ph-x"></i>
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

