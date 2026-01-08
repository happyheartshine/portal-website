'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatUSD } from '@/utils/currency';
import { formatDateDisplay, nowIST } from '@/utils/datetime';

// ==============================|| REFUNDS PAGE CONTENT ||============================== //

function RefundsPageContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'new';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL search params
  useEffect(() => {
    setActiveTab(prevTab => {
      // Only update if different to avoid unnecessary re-renders
      return tabFromUrl !== prevTab ? tabFromUrl : prevTab;
    });
  }, [tabFromUrl]);
  const [refunds, setRefunds] = useState([]);
  // Only show loading if we're on a tab that needs to fetch data
  const [loading, setLoading] = useState(() => tabFromUrl !== 'new');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAmount, setSearchAmount] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
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
  const [formTab, setFormTab] = useState('details'); // For 2 tabs in one row

  // Define fetchRefunds before using it in useEffect hooks
  const fetchRefunds = useCallback(async (status, nextCursor = null) => {
    try {
      if (!nextCursor) setLoading(true);
      const response = await employeeApi.getRefunds(status, nextCursor, 10);
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
      // 'new' tab doesn't need to fetch data, so set loading to false
      setLoading(false);
    }
  }, [activeTab, fetchRefunds]);

  useEffect(() => {
    // Only set up observer for archived tab with infinite scroll
    if (activeTab !== 'archived' || !hasMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Only fetch if intersecting, not loading, has more, and has a cursor (pagination)
        if (entries[0].isIntersecting && !loading && hasMore && cursor) {
          fetchRefunds('ARCHIVED', cursor);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
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
      const response = await employeeApi.searchRefunds(searchQuery, searchAmount || undefined, null, 50);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerName || !formData.zelleSenderName || !formData.server || 
        !formData.category || !formData.reason || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate amount is a valid number
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount (0 or greater)');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('customerName', formData.customerName.trim());
      data.append('zelleSenderName', formData.zelleSenderName.trim());
      data.append('server', formData.server.trim());
      data.append('category', formData.category.trim());
      data.append('reason', formData.reason.trim());
      // Ensure amount is sent as a number string (backend will parse it)
      data.append('amount', amount.toString());
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
      fetchRefunds('PENDING');
    } catch (error) {
      // Log full error for debugging
      console.error('Create refund error:', error);
      console.error('Error response:', error.response?.data);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          (Array.isArray(error.response?.data?.message) 
                            ? error.response.data.message.join(', ') 
                            : 'Failed to create refund request');
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingRefund) return;

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

      await employeeApi.updateRefund(editingRefund.id, data);
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
      setSubmitting(false);
    }
  };

  const handleConfirmInformed = async () => {
    if (!showConfirmModal) return;

    try {
      await employeeApi.confirmRefundInformed(showConfirmModal);
      toast.success('Refund request archived');
      setShowConfirmModal(null);
      if (activeTab === 'done') {
        fetchRefunds('DONE');
      }
    } catch (error) {
      toast.error('Failed to confirm informed');
      console.error('Confirm informed error:', error);
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

  if (loading && refunds.length === 0 && !isSearching) {
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

      {/* New Request Tab with 2 tabs in one row */}
      {activeTab === 'new' && (
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h5 className="mb-4 text-lg font-semibold">Create Refund Request</h5>
          
          {/* 2 Tabs in one row */}
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => setFormTab('details')}
              className={`px-4 py-2 font-medium ${
                formTab === 'details'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setFormTab('payment')}
              className={`px-4 py-2 font-medium ${
                formTab === 'payment'
                  ? 'border-b-2 border-primary-500 text-primary-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Payment
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formTab === 'details' && (
              <div className="space-y-4">
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
              </div>
            )}

            {formTab === 'payment' && (
              <div className="space-y-4">
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
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Refund Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Refunds List */}
      {(activeTab === 'pending' || activeTab === 'done' || activeTab === 'archived' || isSearching) && (
        <div className="space-y-4">
          {refunds.length === 0 ? (
            <div className="card bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
              <p className="text-center text-gray-500 py-4">No refund requests found</p>
            </div>
          ) : (
            refunds.map((refund) => (
              <div key={refund.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{refund.customerName}</p>
                    <p className="text-sm text-gray-600">{formatUSD(Number(refund.amount))}</p>
                    <p className="text-sm text-gray-500">{formatDateDisplay(refund.createdAt)}</p>
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
                
                {/* Partial Refund Message */}
                {refund.partialRefundedAmountUSD && 
                 refund.partialRefundedAmountUSD < refund.amount && (
                  <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Partial amount refunded:</strong> {formatUSD(refund.partialRefundedAmountUSD)} out of {formatUSD(refund.amount)}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Remaining: {formatUSD(refund.amount - refund.partialRefundedAmountUSD)}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {activeTab === 'pending' && (
                    <>
                      {isEditable(refund) ? (
                        <button
                          onClick={() => handleEdit(refund)}
                          className="btn bg-primary-500 text-white px-3 py-1 text-sm rounded hover:bg-primary-600"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          disabled
                          className="btn bg-gray-300 text-gray-600 px-3 py-1 text-sm rounded cursor-not-allowed"
                          title="Edit window expired"
                        >
                          Edit Expired
                        </button>
                      )}
                    </>
                  )}
                  {activeTab === 'done' && (
                    <button
                      onClick={() => setShowConfirmModal(refund.id)}
                      disabled={
                        refund.partialRefundedAmountUSD && 
                        refund.partialRefundedAmountUSD < refund.amount
                      }
                      className="btn bg-success-500 text-white px-3 py-1 text-sm rounded hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        refund.partialRefundedAmountUSD && 
                        refund.partialRefundedAmountUSD < refund.amount
                          ? 'Cannot archive until full amount is refunded'
                          : 'Confirm and archive'
                      }
                    >
                      {refund.partialRefundedAmountUSD && 
                       refund.partialRefundedAmountUSD < refund.amount
                        ? 'Waiting for Full Refund'
                        : 'Confirm'}
                    </button>
                  )}
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

      {/* Edit Modal */}
      {editingRefund && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 flex items-center justify-center z-50">
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
                  disabled={submitting}
                  className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Customer Notification</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Customer has been notified in the ticket?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  toast.info('Please inform the customer before archiving.');
                  setShowConfirmModal(null);
                }}
                className="btn btn-outline-secondary px-4 py-2 rounded"
              >
                No
              </button>
              <button
                onClick={handleConfirmInformed}
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

// ==============================|| REFUNDS PAGE (WITH SUSPENSE) ||============================== //

export default function RefundsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    }>
      <RefundsPageContent />
    </Suspense>
  );
}
