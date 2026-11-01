'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import DemoRoleBar from '@/components/DemoRoleBar';
import { useMonsoonProof } from '@/context/MonsoonProofContext';
import { getTimeAgo } from '@/lib/monsoonproof/format';

export default function DashboardPage() {
  const {
    incidents,
    sharedCases,
    workOrders,
    pendingHandoffs,
    overviewCounts,
    societyName,
    assetById,
  } = useMonsoonProof();

  const incoming = incidents
    .filter((i) => i.status === 'submitted' || i.status === 'triaged')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const openCases = sharedCases
    .filter((c) => c.status !== 'verified')
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  const activeOrders = workOrders
    .filter((w) => w.status !== 'verified')
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <>
      <Header
        title="Society Overview"
        subtitle="Incoming reports, shared drainage cases, handoffs, and active repairs"
      />

      <div className="dashboard-content animate-fadeIn">
        <DemoRoleBar />

        <div className="kpi-grid">
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" />
                <path d="M8 6h4M8 10h4M8 14h4" />
              </svg>
            }
            label="Incoming Reports"
            value={overviewCounts.incomingReports}
            variant="primary"
            href="/incidents"
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V8l9-5 9 5v13" />
                <path d="M9 21V12h6v9" />
              </svg>
            }
            label="Open Shared Cases"
            value={overviewCounts.openSharedCases}
            variant="info"
            href="/shared-cases"
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            label="Pending Handoffs"
            value={overviewCounts.pendingHandoffs}
            variant="warning"
            href="/federation"
          />
          <KpiCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
            }
            label="Active Work Orders"
            value={overviewCounts.activeWorkOrders}
            variant="success"
            href="/work-orders"
          />
        </div>

        <div
          className="mp-two-col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Incoming Reports</h2>
              <Link href="/incidents" className="btn btn--ghost btn--sm">
                View All →
              </Link>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Society</th>
                    <th>Report</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {incoming.slice(0, 5).map((inc) => (
                    <tr key={inc.id}>
                      <td className="table-cell-primary">{societyName(inc.societyId)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inc.title}</div>
                        <div className="table-cell-secondary">
                          {inc.flatLabel}
                          {inc.assetId ? ` · ${assetById(inc.assetId)?.code ?? ''}` : ''}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="table-cell-secondary">{getTimeAgo(inc.createdAt)}</td>
                    </tr>
                  ))}
                  {incoming.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                        No unlinked reports.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Pending Handoffs</h2>
              <Link href="/federation" className="btn btn--ghost btn--sm">
                Inbox →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {pendingHandoffs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-neutral-500)' }}>
                  No handoffs awaiting decision.
                </div>
              ) : (
                pendingHandoffs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/shared-cases/${c.id}`}
                    style={{
                      display: 'block',
                      padding: 'var(--space-4)',
                      border: '1px solid var(--color-neutral-200)',
                      borderLeft: '4px solid var(--brand-amber)',
                      borderRadius: 'var(--radius-lg)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <strong style={{ color: 'var(--color-neutral-900)' }}>{c.title}</strong>
                      <StatusBadge status="handoff_pending" />
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', margin: 0 }}>
                      Owner remains {societyName(c.ownerSocietyId)} until accept.
                      {c.handoffToSocietyId ? ` Proposed to ${societyName(c.handoffToSocietyId)}.` : ''}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div
          className="mp-two-col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-6)',
          }}
        >
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Open Shared Cases</h2>
              <Link href="/shared-cases" className="btn btn--ghost btn--sm">
                View All →
              </Link>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Owner</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openCases.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/shared-cases/${c.id}`} className="table-cell-primary" style={{ color: 'var(--color-primary-600)' }}>
                          {c.title}
                        </Link>
                        <div className="table-cell-secondary">
                          {assetById(c.assetId)?.code} · {c.incidentIds.length} incidents
                        </div>
                      </td>
                      <td>{societyName(c.ownerSocietyId)}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Active Work Orders</h2>
              <Link href="/work-orders" className="btn btn--ghost btn--sm">
                View All →
              </Link>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Work order</th>
                    <th>Worker</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <Link href={`/work-orders/${w.id}`} className="table-cell-primary" style={{ color: 'var(--color-primary-600)' }}>
                          {w.title}
                        </Link>
                        <div className="table-cell-secondary">{getTimeAgo(w.updatedAt)}</div>
                      </td>
                      <td>{w.assignedWorkerName || 'Unassigned'}</td>
                      <td>
                        <StatusBadge status={w.status} />
                      </td>
                    </tr>
                  ))}
                  {activeOrders.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                        No active work orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
