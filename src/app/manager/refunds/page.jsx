'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { managerApi, employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatUSD } from '@/utils/currency';
import { formatDateDisplay, nowIST } from '@/utils/datetime';

// ==============================|| MANAGER REFUND PROCESSING PAGE ||============================== //

export default function ManagerRefundsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'new';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(initialTab !== 'new');
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAmount, setSearchAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const isFetchingRef = useRef(false);
  const [editingRefund, setEditingRefund] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    zelleSenderName: '',
    server: '',
    category: '',
    reason: '',
    amount: ''
  });
  const [screenshot, setScreenshot] = useState(null);

  const fetchRefunds = useCallback(async (status, nextCursor = null) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      if (!nextCursor) setLoading(true);
      const params = {
        status,
        cursor: nextCursor,
        limit: 10
      };
      const response = await managerApi.getManagementRefunds(params);
      const newRefunds = response.data?.items || response.data || [];
      if (nextCursor) {
        setRefunds(prev => [...prev, ...newRefunds]);
      } else {
        setRefunds(newRefunds);
      }
      setCursor(response.data?.nextCursor || null);
      setHasMore(!!response.data?.nextCursor);
    } catch (error) {
      toast.error('Failed to load refunds');
      console.error('Refunds error:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchRefunds('ARCHIVED');
    } else if (activeTab === 'pending') {
      fetchRefunds('PENDING');
    } else if (activeTab === 'done') {
      fetchRefunds('DONE');
    } else if (activeTab === 'new') {
      // New tab doesn't need to fetch, just set loading to false
      setLoading(false);
    }
  }, [activeTab, fetchRefunds]);

  useEffect(() => {
    if (activeTab !== 'archived' || !hasMore || loading) {
      return;
    }

    const currentTarget = observerTarget.current;
    if (!currentTarget) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !isFetchingRef.current) {
          fetchRefunds('ARCHIVED', cursor);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [activeTab, cursor, hasMore, loading, fetchRefunds]);

  const handleSearch = async () => {
    if (!searchQuery && !searchAmount) {
      toast.error('Please enter search query or amount');
      return;
    }
    try {
      setIsSearching(true);
      const params = {
        q: searchQuery || undefined,
        amount: searchAmount || undefined,
        cursor: null,
        limit: 50
      };
      const response = await managerApi.getManagementRefunds(params);
      setRefunds(response.data?.items || response.data || []);
      setCursor(null);
      setHasMore(false);
    } catch (error) {
      toast.error('Failed to search refunds');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchAmount('');
    setIsSearching(false);
    if (activeTab === 'archived') {
      fetchRefunds('ARCHIVED');
    } else if (activeTab === 'pending') {
      fetchRefunds('PENDING');
    } else if (activeTab === 'done') {
      fetchRefunds('DONE');
    }
  };

  const [processingRefund, setProcessingRefund] = useState(null);
  const [refundedAmount, setRefundedAmount] = useState('');

  const handleProcess = async (refund) => {
    setProcessingRefund(refund);
    setRefundedAmount(refund.amount || '');
  };

  const confirmProcess = async () => {
    if (!processingRefund) return;
    
    const amount = parseFloat(refundedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refunded amount');
      return;
    }

    if (amount > parseFloat(processingRefund.amount)) {
      toast.error('Refunded amount cannot exceed requested amount');
      return;
    }

    try {
      setProcessingId(processingRefund.id);
      await managerApi.processManagementRefund(processingRefund.id, {
        refundedAmountUSD: amount
      });
      toast.success('Refund processed successfully');
      setProcessingRefund(null);
      setRefundedAmount('');
      if (activeTab === 'pending') {
        fetchRefunds('PENDING');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process refund');
      console.error('Process refund error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleEdit = (refund) => {
    setEditingRefund(refund);
    setFormData({
      customerName: refund.customerName || '',
      zelleSenderName: refund.zelleSenderName || '',
      server: refund.server || '',
      category: refund.category || '',
      reason: refund.reason || '',
      amount: refund.amount || ''
    });
    setScreenshot(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      setProcessingId('new');
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
      if (activeTab === 'pending') {
        fetchRefunds('PENDING');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create refund');
      console.error('Create refund error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingRefund) return;

    try {
      setProcessingId(editingRefund.id);
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

      await managerApi.updateRefund(editingRefund.id, data);
      toast.success('Refund updated successfully');
      setEditingRefund(null);
      setFormData({
        customerName: '',
        zelleSenderName: '',
        server: '',
        category: '',
        reason: '',
        amount: ''
      });
      setScreenshot(null);
      if (activeTab === 'pending') {
        fetchRefunds('PENDING');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update refund');
      console.error('Update refund error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmNotified = async (refundId) => {
    setShowConfirmModal(refundId);
  };

  const confirmNotified = async () => {
    if (!showConfirmModal) return;

    try {
      await managerApi.confirmRefundNotified(showConfirmModal);
      toast.success('Refund archived successfully');
      setShowConfirmModal(null);
      if (activeTab === 'done') {
        fetchRefunds('DONE');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm');
      console.error('Confirm error:', error);
    }
  };

  const isEditable = (refund) => {
    if (refund.editable === false) return false;
    if (refund.editableUntil) {
      return new Date(refund.editableUntil) > nowIST();
    }
    // Default: editable if created within last 12 hours
    const createdAt = new Date(refund.createdAt);
    const hoursDiff = (nowIST() - createdAt) / (1000 * 60 * 60);
    return hoursDiff < 12;
  };

  if (loading && refunds.length === 0) {
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

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'new'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          New Request
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'pending'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setActiveTab('done')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'done'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Done
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'archived'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Search Bar - Always visible */}
      <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] form-control p-2 border rounded"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount (exact match)"
            value={searchAmount}
            onChange={(e) => setSearchAmount(e.target.value)}
            className="w-32 form-control p-2 border rounded"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {(searchQuery || searchAmount) && (
            <button
              onClick={handleClearSearch}
              className="btn btn-outline-secondary px-4 py-2 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* New Request Tab */}
      {activeTab === 'new' && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h5 className="mb-4 text-lg font-semibold">Create New Refund Request</h5>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer Name *</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Zelle Sender Name *</label>
                <input
                  type="text"
                  value={formData.zelleSenderName}
                  onChange={(e) => setFormData({ ...formData, zelleSenderName: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Server *</label>
                <input
                  type="text"
                  value={formData.server}
                  onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
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
              <label className="block text-sm font-medium mb-2">Reason *</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount (USD) *</label>
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
              <label className="block text-sm font-medium mb-2">Payment Screenshot (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files[0])}
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              disabled={processingId === 'new'}
              className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
            >
              {processingId === 'new' ? 'Submitting...' : 'Submit Refund Request'}
            </button>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Refund Request</h3>
              <button
                onClick={() => {
                  setEditingRefund(null);
                  setFormData({
                    customerName: '',
                    zelleSenderName: '',
                    server: '',
                    category: '',
                    reason: '',
                    amount: ''
                  });
                  setScreenshot(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ph ph-x text-2xl"></i>
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                    className="form-control w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Zelle Sender Name *</label>
                  <input
                    type="text"
                    value={formData.zelleSenderName}
                    onChange={(e) => setFormData({ ...formData, zelleSenderName: e.target.value })}
                    required
                    className="form-control w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Server *</label>
                  <input
                    type="text"
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    required
                    className="form-control w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
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
                <label className="block text-sm font-medium mb-2">Reason *</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (USD) *</label>
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
                <label className="block text-sm font-medium mb-2">Payment Screenshot (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files[0])}
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRefund(null);
                    setFormData({
                      customerName: '',
                      zelleSenderName: '',
                      server: '',
                      category: '',
                      reason: '',
                      amount: ''
                    });
                    setScreenshot(null);
                  }}
                  className="btn btn-outline-secondary px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === editingRefund.id}
                  className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
                >
                  {processingId === editingRefund.id ? 'Updating...' : 'Update Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refunds List */}
      {(activeTab === 'pending' || activeTab === 'done' || activeTab === 'archived' || isSearching) && (
        <div className="space-y-4">
          {refunds.length === 0 ? (
            <div className="card bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
              <i className="ph ph-check-circle text-success-500 text-5xl mb-3"></i>
              <h3 className="text-lg font-semibold mb-2">No Refunds Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No refunds match your criteria.</p>
            </div>
          ) : (
            refunds.map((refund) => (
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
                            Customer: <strong>{refund.customerName || 'N/A'}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="ph ph-calendar text-gray-400"></i>
                          <span className="text-gray-600 dark:text-gray-400">
                            Submitted: {formatDateDisplay(refund.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <i className="ph ph-currency-dollar text-gray-400"></i>
                          <span className="text-gray-600 dark:text-gray-400">
                            Amount: <strong className="text-lg text-red-600">{formatUSD(refund.amount || 0)}</strong>
                          </span>
                        </div>
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
                    {activeTab === 'pending' && (
                      <>
                        {isEditable(refund) ? (
                          <button
                            onClick={() => handleEdit(refund)}
                            className="flex-1 lg:flex-initial px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 flex items-center justify-center gap-2"
                          >
                            <i className="ph ph-pencil"></i>
                            <span>Edit</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 lg:flex-initial px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed flex items-center justify-center gap-2"
                            title="Edit window expired"
                          >
                            <i className="ph ph-lock"></i>
                            <span>Edit Expired</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleProcess(refund)}
                          disabled={processingId === refund.id}
                          className="flex-1 lg:flex-initial px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      </>
                    )}
                    {activeTab === 'done' && (
                      <button
                        onClick={() => handleConfirmNotified(refund.id)}
                        className="flex-1 lg:flex-initial px-4 py-2 bg-success-500 text-white rounded hover:bg-success-600 flex items-center justify-center gap-2"
                      >
                        <i className="ph ph-check-circle"></i>
                        <span>Confirm</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {activeTab === 'archived' && hasMore && (
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loading && <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>}
            </div>
          )}
        </div>
      )}

      {/* Process Refund Modal */}
      {processingRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Requested Amount:</strong> {formatUSD(processingRefund.amount || 0)}
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Refunded Amount (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={processingRefund.amount}
                  value={refundedAmount}
                  onChange={(e) => setRefundedAmount(e.target.value)}
                  className="form-control w-full p-2 border rounded"
                  placeholder="Enter refunded amount"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the amount actually refunded. If partial, employee will see remaining balance.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setProcessingRefund(null);
                  setRefundedAmount('');
                }}
                className="btn btn-outline-secondary px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmProcess}
                disabled={processingId === processingRefund.id}
                className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {processingId === processingRefund.id ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Customer Notification</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Customer has been notified in the ticket?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="btn btn-outline-secondary px-4 py-2 rounded"
              >
                No
              </button>
              <button
                onClick={confirmNotified}
                className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
