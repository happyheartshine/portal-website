'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { employeeApi, managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatUSD } from '@/utils/currency';
import { formatDateDisplay } from '@/utils/datetime';

// ==============================|| COUPONS PAGE ||============================== //

export default function CouponsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'generate');
  const [history, setHistory] = useState({ issued: [], honored: [] });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState(null);
  const [couponBalance, setCouponBalance] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearAmount, setClearAmount] = useState('');
  const [clearing, setClearing] = useState(false);
  
  const [generateForm, setGenerateForm] = useState({
    customerName: '',
    server: '',
    category: '',
    reason: '',
    zelleName: '',
    amount: ''
  });
  
  const [balanceCode, setBalanceCode] = useState('');
  const [customerInput, setCustomerInput] = useState(''); // For send coupon

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
      toast.success('Coupon generated successfully');
      setGeneratedCoupon(response.data);
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

  const handleCheckBalance = async (e) => {
    e.preventDefault();
    if (!balanceCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      setCheckingBalance(true);
      const response = await managerApi.getCoupon(balanceCode.trim());
      setCouponBalance(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check coupon balance');
      console.error('Check balance error:', error);
      setCouponBalance(null);
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard');
  };

  const handleSendCoupon = async (code) => {
    if (!customerInput.trim()) {
      toast.error('Please enter customer information');
      return;
    }
    try {
      setSubmitting(true);
      await managerApi.sendCoupon(code);
      toast.success('Coupon sent to customer successfully');
      setCustomerInput('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send coupon');
      console.error('Send coupon error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCredit = async (code) => {
    if (!customerInput.trim()) {
      toast.error('Please enter customer information');
      return;
    }
    try {
      setSubmitting(true);
      await managerApi.sendCouponCredit(code);
      toast.success('Credit sent to customer successfully');
      setCustomerInput('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send credit');
      console.error('Send credit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearBalance = async () => {
    if (!couponBalance) return;
    const amount = parseFloat(clearAmount);
    const remaining = parseFloat(couponBalance.remainingBalance || couponBalance.balance || 0);
    
    if (isNaN(amount) || amount !== remaining) {
      toast.error(`Amount must equal remaining balance: ${formatUSD(remaining)}`);
      return;
    }

    try {
      setClearing(true);
      const response = await managerApi.clearCouponBalance(balanceCode, amount);
      toast.success(`Already used – at this time by: ${response.data?.usedBy || 'Staff'}`);
      setShowClearModal(false);
      setClearAmount('');
      // Refresh balance
      handleCheckBalance({ preventDefault: () => {} });
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to clear balance');
      console.error('Clear balance error:', error);
    } finally {
      setClearing(false);
    }
  };

  const handleHonor = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await employeeApi.honorCoupon(balanceCode);
      toast.success('Coupon honored successfully');
      setBalanceCode('');
      setCouponBalance(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coupons</h1>
        <p className="text-gray-500 mt-2">Generate and manage customer coupons</p>
      </div>

      {/* Tabs - 2 tabs in one row */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setActiveTab('generate');
            setGeneratedCoupon(null);
            setCouponBalance(null);
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'generate'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Generate
        </button>
        <button
          onClick={() => {
            setActiveTab('balance');
            setGeneratedCoupon(null);
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'balance'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Balance
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'history'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          History
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
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
                <label className="block text-sm font-medium mb-2">Amount (USD)</label>
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
                className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Generating...' : 'Generate Coupon'}
              </button>
            </form>
          </div>

          {/* Success Message with Coupon Code */}
          {generatedCoupon && (
            <div className="card bg-green-50 dark:bg-green-900/20 p-6 rounded-lg shadow border-l-4 border-green-500">
              <h5 className="mb-4 text-lg font-semibold text-green-800 dark:text-green-200">
                Coupon generated successfully
              </h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCoupon.code}
                      readOnly
                      className="flex-1 form-control p-2 border rounded bg-white font-mono"
                    />
                    <button
                      onClick={() => handleCopyCode(generatedCoupon.code)}
                      className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
                    >
                      <i className="ph ph-copy"></i> Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Customer (Optional for sending)</label>
                  <input
                    type="text"
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder="Customer email or ticket ID"
                    className="form-control w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendCoupon(generatedCoupon.code)}
                    disabled={submitting}
                    className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send coupon to customer'}
                  </button>
                  <button
                    onClick={() => handleSendCredit(generatedCoupon.code)}
                    disabled={submitting}
                    className="btn bg-success-500 text-white px-4 py-2 rounded hover:bg-success-600 disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Auto-send .credit to customer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balance Tab */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Check Coupon Balance</h5>
            <form onSubmit={handleCheckBalance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={balanceCode}
                    onChange={(e) => setBalanceCode(e.target.value)}
                    placeholder="CP-20240115-1234"
                    required
                    className="flex-1 form-control p-2 border rounded"
                  />
                  <button
                    type="submit"
                    disabled={checkingBalance}
                    className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
                  >
                    {checkingBalance ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Coupon Balance Display */}
          {couponBalance && (
            <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h5 className="mb-4 text-lg font-semibold">Coupon Details</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-600 dark:text-gray-300">Remaining Balance</span>
                  <span className="font-bold text-lg">{formatUSD(couponBalance.remainingBalance || couponBalance.balance || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-600 dark:text-gray-300">Issue Date/Time</span>
                  <span>{formatDateDisplay(couponBalance.createdAt || couponBalance.issuedAt)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-600 dark:text-gray-300">Issued By</span>
                  <span>{couponBalance.issuedBy?.name || couponBalance.employee?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-600 dark:text-gray-300">Validity Status</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      couponBalance.status === 'ACTIVE' || couponBalance.status === 'VALID'
                        ? 'bg-green-100 text-green-800'
                        : couponBalance.status === 'EXPIRED'
                        ? 'bg-red-100 text-red-800'
                        : couponBalance.status === 'USED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {couponBalance.status || 'UNKNOWN'}
                  </span>
                </div>
                {(couponBalance.remainingBalance > 0 || couponBalance.balance > 0) && (
                  <button
                    onClick={() => {
                      setShowClearModal(true);
                      setClearAmount('');
                    }}
                    className="w-full btn bg-danger-500 text-white px-4 py-2 rounded hover:bg-danger-600"
                  >
                    Clear Balance
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Honor Coupon (for employees) */}
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Honor Coupon</h5>
            <form onSubmit={handleHonor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Coupon Code</label>
                <input
                  type="text"
                  value={balanceCode}
                  onChange={(e) => setBalanceCode(e.target.value)}
                  placeholder="CP-20240115-1234"
                  required
                  className="form-control w-full p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Honor Coupon'}
              </button>
            </form>
          </div>
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
                          {coupon.customerName} - {formatUSD(Number(coupon.amount))}
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
                          {formatUSD(Number(coupon.amount))} - {formatDateDisplay(coupon.usedAt)}
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

      {/* Clear Balance Modal */}
      {showClearModal && couponBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Clear Coupon Balance</h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Remaining balance: <strong>{formatUSD(couponBalance.remainingBalance || couponBalance.balance || 0)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Enter Amount (must equal remaining balance)</label>
              <input
                type="number"
                step="0.01"
                value={clearAmount}
                onChange={(e) => setClearAmount(e.target.value)}
                placeholder={String(couponBalance.remainingBalance || couponBalance.balance || 0)}
                className="form-control w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setClearAmount('');
                }}
                className="btn btn-outline-secondary px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleClearBalance}
                disabled={clearing}
                className="btn bg-danger-500 text-white px-4 py-2 rounded hover:bg-danger-600 disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Clear Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
