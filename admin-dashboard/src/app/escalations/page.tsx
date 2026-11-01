'use client';

import React from 'react';
import Link from 'next/link';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import { getTimeAgo } from '@/lib/mock-data';

const TYPE_ICONS: Record<string, string> = {
  emergency: '',
  reopen_threshold: '',
  sla_breach: '',
  worker_inactivity: '',
};

const TYPE_LABELS: Record<string, string> = {
  emergency: 'Emergency Not Acknowledged',
  reopen_threshold: 'Repeated Reopening',
  sla_breach: 'SLA Breach',
  worker_inactivity: 'Worker Inactivity',
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  critical: { bg: 'var(--color-emergency-50)', border: 'var(--color-emergency-500)', color: 'var(--color-emergency-600)' },
  high: { bg: 'var(--color-danger-50)', border: 'var(--color-danger-500)', color: 'var(--color-danger-600)' },
  medium: { bg: 'var(--color-warning-50)', border: 'var(--color-warning-500)', color: 'var(--color-warning-600)' },
  low: { bg: 'var(--color-info-50)', border: 'var(--color-info-500)', color: 'var(--color-info-600)' },
};

export default function EscalationsPage() {
  const { escalations, resolveEscalation } = useApp();

  const active = escalations.filter(e => !e.resolved);
  const resolvedEscalations = escalations.filter(e => e.resolved);
  const { sortedData: resolved, sortField, sortDirection, handleSort } = useTableSort(resolvedEscalations, 'complaintId', 'asc');

  function handleResolve(id: string) {
    resolveEscalation(id);
    toast.success(`Escalation ${id} resolved`);
  }

  return (
    <>
      <Header title="Escalations" subtitle={`${active.length} active escalations requiring attention`} />

      <div className="dashboard-content animate-fadeIn">
        {/* Active Escalations */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-5)' }}>
            Active Escalations
          </h2>

          {active.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-title">No active escalations</div>
                <div className="empty-state-message">All escalations have been resolved</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {active.map((esc) => {
                const style = SEVERITY_STYLES[esc.severity];
                return (
                  <div
                    key={esc.id}
                    className="card stagger-item"
                    style={{
                      background: style.bg,
                      borderLeft: `4px solid ${style.border}`,
                      borderColor: style.border,
                      padding: 'var(--space-5) var(--space-6)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: style.color }}>
                          {TYPE_LABELS[esc.type]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <StatusBadge status={esc.severity} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>
                          {esc.timeElapsed}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                      {esc.reason}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>
                        <span>Complaint: <strong style={{ color: 'var(--color-neutral-700)' }}>{esc.complaintId}</strong></span>
                        <span>Flat: <strong style={{ color: 'var(--color-neutral-700)' }}>{esc.flatId}</strong></span>
                        <span>Worker: <strong style={{ color: 'var(--color-neutral-700)' }}>{esc.worker}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn--primary btn--sm" onClick={() => handleResolve(esc.id)}>
                          Mark Resolved
                        </button>
                        <Link href={`/complaints`} className="btn btn--secondary btn--sm">
                          View Complaint
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolved Escalations */}
        {resolved.length > 0 && (
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-5)' }}>
              Recently Resolved
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <SortableHeader label="Type" field="type" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Complaint" field="complaintId" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Flat" field="flatId" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Worker" field="worker" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Duration" field="timeElapsed" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Resolved By" field="resolvedBy" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map((esc) => (
                    <tr key={esc.id}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {TYPE_LABELS[esc.type]}
                        </span>
                      </td>
                      <td className="table-cell-primary">{esc.complaintId}</td>
                      <td>{esc.flatId}</td>
                      <td>{esc.worker}</td>
                      <td>{esc.timeElapsed}</td>
                      <td className="table-cell-secondary">{esc.resolvedBy}</td>
                      <td><StatusBadge status="resolved" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
