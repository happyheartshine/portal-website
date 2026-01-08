'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| DISCIPLINE (WARNINGS) PAGE ||============================== //

export default function ManagerDisciplinePage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const [warnings, setWarnings] = useState([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
    fetchWarnings();
  }, [activeTab]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getEmployeeOptions();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarnings = async (nextCursor = null) => {
    try {
      if (!nextCursor) setWarningsLoading(true);
      const params = {
        tab: activeTab,
        cursor: nextCursor,
        limit: 20
      };
      const response = await managerApi.getWarnings(params);
      const newWarnings = response.data?.items || response.data || [];
      if (nextCursor) {
        setWarnings(prev => [...prev, ...newWarnings]);
      } else {
        setWarnings(newWarnings);
      }
      setCursor(response.data?.nextCursor || null);
      setHasMore(!!response.data?.nextCursor);
    } catch (error) {
      toast.error('Failed to load warnings');
      console.error('Warnings error:', error);
    } finally {
      setWarningsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please provide a warning message');
      return;
    }

    try {
      setSubmitting(true);
      await managerApi.issueWarning({
        employeeId: parseInt(selectedEmployee),
        message: message.trim()
      });
      
      toast.success('Warning issued successfully');
      
      // Reset form
      setSelectedEmployee('');
      setMessage('');
      
      // Refresh warnings if on recent tab
      if (activeTab === 'recent') {
        fetchWarnings();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue warning');
      console.error('Issue warning error:', error);
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discipline</h1>
        <p className="text-gray-500 mt-2">Issue warnings and view warning history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'recent'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'archive'
              ? 'border-b-2 border-primary-500 text-primary-500'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Archive
        </button>
      </div>

      {/* Issue Warning Form */}
      {activeTab === 'recent' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Issue Warning</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="form-control w-full"
                  disabled={loading || submitting}
                  required
                >
                  <option value="">-- Select an employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
                {loading && (
                  <p className="text-sm text-gray-500 mt-1">Loading employees...</p>
                )}
              </div>

              {/* Warning Message */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Warning Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="form-control w-full"
                  placeholder="Provide a detailed warning message..."
                  disabled={submitting}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This message will be visible to the employee on their dashboard.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-danger-500 text-white px-6 py-2 rounded hover:bg-danger-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Issuing...</span>
                    </>
                  ) : (
                    <>
                      <i className="ph ph-warning"></i>
                      <span>Issue Warning</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployee('');
                    setMessage('');
                  }}
                  disabled={submitting}
                  className="btn btn-outline-secondary px-6 py-2 rounded"
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warnings List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">{activeTab === 'recent' ? 'Recent Warnings' : 'Archived Warnings'}</h5>
        </div>
        <div className="card-body">
          {warningsLoading && warnings.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
            </div>
          ) : warnings.length === 0 ? (
            <div className="text-center py-8">
              <i className="ph ph-check-circle text-success-500 text-5xl mb-3"></i>
              <p className="text-gray-500">No warnings found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`p-4 rounded border ${
                    activeTab === 'recent'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {warning.message || warning.reason}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Employee: <strong>{warning.employee?.name || warning.employeeName || 'N/A'}</strong>
                      </p>
                      {warning.sourceTag && (
                        <p className="text-sm text-gray-500 mt-1">{warning.sourceTag}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDate(warning.createdAt)}
                  </p>
                </div>
              ))}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={() => fetchWarnings(cursor)}
                    disabled={warningsLoading}
                    className="btn btn-outline-primary"
                  >
                    {warningsLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
