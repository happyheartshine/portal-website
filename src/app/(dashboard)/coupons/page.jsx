'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| COUPONS PAGE ||============================== //

export default function CouponsPage() {
  const [history, setHistory] = useState({ issued: [], honored: [] });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  
  const [generateForm, setGenerateForm] = useState({
    customerName: '',
    server: '',
    category: '',
    reason: '',
    zelleName: '',
    amount: ''
  });
  
  const [honorCode, setHonorCode] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getCouponHistory();
      setHistory(response.data || { issued: [], honored: [] });
    } catch (error) {
      toast.error('Failed to load coupon history');
      console.error('Coupon history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await employeeApi.generateCoupon({
        ...generateForm,
        amount: parseFloat(generateForm.amount)
      });
      toast.success(`Coupon generated: ${response.data.code}`);
      setGenerateForm({
        customerName: '',
        server: '',
        category: '',
        reason: '',
        zelleName: '',
        amount: ''
      });
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate coupon');
      console.error('Generate coupon error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHonor = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeApi.honorCoupon(honorCode);
      toast.success('Coupon honored successfully');
      setHonorCode('');
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to honor coupon');
      console.error('Honor coupon error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coupons</h1>
        <p className="text-gray-500 mt-2">Generate and honor customer coupons</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2 rounded ${
            activeTab === 'generate'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => setActiveTab('honor')}
          className={`px-4 py-2 rounded ${
            activeTab === 'honor'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Honor
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded ${
            activeTab === 'history'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h5 className="mb-4 text-lg font-semibold">Generate Coupon</h5>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer Name</label>
                <input
                  type="text"
                  value={generateForm.customerName}
                  onChange={(e) => setGenerateForm({ ...generateForm, customerName: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Server</label>
                <input
                  type="text"
                  value={generateForm.server}
                  onChange={(e) => setGenerateForm({ ...generateForm, server: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={generateForm.category}
                  onChange={(e) => setGenerateForm({ ...generateForm, category: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Zelle Name</label>
                <input
                  type="text"
                  value={generateForm.zelleName}
                  onChange={(e) => setGenerateForm({ ...generateForm, zelleName: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <input
                type="text"
                value={generateForm.reason}
                onChange={(e) => setGenerateForm({ ...generateForm, reason: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                value={generateForm.amount}
                onChange={(e) => setGenerateForm({ ...generateForm, amount: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:bg-gray-300"
            >
              {submitting ? 'Generating...' : 'Generate Coupon'}
            </button>
          </form>
        </div>
      )}

      {/* Honor Tab */}
      {activeTab === 'honor' && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h5 className="mb-4 text-lg font-semibold">Honor Coupon</h5>
          <form onSubmit={handleHonor} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Coupon Code</label>
              <input
                type="text"
                value={honorCode}
                onChange={(e) => setHonorCode(e.target.value)}
                placeholder="CP-20240115-1234"
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:bg-gray-300"
            >
              {submitting ? 'Processing...' : 'Honor Coupon'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Issued Coupons */}
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Issued Coupons</h5>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : history.issued && history.issued.length > 0 ? (
              <div className="space-y-2">
                {history.issued.map((coupon) => (
                  <div key={coupon.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-medium">{coupon.code}</p>
                        <p className="text-sm text-gray-600">
                          {coupon.customerName} - {formatCurrency(Number(coupon.amount))}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          coupon.status === 'USED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {coupon.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No coupons issued</p>
            )}
          </div>

          {/* Honored Coupons */}
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Honored Coupons</h5>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : history.honored && history.honored.length > 0 ? (
              <div className="space-y-2">
                {history.honored.map((coupon) => (
                  <div key={coupon.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-medium">{coupon.code}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(Number(coupon.amount))} - {new Date(coupon.usedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        USED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No coupons honored</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

