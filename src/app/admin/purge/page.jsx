'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| ADMIN DATA PURGE PAGE ||============================== //

export default function AdminPurgePage() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [purging, setPurging] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handlePurge = async (e) => {
    e.preventDefault();
    
    if (!selectedMonth) {
      toast.error('Please select a month to purge');
      return;
    }

    if (confirmationText !== 'PURGE') {
      toast.error('Please type PURGE to confirm');
      return;
    }

    const monthDate = new Date(selectedMonth + '-01');
    const monthName = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (!confirm(`Are you absolutely sure you want to purge all data for ${monthName}? This action is IRREVERSIBLE and will permanently delete:\n\n- All orders\n- All refunds\n- All attendance records\n- All warnings\n- All coupons\n- All credit history\n\nThis data CANNOT be recovered!`)) {
      return;
    }

    try {
      setPurging(true);
      await adminApi.purgeData(selectedMonth);
      toast.success(`Successfully purged data for ${monthName}`);
      
      // Reset form
      setSelectedMonth('');
      setConfirmationText('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to purge data');
      console.error('Purge error:', error);
    } finally {
      setPurging(false);
    }
  };

  const getMaxMonth = () => {
    const now = new Date();
    // Only allow purging data from at least 3 months ago
    now.setMonth(now.getMonth() - 3);
    return now.toISOString().slice(0, 7);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Purge</h1>
        <p className="text-gray-500 mt-2">Clean up old data and manage system storage</p>
      </div>

      {/* Warning Banner */}
      <div className="card bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-500">
        <div className="flex items-start gap-3">
          <i className="ph ph-warning text-red-600 text-3xl"></i>
          <div>
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
              DANGER ZONE - IRREVERSIBLE ACTION
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              This operation will <strong>PERMANENTLY DELETE</strong> all data for the selected month. 
              This includes orders, refunds, attendance, warnings, coupons, and credit history.
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
              <li>This action cannot be undone</li>
              <li>No backup will be created automatically</li>
              <li>All related records will be permanently removed</li>
              <li>Employee salary calculations for that month will be affected</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Purge Form */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <form onSubmit={handlePurge} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Month to Purge <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={getMaxMonth()}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={purging}
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              You can only purge data from at least 3 months ago to prevent accidental deletion of recent data.
            </p>
          </div>

          {selectedMonth && (
            <>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Data to be purged:
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All records from{' '}
                  <strong>
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <strong className="text-red-600">PURGE</strong> to confirm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type PURGE in capital letters"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={purging}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This confirmation is required to prevent accidental deletions
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={purging || confirmationText !== 'PURGE'}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {purging ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Purging Data...</span>
                    </>
                  ) : (
                    <>
                      <i className="ph ph-trash"></i>
                      <span>Purge Data</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth('');
                    setConfirmationText('');
                  }}
                  disabled={purging}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Information Box */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <i className="ph ph-info text-blue-600 text-2xl"></i>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <h4 className="font-semibold mb-2">When to use Data Purge?</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>To comply with data retention policies</li>
              <li>To free up database storage space</li>
              <li>To remove old records that are no longer needed</li>
              <li>After archiving data to external storage</li>
            </ul>
            <p className="mt-3 font-semibold text-blue-700 dark:text-blue-400">
              Best Practice: Always create a backup before purging data!
            </p>
          </div>
        </div>
      </div>

      {/* Usage Guidelines */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Data Purge Guidelines</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <i className="ph ph-check-circle text-green-500 mt-0.5"></i>
            <p>
              <strong>Do:</strong> Verify all required reports have been generated before purging
            </p>
          </div>
          <div className="flex items-start gap-2">
            <i className="ph ph-check-circle text-green-500 mt-0.5"></i>
            <p>
              <strong>Do:</strong> Create a database backup before performing purge operations
            </p>
          </div>
          <div className="flex items-start gap-2">
            <i className="ph ph-check-circle text-green-500 mt-0.5"></i>
            <p>
              <strong>Do:</strong> Notify relevant stakeholders before purging data
            </p>
          </div>
          <div className="flex items-start gap-2">
            <i className="ph ph-x-circle text-red-500 mt-0.5"></i>
            <p>
              <strong>Don't:</strong> Purge data from the current or previous month
            </p>
          </div>
          <div className="flex items-start gap-2">
            <i className="ph ph-x-circle text-red-500 mt-0.5"></i>
            <p>
              <strong>Don't:</strong> Purge data without proper authorization
            </p>
          </div>
          <div className="flex items-start gap-2">
            <i className="ph ph-x-circle text-red-500 mt-0.5"></i>
            <p>
              <strong>Don't:</strong> Rush the purge process - double-check everything first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
