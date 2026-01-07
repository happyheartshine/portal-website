'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| ATTENDANCE PAGE ||============================== //

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await employeeApi.getAttendance(currentMonth);
      setAttendance(response.data || []);
    } catch (error) {
      toast.error('Failed to load attendance records');
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    try {
      setMarking(true);
      await employeeApi.markAttendance();
      toast.success('Attendance marked successfully');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
      console.error('Mark attendance error:', error);
    } finally {
      setMarking(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isMarkedToday = attendance.some((a) => a.dateKey === today);

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
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-gray-500 mt-2">Mark your daily attendance and view history</p>
      </div>

      {/* Mark Attendance Card */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Mark Attendance</h5>
        <button
          onClick={handleMarkAttendance}
          disabled={isMarkedToday || marking}
          className={`btn w-full flex items-center justify-center gap-2 p-3 rounded ${
            isMarkedToday
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          <i className="ph ph-calendar-check text-xl"></i>
          <span>{isMarkedToday ? 'Already Marked Today' : marking ? 'Marking...' : 'Mark Attendance for Today'}</span>
        </button>
      </div>

      {/* Attendance History Card */}
      <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h5 className="mb-4 text-lg font-semibold">Attendance History</h5>
        <div className="space-y-2">
          {attendance && attendance.length > 0 ? (
            attendance.map((record) => (
              <div
                key={record.id}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <span className="font-medium">
                  {new Date(record.dateKey).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(record.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No attendance records for this month</p>
          )}
        </div>
      </div>
    </div>
  );
}

