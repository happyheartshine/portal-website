'use client';

import { useState, useEffect } from 'react';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';

// ==============================|| MANAGER TEAM ATTENDANCE PAGE ||============================== //

export default function ManagerAttendancePage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'custom'

  useEffect(() => {
    if (viewMode === 'today') {
      fetchTodayAttendance();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'custom' && selectedDate) {
      fetchAttendanceByDate();
    }
  }, [selectedDate, viewMode]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getTeamAttendanceToday();
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Failed to load team attendance');
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceByDate = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getTeamAttendance(selectedDate);
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance for selected date');
      console.error('Attendance error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'today') {
      setSelectedDate('');
    }
  };

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter(emp => emp.hasMarkedAttendance).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percentage };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Attendance</h1>
          <p className="text-gray-500 mt-2">Monitor team attendance and work hours</p>
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
        <h1 className="text-2xl font-bold">Team Attendance</h1>
        <p className="text-gray-500 mt-2">Monitor team attendance and work hours</p>
      </div>

      {/* View Mode Selector */}
      <div className="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => handleViewModeChange('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'today'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleViewModeChange('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'custom'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Custom Date
            </button>
          </div>

          {viewMode === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Employees</p>
            <i className="ph ph-users text-gray-400 text-xl"></i>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="card bg-green-50 dark:bg-green-900/20 p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 dark:text-green-400">Present</p>
            <i className="ph ph-check-circle text-green-500 text-xl"></i>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
        </div>

        <div className="card bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-red-700 dark:text-red-400">Absent</p>
            <i className="ph ph-x-circle text-red-500 text-xl"></i>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
        </div>

        <div className="card bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 dark:text-blue-400">Attendance Rate</p>
            <i className="ph ph-percent text-blue-500 text-xl"></i>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
        </div>
      </div>

      {/* Attendance List */}
      <div className="card bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">
            {viewMode === 'today' 
              ? "Today's Attendance" 
              : selectedDate 
                ? `Attendance for ${new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                : 'Select a date to view attendance'}
          </h3>
        </div>

        <div className="p-6">
          {attendanceData.length === 0 ? (
            <div className="text-center py-8">
              <i className="ph ph-users text-gray-400 text-5xl mb-3"></i>
              <p className="text-gray-600 dark:text-gray-400">No team members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceData.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      member.hasMarkedAttendance ? 'bg-green-500' : 'bg-gray-400'
                    }`}>
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="text-xs text-gray-400 capitalize mt-0.5">
                        {member.role?.toLowerCase() || 'Employee'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {member.hasMarkedAttendance ? (
                      <>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <i className="ph ph-check-circle text-xl"></i>
                            <span>Present</span>
                          </div>
                          {member.markedAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              Marked at {new Date(member.markedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500">
                        <i className="ph ph-x-circle text-xl"></i>
                        <span className="font-medium">Absent</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
