'use client';

import React from 'react';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { useApp } from '@/context/AppContext';

export default function AnalyticsPage() {
  const { complaints, workers } = useApp();

  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'closed').length;
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;
  
  const avgSlaCompliance = workers.length > 0 
    ? Math.round(workers.reduce((acc, w) => acc + w.slaCompliance, 0) / workers.length)
    : 0;

  const avgResolutionTime = workers.length > 0
    ? (workers.reduce((acc, w) => acc + w.avgResolutionHours, 0) / workers.length).toFixed(1)
    : 0;

  const electricalCount = complaints.filter(c => c.category === 'electrical').length;
  const plumbingCount = complaints.filter(c => c.category === 'plumbing').length;
  
  const electricalPct = totalComplaints > 0 ? Math.round((electricalCount / totalComplaints) * 100) : 0;
  const plumbingPct = totalComplaints > 0 ? Math.round((plumbingCount / totalComplaints) * 100) : 0;

  const { sortedData: sortedWorkers, sortField, sortDirection, handleSort } = useTableSort(workers, 'completedThisWeek', 'desc');

  const urgencyCounts = {
    emergency: complaints.filter(c => c.urgency === 'emergency').length,
    high: complaints.filter(c => c.urgency === 'high').length,
    medium: complaints.filter(c => c.urgency === 'medium').length,
    low: complaints.filter(c => c.urgency === 'low').length,
  };

  const handleExportCSV = () => {
    if (complaints.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['ID', 'Flat', 'Category', 'Urgency', 'Status', 'Submitted At', 'SLA Status'];
    const rows = complaints.map(c => [
      c.id,
      c.flatId,
      c.category,
      c.urgency,
      c.status,
      new Date(c.createdAt).toLocaleDateString(),
      c.slaStatus || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `society_complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header 
        title="Analytics" 
        subtitle="Complaint trends, resolution metrics, and operational insights"
        action={
          <button className="btn btn--primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export to CSV
          </button>
        }
      />

      <div className="dashboard-content animate-fadeIn">
        {/* Stats Summary */}
        <div className="kpi-grid">
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" />
                <path d="M8 6h4M8 10h4M8 14h4" />
              </svg>
            }
            label="Total Complaints (All Time)"
            value={totalComplaints}
            variant="primary"
            trend={{ value: 'Live data', direction: 'up' }}
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            }
            label="Resolved"
            value={resolvedComplaints}
            variant="success"
            trend={{ value: `${resolutionRate}% resolution rate`, direction: 'up' }}
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label="Avg Worker Resolution Time"
            value={`${avgResolutionTime}h`}
            variant="warning"
            trend={{ value: 'Based on active workers', direction: 'down' }}
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
            label="Average SLA Compliance"
            value={`${avgSlaCompliance}%`}
            variant="info"
            trend={{ value: 'Across all categories', direction: 'up' }}
          />
        </div>

        {/* Charts Placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          {/* Complaint Volume Trend */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Complaint Volume Trend</h2>
              <select className="form-select" style={{ width: 'auto' }}>
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>This Month</option>
              </select>
            </div>
            <div style={{
              height: 240,
              background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-info-50))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 'var(--space-4)',
              gap: '6px',
            }}>
              {/* Simple bar chart visualization */}
              {[35, 28, 45, 32, 50, 38, 42, 29, 55, 40, 33, 47, 36, 44].map((val, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${val * 3.5}px`,
                    background: `linear-gradient(180deg, var(--color-primary-400), var(--color-primary-600))`,
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    opacity: 0.7 + (i / 20),
                    transition: 'height var(--transition-slow)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Category Breakdown</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-4) 0' }}>
              {/* Electrical */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Electrical</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-warning-600)' }}>{electricalCount} complaints ({electricalPct}%)</span>
                </div>
                <div style={{ height: 10, background: 'var(--color-neutral-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${electricalPct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-warning-400), var(--color-warning-500))',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>
              {/* Plumbing */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Plumbing</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-info-600)' }}>{plumbingCount} complaints ({plumbingPct}%)</span>
                </div>
                <div style={{ height: 10, background: 'var(--color-neutral-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${plumbingPct}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-info-400), var(--color-info-500))',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>

              {/* Urgency Breakdown */}
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-neutral-200)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
                  By Urgency
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                  {[
                    { label: 'Emergency', value: urgencyCounts.emergency, color: 'var(--color-emergency-500)' },
                    { label: 'High', value: urgencyCounts.high, color: 'var(--color-danger-500)' },
                    { label: 'Medium', value: urgencyCounts.medium, color: 'var(--color-warning-500)' },
                    { label: 'Low', value: urgencyCounts.low, color: 'var(--color-success-500)' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Performance Comparison */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Worker Performance</h2>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <SortableHeader label="Worker" field="name" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Category" field="category" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Total Resolved" field="completedThisWeek" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Avg Resolution Time" field="avgResolutionHours" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="SLA Compliance" field="slaCompliance" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Status" field="active" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedWorkers.map(worker => (
                  <tr key={worker.id}>
                    <td className="table-cell-primary">{worker.name}</td>
                    <td>
                      {worker.category.charAt(0).toUpperCase() + worker.category.slice(1)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{worker.completedThisWeek}</td>
                    <td>{worker.avgResolutionHours}h</td>
                    <td>
                      <span style={{ fontWeight: 700, color: worker.slaCompliance >= 90 ? 'var(--color-success-600)' : 'var(--color-warning-600)' }}>
                        {worker.slaCompliance}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: worker.active ? 'var(--color-success-600)' : 'var(--color-neutral-400)' }}>
                        {worker.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
