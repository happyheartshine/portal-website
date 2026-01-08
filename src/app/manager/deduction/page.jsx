'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatINR } from '@/utils/currency';

// ==============================|| DEDUCTION PAGE ||============================== //

export default function ManagerDeductionPage() {
  const [employees, setEmployees] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDeductionReasons();
  }, []);

  const fetchEmployees = async () => {
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

  const fetchDeductionReasons = async () => {
    try {
      const response = await managerApi.getDeductionReasons();
      setReasons(response.data || []);
    } catch (error) {
      console.error('Failed to load deduction reasons:', error);
      // If endpoint doesn't exist, use default reasons
      setReasons([
        { key: 'LATE_ARRIVAL', label: 'Late Arrival' },
        { key: 'ABSENCE', label: 'Absence' },
        { key: 'PERFORMANCE', label: 'Performance Issue' },
        { key: 'OTHER', label: 'Other' }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    
    if (!selectedReason) {
      toast.error('Please select a deduction reason');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid deduction amount');
      return;
    }

    try {
      setSubmitting(true);
      await managerApi.createDeduction({
        employeeId: selectedEmployee, // Backend expects string, not number
        reasonKey: selectedReason,
        amountINR: amountNum
      });
      
      toast.success('Deduction issued successfully');
      
      // Reset form
      setSelectedEmployee('');
      setSelectedReason('');
      setAmount('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue deduction');
      console.error('Create deduction error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deduction</h1>
        <p className="text-gray-500 mt-2">Issue salary deductions to employees</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Issue Deduction</h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Employee <span className="text-red-500">*</span>
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

            {/* Deduction Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Deduction Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="form-control w-full"
                disabled={submitting}
                required
              >
                <option value="">-- Select a reason --</option>
                {reasons.map((reason) => (
                  <option key={reason.key} value={reason.key}>
                    {reason.label || reason.name || reason.key}
                  </option>
                ))}
              </select>
            </div>

            {/* Deduction Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Deduction Amount (INR ₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="form-control w-full pl-8"
                  placeholder="0.00"
                  disabled={submitting}
                  required
                />
              </div>
              {amount && !isNaN(parseFloat(amount)) && (
                <p className="text-sm text-gray-500 mt-1 mt-1">
                  Amount: <strong>{formatINR(parseFloat(amount))}</strong>
                </p>
              )}
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
                    <i className="ph ph-minus-circle"></i>
                    <span>Issue Deduction</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee('');
                  setSelectedReason('');
                  setAmount('');
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

      {/* Info Notice */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <i className="ph ph-info text-blue-600 text-xl mt-0.5"></i>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Note:</strong> Deductions are issued in INR (₹) and will be reflected in the employee's salary calculation. 
            The deducted amount will be subtracted from their monthly salary.
          </div>
        </div>
      </div>
    </div>
  );
}

