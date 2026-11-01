'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DemoRoleBar from '@/components/DemoRoleBar';
import { useMonsoonProof } from '@/context/MonsoonProofContext';
import { getTimeAgo } from '@/lib/monsoonproof/format';
import type { SocietyId } from '@/lib/monsoonproof/types';

export default function IncidentsPage() {
  const {
    incidents,
    assets,
    societies,
    societyName,
    assetById,
    sharedCases,
    linkIncidentsToSharedCase,
    activeSocietyId,
  } = useMonsoonProof();

  const [statusFilter, setStatusFilter] = useState('all');
  const [societyFilter, setSocietyFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [targetCaseId, setTargetCaseId] = useState('');
  const [ownerSocietyId, setOwnerSocietyId] = useState<SocietyId>(activeSocietyId);
  const [confirming, setConfirming] = useState(false);

  const filtered = useMemo(() => {
    return incidents
      .filter((i) => (statusFilter === 'all' ? true : i.status === statusFilter))
      .filter((i) => (societyFilter === 'all' ? true : i.societyId === societyFilter))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [incidents, statusFilter, societyFilter]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleLink() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (selected.length === 0) {
      toast.error('Select at least one incident.');
      return;
    }
    const assetId = 'asset_d03';
    const existing = sharedCases.find((c) => c.id === targetCaseId);
    const result = await linkIncidentsToSharedCase({
      caseId: targetCaseId || undefined,
      incidentIds: selected,
      assetId,
      ownerSocietyId,
      title: targetCaseId ? undefined : 'D-03 linked drainage case',
      summary: 'Incidents linked from Incoming Reports.',
      expectedVersion: existing?.version ?? 0,
    });
    if (!result.ok) {
      toast.error(result.error || 'Link failed');
      setConfirming(false);
      return;
    }
    toast.success('Incidents linked to shared case');
    setLinkOpen(false);
    setSelected([]);
    setConfirming(false);
    setTargetCaseId('');
  }

  return (
    <>
      <Header
        title="Incoming Reports"
        subtitle="Resident and facilities reports that may map to shared drainage assets"
        action={
          <button
            className="btn btn--primary btn--sm"
            disabled={selected.length === 0}
            onClick={() => {
              setOwnerSocietyId(activeSocietyId);
              setConfirming(false);
              setLinkOpen(true);
            }}
          >
            Link to Shared Case ({selected.length})
          </button>
        }
      />

      <div className="dashboard-content animate-fadeIn">
        <DemoRoleBar />

        <div className="filters-bar">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="triaged">Triaged</option>
            <option value="linked">Linked</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="form-select"
            value={societyFilter}
            onChange={(e) => setSocietyFilter(e.target.value)}
          >
            <option value="all">All societies</option>
            {societies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Society</th>
                <th>Location</th>
                <th>Report</th>
                <th>Asset</th>
                <th>Status</th>
                <th>When</th>
                <th>Case</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(inc.id)}
                      disabled={inc.status === 'linked'}
                      onChange={() => toggleSelect(inc.id)}
                      aria-label={`Select ${inc.id}`}
                    />
                  </td>
                  <td className="table-cell-primary">{societyName(inc.societyId)}</td>
                  <td>{inc.flatLabel}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inc.title}</div>
                    <div className="table-cell-secondary" style={{ maxWidth: 280 }}>
                      {inc.description}
                    </div>
                  </td>
                  <td>{inc.assetId ? assetById(inc.assetId)?.code ?? '—' : '—'}</td>
                  <td>
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="table-cell-secondary">{getTimeAgo(inc.createdAt)}</td>
                  <td>
                    {inc.sharedCaseId ? (
                      <Link href={`/shared-cases/${inc.sharedCaseId}`} style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
                        View
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-neutral-500)' }}>
                    No reports match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={linkOpen}
        onClose={() => {
          setLinkOpen(false);
          setConfirming(false);
        }}
        title="Link incidents to shared case"
        subtitle="Creates or appends a cross-society case. Confirm before applying."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Existing case (optional)</label>
            <select
              className="form-select"
              value={targetCaseId}
              onChange={(e) => setTargetCaseId(e.target.value)}
            >
              <option value="">Create new case</option>
              {sharedCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          {!targetCaseId && (
            <div className="form-group">
              <label className="form-label">Owner society</label>
              <select
                className="form-select"
                value={ownerSocietyId}
                onChange={(e) => setOwnerSocietyId(e.target.value as SocietyId)}
              >
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="mp-confirm-note">
            Asset: {assets.find((a) => a.id === 'asset_d03')?.code} · {selected.length} incident(s)
          </p>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--secondary" onClick={() => { setLinkOpen(false); setConfirming(false); }}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={handleLink}>
              {confirming ? 'Confirm link' : 'Review & continue'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
