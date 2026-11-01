'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import DemoRoleBar from '@/components/DemoRoleBar';
import { useMonsoonProof } from '@/context/MonsoonProofContext';
import { getTimeAgo } from '@/lib/monsoonproof/format';

export default function SharedCasesPage() {
  const { sharedCases, societyName, assetById } = useMonsoonProof();

  const sorted = [...sharedCases].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );

  return (
    <>
      <Header
        title="Shared Cases"
        subtitle="Cross-society drainage cases linked to shared assets"
      />

      <div className="dashboard-content animate-fadeIn">
        <DemoRoleBar />

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Asset</th>
                <th>Owner</th>
                <th>Incidents</th>
                <th>Handoff</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      href={`/shared-cases/${c.id}`}
                      style={{ color: 'var(--color-primary-600)', fontWeight: 700 }}
                    >
                      {c.title}
                    </Link>
                    <div className="table-cell-secondary" style={{ maxWidth: 320 }}>
                      {c.summary}
                    </div>
                  </td>
                  <td>{assetById(c.assetId)?.code ?? '—'}</td>
                  <td>{societyName(c.ownerSocietyId)}</td>
                  <td>{c.incidentIds.length}</td>
                  <td>
                    <StatusBadge status={c.handoffStatus === 'none' ? 'none' : c.handoffStatus} />
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="table-cell-secondary">{getTimeAgo(c.updatedAt)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-neutral-500)' }}>
                    No shared cases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
