'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| REFUNDS PAGE ||============================== //

export default function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [formData, setFormData] = useState({
    customerName: '',
    zelleSenderName: '',
    server: '',
    category: '',
    reason: '',
    amount: ''
  });
  const [screenshot, setScreenshot] = useState(null);

  useEffect(() => {
    fetchRefunds();
  }, [activeTab]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getRefunds(activeTab);
      setRefunds(response.data || []);
    } catch (error) {
      toast.error('Failed to load refunds');
      console.error('Refunds error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('customerName', formData.customerName);
      data.append('zelleSenderName', formData.zelleSenderName);
      data.append('server', formData.server);
      data.append('category', formData.category);
      data.append('reason', formData.reason);
      data.append('amount', formData.amount);
      if (screenshot) {
        data.append('screenshot', screenshot);
      }

      await employeeApi.createRefund(data);
      toast.success('Refund request created successfully');
      setFormData({
        customerName: '',
        zelleSenderName: '',
        server: '',
        category: '',
        reason: '',
        amount: ''
      });
      setScreenshot(null);
      fetchRefunds();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create refund request');
      console.error('Create refund error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmInformed = async (id) => {
    try {
      await employeeApi.confirmRefundInformed(id);
      toast.success('Refund request archived');
      fetchRefunds();
    } catch (error) {
      toast.error('Failed to confirm informed');
      console.error('Confirm informed error:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
        <h1 className="text-2xl font-bold">Refund Requests</h1>
        <p className="text-gray-500 mt-2">Create and track refund requests</p>
      </div>

      {/* Create Refund Form */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Create Refund Request</h5>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer Name</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Zelle Sender Name</label>
              <input
                type="text"
                value={formData.zelleSenderName}
                onChange={(e) => setFormData({ ...formData, zelleSenderName: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Server</label>
              <input
                type="text"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              className="form-control w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              className="form-control w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Screenshot</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files[0])}
              className="form-control w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:bg-gray-300"
          >
            {submitting ? 'Submitting...' : 'Submit Refund Request'}
          </button>
        </form>
      </div>

      {/* Refund Requests List */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Refund Requests</h5>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded ${
              activeTab === 'pending'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`px-4 py-2 rounded ${
              activeTab === 'done'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Done
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded ${
              activeTab === 'archived'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Archived
          </button>
        </div>

        {/* Refunds List */}
        <div className="space-y-2">
          {refunds && refunds.length > 0 ? (
            refunds.map((refund) => (
              <div key={refund.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{refund.customerName}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(Number(refund.amount))}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      refund.status === 'DONE'
                        ? 'bg-green-100 text-green-800'
                        : refund.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {refund.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{refund.reason}</p>
                {refund.status === 'DONE' && (
                  <button
                    onClick={() => handleConfirmInformed(refund.id)}
                    className="btn bg-primary-500 text-white px-3 py-1 text-sm rounded hover:bg-primary-600"
                  >
                    Confirm Informed
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No refund requests found</p>
          )}
        </div>
      </div>
    </div>
  );
}

