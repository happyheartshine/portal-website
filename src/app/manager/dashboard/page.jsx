'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { managerApi } from '@/lib/apiClient';
import toast from '@/lib/toast';
import { formatUSD } from '@/utils/currency';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ==============================|| MANAGEMENT DASHBOARD PAGE ||============================== //

export default function ManagerDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyOrdersData, setDailyOrdersData] = useState(null);
  const [monthlyOrdersData, setMonthlyOrdersData] = useState(null);

  useEffect(() => {
    fetchDashboardSummary();
    fetchOrderGraphs();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      const response = await managerApi.getDashboardSummary();
      setSummary(response.data);
    } catch {
      // Fallback to old endpoint if new one doesn't exist
      try {
        const fallbackResponse = await managerApi.getDashboardStats();
        setSummary({
          pendingRefunds: {
            count: fallbackResponse.data?.pendingRefunds || 0,
            totalAmountUSD: 0
          },
          refundAnalytics: {
            count: 0,
            totalAmountUSD: 0
          },
          creditAnalytics: {
            count: 0,
            totalAmountUSD: 0
          }
        });
      } catch (fallbackError) {
        toast.error('Failed to load dashboard summary');
        console.error('Dashboard error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderGraphs = async () => {
    try {
      const [dailyRes, monthlyRes] = await Promise.all([
        managerApi.getDailyOrdersThisMonth().catch(() => ({ data: null })),
        managerApi.getMonthlyOrdersLast3().catch(() => ({ data: null }))
      ]);
      
      // Transform daily orders data: { data: [{ date, count }] } -> { labels, values }
      if (dailyRes.data?.data) {
        setDailyOrdersData({
          labels: dailyRes.data.data.map(item => item.date),
          values: dailyRes.data.data.map(item => item.count)
        });
      } else {
        setDailyOrdersData(null);
      }
      
      // Transform monthly orders data: { data: [{ month, label, count }] } -> { labels, values }
      if (monthlyRes.data?.data) {
        setMonthlyOrdersData({
          labels: monthlyRes.data.data.map(item => item.label || item.month),
          values: monthlyRes.data.data.map(item => item.count)
        });
      } else {
        setMonthlyOrdersData(null);
      }
    } catch (error) {
      console.error('Failed to load order graphs:', error);
      // Silently fail - don't show error toast for analytics
    }
  };

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
        <h1 className="text-2xl font-bold">Management Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of refunds, credits, and pending approvals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-12 gap-4">
        {/* Total Pending Refunds */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Total Pending Refunds</h5>
                <i className="ph ph-receipt text-warning-500 text-2xl"></i>
              </div>
              <h2 className="mb-1 text-3xl font-bold">{summary?.pendingRefunds?.count || 0}</h2>
              <p className="mb-0 text-sm text-muted">
                Total Amount: <strong className="text-warning-500">{formatUSD(summary?.pendingRefunds?.totalAmountUSD || 0)}</strong>
              </p>
              <a href="/manager/refunds" className="text-sm text-primary-500 hover:text-primary-600 mt-2 inline-block">
                Process Refunds →
              </a>
            </div>
          </div>
        </div>

        {/* Refund Analytics */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Refund Analytics</h5>
                <i className="ph ph-chart-line text-primary-500 text-2xl"></i>
              </div>
              <h2 className="mb-1 text-3xl font-bold">{summary?.refundAnalytics?.count || 0}</h2>
              <p className="mb-0 text-sm text-muted">
                Total Amount: <strong className="text-primary-500">{formatUSD(summary?.refundAnalytics?.totalAmountUSD || 0)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Total Credit Analytics */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="mb-0">Total Credit Analytics</h5>
                <i className="ph ph-credit-card text-success-500 text-2xl"></i>
              </div>
              <h2 className="mb-1 text-3xl font-bold">{summary?.creditAnalytics?.count || 0}</h2>
              <p className="mb-0 text-sm text-muted">
                Total Amount: <strong className="text-success-500">{formatUSD(summary?.creditAnalytics?.totalAmountUSD || 0)}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Order Graphs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ongoing Month Orders Graph */}
        {dailyOrdersData && (
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Ongoing Month Orders</h5>
            <ReactApexChart
              options={{
                chart: { type: 'line', toolbar: { show: false } },
                xaxis: { 
                  categories: dailyOrdersData.labels || [],
                  title: { text: 'Day' }
                },
                yaxis: { title: { text: 'Order Count' } },
                title: { text: 'Daily Orders This Month', align: 'left' },
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth' }
              }}
              series={[{ name: 'Orders', data: dailyOrdersData.values || [] }]}
              type="line"
              height={300}
            />
          </div>
        )}

        {/* Monthly Orders Graph */}
        {monthlyOrdersData && (
          <div className="card bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h5 className="mb-4 text-lg font-semibold">Monthly Orders (Last 3 Months)</h5>
            <ReactApexChart
              options={{
                chart: { type: 'bar', toolbar: { show: false } },
                xaxis: { 
                  categories: monthlyOrdersData.labels || [],
                  title: { text: 'Month' }
                },
                yaxis: { title: { text: 'Order Count' } },
                title: { text: 'Monthly Orders', align: 'left' },
                dataLabels: { enabled: true }
              }}
              series={[{ name: 'Orders', data: monthlyOrdersData.values || [] }]}
              type="bar"
              height={300}
            />
          </div>
        )}
      </div>

      {/* Recent Activity / Alerts */}
      {summary?.pendingRefunds?.count > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-start gap-3">
            <i className="ph ph-bell text-yellow-500 text-2xl"></i>
            <div>
              <h5 className="mb-1 font-semibold">Action Required</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have {summary.pendingRefunds.count} pending refund(s) to process
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
