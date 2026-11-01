'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/mock-data';
import type { ActivityLog, ActivityLogAction } from '@/types';

export default function ActivityLogsPage() {
  const { activityLogs } = useApp();
  const [actionFilter, setActionFilter] = useState<ActivityLogAction | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logs
  const filteredLogs = activityLogs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        log.complaintId.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.note.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const { sortedData: sortedFilteredLogs, sortField, sortDirection, handleSort } = useTableSort(filteredLogs, 'createdAt', 'desc');


  function getActionBadgeClass(action: ActivityLogAction) {
    switch (action) {
      case 'status_change':
        return 'badge badge--submitted';
      case 'assignment':
        return 'badge badge--visited';
      case 'admin_escalation':
        return 'badge badge--warning';
      case 'sla_breach':
        return 'badge badge--escalated';
      default:
        return 'badge badge--queued';
    }
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'admin':
        return 'badge badge--visited';
      case 'worker':
        return 'badge badge--need_tools';
      case 'resident':
        return 'badge badge--submitted';
      default:
        return 'badge badge--queued';
    }
  }

  return (
    <>
      <Header title="System Activity Logs" subtitle="Real-time operations log of society maintenance actions and background SLA checks" />

      <div className="dashboard-content animate-fadeIn">
        {/* Filters Bar */}
        <div className="filters-bar">
          <input
            type="text"
            className="form-input filter-search"
            placeholder="Search by Complaint ID, performed by, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <select
            className="form-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActivityLogAction | 'all')}
          >
            <option value="all">All Actions</option>
            <option value="status_change">Status Change</option>
            <option value="assignment">Worker Assignment</option>
            <option value="admin_escalation">Admin Escalation</option>
            <option value="sla_breach">SLA Breach / Timeout</option>
          </select>
        </div>

        {/* Activity Logs Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader label="Timestamp" field="createdAt" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} className="w-180" />
                <SortableHeader label="Complaint ID" field="complaintId" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} className="w-120" />
                <SortableHeader label="Action" field="action" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} className="w-150" />
                <SortableHeader label="Performed By" field="performedBy" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} className="w-180" />
                <th>Changes</th>
                <SortableHeader label="Note / Details" field="note" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedFilteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-neutral-300)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <div className="empty-state-title">No activities recorded</div>
                      <div className="empty-state-message">
                        Activities will be logged automatically when complaints are filed, assigned, re-opened, updated, or when the background SLA scanner runs.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedFilteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="table-cell-secondary">{formatDate(log.createdAt)}</td>
                    <td className="table-cell-primary">
                      <Link href={`/complaints/${log.complaintId}`} style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
                        {log.complaintId}
                      </Link>
                    </td>
                    <td>
                      <span className={getActionBadgeClass(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 500 }}>{log.performedBy}</span>
                        <span className={getRoleBadgeClass(log.role)} style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {log.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      {log.previousValue || log.newValue ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                          {log.previousValue ? (
                            <span style={{ textDecoration: 'line-through', color: 'var(--color-neutral-400)' }}>
                              {log.previousValue.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>none</span>
                          )}
                          <span style={{ color: 'var(--color-neutral-400)' }}>➔</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-neutral-800)' }}>
                            {log.newValue.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-neutral-400)', fontSize: 'var(--font-size-xs)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
                      {log.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
