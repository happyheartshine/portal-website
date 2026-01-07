'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| MANAGER ISSUE WARNING PAGE ||============================== //

export default function ManagerDisciplinePage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [warningType, setWarningType] = useState('MINOR');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getTeamAttendanceToday();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
      // Don't show error toast as this is just for dropdown population
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the warning');
      return;
    }

    try {
      setSubmitting(true);
      await managerApi.issueWarning({
        employeeId: parseInt(selectedEmployee),
        type: warningType,
        reason: reason.trim()
      });
      
      toast.success('Warning issued successfully');
      
      // Reset form
      setSelectedEmployee('');
      setWarningType('MINOR');
      setReason('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue warning');
      console.error('Issue warning error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Issue Warning</h1>
        <p className="text-gray-500 mt-2">Issue warnings and manage disciplinary actions</p>
      </div>

      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              <p className="text-sm text-gray-500 mt-1">Loading team members...</p>
            )}
          </div>

          {/* Warning Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Warning Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="warningType"
                  value="MINOR"
                  checked={warningType === 'MINOR'}
                  onChange={(e) => setWarningType(e.target.value)}
                  className="mr-3"
                  disabled={submitting}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Minor Warning</div>
                  <div className="text-sm text-gray-500">For minor infractions or first-time issues</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="warningType"
                  value="MAJOR"
                  checked={warningType === 'MAJOR'}
                  onChange={(e) => setWarningType(e.target.value)}
                  className="mr-3"
                  disabled={submitting}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Major Warning</div>
                  <div className="text-sm text-gray-500">For serious infractions or repeated issues</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-red-300 dark:border-red-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                <input
                  type="radio"
                  name="warningType"
                  value="SEVERE"
                  checked={warningType === 'SEVERE'}
                  onChange={(e) => setWarningType(e.target.value)}
                  className="mr-3"
                  disabled={submitting}
                />
                <div>
                  <div className="font-medium text-red-700 dark:text-red-400">Severe Warning</div>
                  <div className="text-sm text-red-600 dark:text-red-500">For critical issues that may lead to termination</div>
                </div>
              </label>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Provide a detailed reason for issuing this warning..."
              disabled={submitting}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Be specific and professional. This will be visible to the employee.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                setWarningType('MINOR');
                setReason('');
              }}
              disabled={submitting}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Warning Notice */}
      <div className="card bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
        <div className="flex items-start gap-3">
          <i className="ph ph-info text-yellow-600 text-xl mt-0.5"></i>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Important:</strong> Warnings are permanent records and will be visible to the employee and administrators. 
            Make sure all information is accurate before submitting.
          </div>
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
