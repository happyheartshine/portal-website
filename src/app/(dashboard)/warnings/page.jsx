'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatINR } from '@/utils/currency';

// ==============================|| WARNINGS PAGE ||============================== //

export default function WarningsPage() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarnings();
  }, []);

  const fetchWarnings = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getWarnings();
      setWarnings(response.data || []);
    } catch (error) {
      toast.error('Failed to load warnings');
      console.error('Warnings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await employeeApi.markWarningRead(id);
      toast.success('Warning marked as read');
      fetchWarnings();
    } catch (error) {
      toast.error('Failed to mark warning as read');
      console.error('Mark read error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadWarnings = warnings.filter((w) => !w.isRead);
  const readWarnings = warnings.filter((w) => w.isRead);

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
        <h1 className="text-2xl font-bold">Warnings</h1>
        <p className="text-gray-500 mt-2">View and manage your warnings</p>
      </div>

      {/* Unread Warnings */}
      {unreadWarnings.length > 0 && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <i className="ph ph-warning text-yellow-500 text-2xl"></i>
            <h5 className="text-lg font-semibold">Unread Warnings ({unreadWarnings.length})</h5>
          </div>
          <div className="space-y-3">
            {unreadWarnings.map((warning) => (
              <div
                key={warning.id}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{warning.reason}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{warning.sourceTag}</p>
                    {warning.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{warning.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleMarkRead(warning.id)}
                    className="btn bg-primary-500 text-white px-3 py-1 text-sm rounded hover:bg-primary-600 flex items-center gap-1"
                  >
                    <i className="ph ph-check-circle"></i>
                    Mark Read
                  </button>
                </div>
                {warning.deductionAmount && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Deduction: {formatINR(Number(warning.deductionAmount))}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {formatDate(warning.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read Warnings */}
      {readWarnings.length > 0 && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h5 className="mb-4 text-lg font-semibold">Read Warnings</h5>
          <div className="space-y-3">
            {readWarnings.map((warning) => (
              <div
                key={warning.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 border rounded"
              >
                <div>
                  <p className="font-medium">{warning.reason}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{warning.sourceTag}</p>
                  {warning.note && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{warning.note}</p>
                  )}
                </div>
                {warning.deductionAmount && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Deduction: {formatINR(Number(warning.deductionAmount))}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Read on {formatDate(warning.readAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Warnings */}
      {warnings.length === 0 && (
        <div className="card bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <i className="ph ph-check-circle text-green-500 text-5xl mb-3"></i>
          <p className="text-gray-500">No warnings found</p>
        </div>
      )}
    </div>
  );
}

