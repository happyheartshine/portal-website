'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| MANAGER REFUND PROCESSING PAGE ||============================== //

export default function ManagerRefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingRefunds();
  }, []);

  const fetchPendingRefunds = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getPendingRefunds();
      setRefunds(response.data);
    } catch (error) {
      toast.error('Failed to load pending refunds');
      console.error('Refunds error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (refundId) => {
    if (!confirm('Are you sure you want to process this refund? This will mark it as completed.')) return;

    try {
      setProcessingId(refundId);
      await managerApi.processRefund(refundId);
      toast.success('Refund processed successfully');
      fetchPendingRefunds(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
      console.error('Process refund error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Refund Processing</h1>
          <p className="text-gray-500 mt-2">Process and approve refund requests</p>
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
        <h1 className="text-2xl font-bold">Refund Processing</h1>
        <p className="text-gray-500 mt-2">Process and approve refund requests</p>
      </div>

      {refunds.length === 0 ? (
        <div className="card bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <i className="ph ph-check-circle text-success-500 text-5xl mb-3"></i>
          <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
          <p className="text-gray-600 dark:text-gray-400">No pending refunds to process at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <div 
              key={refund.id} 
              className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-orange-500"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Refund #{refund.id}</h3>
                    <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                      {refund.status || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <i className="ph ph-user text-gray-400"></i>
                        <span className="text-gray-600 dark:text-gray-400">
                          Employee: <strong>{refund.employee?.name || 'N/A'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="ph ph-calendar text-gray-400"></i>
                        <span className="text-gray-600 dark:text-gray-400">
                          Submitted: {new Date(refund.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {refund.orderId && (
                        <div className="flex items-center gap-2">
                          <i className="ph ph-shopping-cart text-gray-400"></i>
                          <span className="text-gray-600 dark:text-gray-400">
                            Order ID: <strong>#{refund.orderId}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      {refund.amount && (
                        <div className="flex items-center gap-2">
                          <i className="ph ph-currency-dollar text-gray-400"></i>
                          <span className="text-gray-600 dark:text-gray-400">
                            Amount: <strong className="text-lg text-red-600">${refund.amount.toFixed(2)}</strong>
                          </span>
                        </div>
                      )}
                      {refund.customerEmail && (
                        <div className="flex items-center gap-2">
                          <i className="ph ph-envelope text-gray-400"></i>
                          <span className="text-gray-600 dark:text-gray-400 truncate">
                            {refund.customerEmail}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {refund.reason && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-700 dark:text-gray-300">Reason:</strong> {refund.reason}
                      </p>
                    </div>
                  )}

                  {refund.proofUrl && (
                    <div className="flex items-center gap-2">
                      <i className="ph ph-paperclip text-gray-400"></i>
                      <a 
                        href={refund.proofUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary-500 hover:text-primary-600 underline"
                      >
                        View Proof/Screenshot
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => handleProcess(refund.id)}
                    disabled={processingId === refund.id}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {processingId === refund.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <i className="ph ph-check"></i>
                        <span>Process</span>
                      </>
                    )}
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

