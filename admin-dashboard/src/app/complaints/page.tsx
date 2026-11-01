'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';
import { getTimeAgo, formatDate, CATEGORY_CONFIG } from '@/lib/mock-data';
import type { Complaint, ComplaintStatus, ComplaintCategory, UrgencyLevel } from '@/types';

// ──────────────────────────────────────
// Complaints Page
// ──────────────────────────────────────

function ComplaintsPageContent() {
  const { complaints, workers, ledgers, updateComplaintStatus, reassignComplaint, escalateComplaint, addComplaint } = useApp();

  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = (searchParams.get('status') as ComplaintStatus | 'active' | null) || 'all';
  const initialCategory = (searchParams.get('category') as ComplaintCategory | null) || 'all';
  const initialUrgency = (searchParams.get('urgency') as UrgencyLevel | null) || 'all';

  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all' | 'active'>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>(initialCategory);
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>(initialUrgency);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Sync state if search params change
  useEffect(() => {
    const q = searchParams.get('search');
    const status = searchParams.get('status') as ComplaintStatus | 'active' | null;
    const category = searchParams.get('category') as ComplaintCategory | null;
    const urgency = searchParams.get('urgency') as UrgencyLevel | null;
    
    if (q !== null) setSearchQuery(q);
    if (status !== null) setStatusFilter(status);
    if (category !== null) setCategoryFilter(category);
    if (urgency !== null) setUrgencyFilter(urgency);
  }, [searchParams]);

  // Helper variables for Flat Profile search feature
  const activeSearchFlatId = searchQuery.trim();
  const isNumericFlatSearch = /^\d{4}$/.test(activeSearchFlatId);
  const matchedLedger = isNumericFlatSearch ? ledgers.find(l => l.flatId === activeSearchFlatId) : null;
  const flatComplaints = isNumericFlatSearch ? complaints.filter(c => c.flatId === activeSearchFlatId) : [];

  // Modal states
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reassignWorker, setReassignWorker] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [newComplaint, setNewComplaint] = useState({ flatId: '', category: 'electrical' as ComplaintCategory, description: '', urgency: 'medium' as UrgencyLevel });

  const filtered = complaints.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    
    // If searching for a flat number (e.g., "2402"), bypass other filters to show all complaint cards/statuses for that flat
    const matchesFlat = q && c.flatId.toLowerCase().includes(q);

    if (!matchesFlat) {
      if (statusFilter !== 'all' && statusFilter !== 'active') {
        if (c.status !== statusFilter) return false;
      } else if (statusFilter === 'active') {
        if (c.status === 'closed') return false;
      }
      
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (urgencyFilter !== 'all' && c.urgency !== urgencyFilter) return false;
    }

    if (q) {
      return (
        c.flatId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.assignedWorker.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const urgencyWeight: Record<UrgencyLevel, number> = {
    emergency: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const { sortedData: sortedAndFiltered, sortField, sortDirection, handleSort } = useTableSort(filtered, 'createdAt', 'desc');

  // Keep selectedComplaint in sync with context data
  const liveSelected = selectedComplaint ? complaints.find(c => c.id === selectedComplaint.id) || null : null;

  // ── Handlers ──

  async function handleStatusChange(id: string, status: ComplaintStatus) {
    await updateComplaintStatus(id, status);
  }

  async function handleReassign() {
    if (!liveSelected || !reassignWorker) return;
    await reassignComplaint(liveSelected.id, reassignWorker);
    setShowReassignModal(false);
    setReassignWorker('');
  }

  async function handleEscalate() {
    if (!liveSelected || !escalateReason.trim()) return;
    await escalateComplaint(liveSelected.id, escalateReason);
    setShowEscalateModal(false);
    setEscalateReason('');
    setSelectedComplaint(null);
  }

  async function handleCreateComplaint() {
    if (!newComplaint.flatId.trim() || !newComplaint.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (newComplaint.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    try {
      await addComplaint(newComplaint);
      setShowCreateModal(false);
      setNewComplaint({ flatId: '', category: 'electrical', description: '', urgency: 'medium' });
    } catch (e) {
      // Errors are toasted inside AppContext
    }
  }

  return (
    <>
      <Header title="Complaints" subtitle={`${filtered.length} complaints found`} />

      <div className="dashboard-content animate-fadeIn">
        {/* Filters */}
        <div className="filters-bar" id="complaints-filters">
          <input
            type="text"
            className="form-input filter-search"
            placeholder="Search by flat, description, or worker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="complaints-search"
          />
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | 'all' | 'active')} id="filter-status">
            <option value="all">All Statuses</option>
            <option value="active">Active (Not Closed)</option>
            <option value="submitted">Submitted</option>
            <option value="queued">Queued</option>
            <option value="visited">Visited</option>
            <option value="need_tools">Need Tools</option>
            <option value="revisit_scheduled">Revisit Scheduled</option>
            <option value="awaiting_confirmation">Awaiting Confirmation</option>
            <option value="reopened">Reopened</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
          <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ComplaintCategory | 'all')} id="filter-category">
            <option value="all">All Categories</option>
            <option value="electrical">Electrical</option>
            <option value="plumbing">Plumbing</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="ironing">Ironing</option>
          </select>
          <select className="form-select" value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as UrgencyLevel | 'all')} id="filter-urgency">
            <option value="all">All Urgency</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreateModal(true)} id="btn-create-complaint">
            + New Complaint
          </button>
        </div>

        {/* Flat Profile & History Card */}
        {isNumericFlatSearch && (
          <div className="card animate-fadeIn" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-primary-500)' }} id="flat-profile-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-600)' }}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-neutral-900)', margin: 0 }}>
                    Flat {activeSearchFlatId} Profile
                  </h2>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-2)', marginBottom: 0 }}>
                  Resident: <strong style={{ color: 'var(--color-neutral-800)' }}>{activeSearchFlatId === '1302' ? 'Sanil Grover' : `Resident ${activeSearchFlatId}`}</strong> • Role: Resident
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Outstanding Dues</span>
                  <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, color: matchedLedger && matchedLedger.outstandingBalance > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)', marginTop: '2px', marginBottom: '2px' }}>
                    ₹{matchedLedger ? matchedLedger.outstandingBalance : 0}
                  </p>
                  {matchedLedger && (
                    <Link href="/ironing" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)', textDecoration: 'underline', fontWeight: 500 }}>
                      View Ledger Dues
                    </Link>
                  )}
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--color-neutral-200)', paddingLeft: 'var(--space-6)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Complaint History</span>
                  <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 800, color: 'var(--color-neutral-800)', marginTop: '2px', marginBottom: '2px' }}>
                    {flatComplaints.length} Total
                  </p>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>
                    ({flatComplaints.filter(c => c.status !== 'closed').length} active, {flatComplaints.filter(c => c.status === 'closed').length} resolved)
                  </span>
                </div>
              </div>
            </div>
            {flatComplaints.length === 0 && (
              <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: 'var(--font-size-sm)', border: '1px dashed var(--color-neutral-200)' }}>
                No complaints made by Flat {activeSearchFlatId} yet.
              </div>
            )}
          </div>
        )}

        {/* Complaints Table */}
        <div className="table-container">
          <table className="table" id="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Flat</th>
                <th>Description</th>
                <th>Category</th>
                <th>Urgency</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Worker</th>
                <th>Reopens</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFiltered.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-neutral-300)' }}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                      </div>
                      <div className="empty-state-title">
                        {searchQuery && /^\d+$/.test(searchQuery.trim()) ? `Flat ${searchQuery.trim()}: No complaints made` : 'No complaints found'}
                      </div>
                      <div className="empty-state-message">
                        {searchQuery && /^\d+$/.test(searchQuery.trim()) ? 'This flat has not registered any complaints yet.' : 'Try adjusting your filters'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedAndFiltered.map((complaint) => {
                  const cat = CATEGORY_CONFIG[complaint.category];
                  return (
                    <tr key={complaint.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedComplaint(complaint)}>
                      <td className="table-cell-primary" style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                        {complaint.id}
                      </td>
                      <td className="table-cell-primary">{complaint.flatId}</td>
                      <td>
                        <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {complaint.description}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td><StatusBadge status={complaint.urgency} /></td>
                      <td><StatusBadge status={complaint.status} /></td>
                      <td><StatusBadge status={complaint.slaStatus} /></td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>{complaint.assignedWorker}</td>
                      <td>
                        {complaint.reopenCount > 0 ? (
                          <span style={{ fontWeight: 700, color: complaint.reopenCount >= 3 ? 'var(--color-danger-600)' : 'var(--color-warning-600)', fontSize: 'var(--font-size-sm)' }}>
                            {complaint.reopenCount}×
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-neutral-300)' }}>—</span>
                        )}
                      </td>
                      <td className="table-cell-secondary">{getTimeAgo(complaint.createdAt)}</td>
                      <td>
                        <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); setSelectedComplaint(complaint); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ────────────────────────────────────── */}
        {/* Complaint Detail Modal */}
        {/* ────────────────────────────────────── */}
        {liveSelected && (
          <Modal isOpen={!!liveSelected} onClose={() => setSelectedComplaint(null)} title={`Complaint ${liveSelected.id}`} subtitle={`Flat ${liveSelected.flatId} • ${formatDate(liveSelected.createdAt)}`} maxWidth={640}>
            {/* Status Row */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
              <StatusBadge status={liveSelected.status} />
              <StatusBadge status={liveSelected.urgency} />
              <StatusBadge status={liveSelected.slaStatus} />
              {liveSelected.isEmergency && <StatusBadge status="emergency" />}
              {liveSelected.reopenCount >= 3 && <StatusBadge status="escalated" />}
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label">Description</label>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)', lineHeight: 1.6 }}>
                {liveSelected.description}
              </p>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>
                  {CATEGORY_CONFIG[liveSelected.category].label}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Worker</label>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>
                  {liveSelected.assignedWorker || 'Unassigned'}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Availability</label>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>
                  {liveSelected.availability.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  {liveSelected.availability.customSlot ? ` (${liveSelected.availability.customSlot})` : ''}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Reopen Count</label>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: liveSelected.reopenCount >= 3 ? 700 : 400,
                  color: liveSelected.reopenCount >= 3 ? 'var(--color-danger-600)' : 'var(--color-neutral-700)',
                }}>
                  {liveSelected.reopenCount}
                  {liveSelected.reopenCount >= 3 && ' (Auto-escalated)'}
                </span>
              </div>
            </div>

            {/* Quick Status Change */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-3)' }}>
                {liveSelected.status === 'closed' ? 'Reopen Complaint' : 'Quick Status Change'}
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {liveSelected.status === 'closed' ? (
                  <button
                    className="btn btn--sm"
                    style={{ background: 'var(--color-warning-500)', color: 'white', border: 'none' }}
                    onClick={() => handleStatusChange(liveSelected.id, 'reopened')}
                  >
                    ↺ Reopen Complaint
                  </button>
                ) : (
                  (['queued', 'visited', 'need_tools', 'revisit_scheduled', 'awaiting_confirmation', 'closed'] as ComplaintStatus[])
                    .filter(s => s !== liveSelected.status)
                    .map(status => (
                      <button
                        key={status}
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleStatusChange(liveSelected.id, status)}
                      >
                        → {status.replace(/_/g, ' ')}
                      </button>
                    ))
                )}
              </div>
            </div>

            {/* Timeline */}
            {liveSelected.timeline.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-3)' }}>Timeline</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[...liveSelected.timeline].reverse().map((entry, idx) => (
                    <div key={idx} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-neutral-50)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--color-primary-400)',
                    }}>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-800)', marginBottom: 'var(--space-1)', fontWeight: 600 }}>
                        {entry.action}
                      </p>
                      {entry.note && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginBottom: 'var(--space-1)' }}>
                          {entry.note}
                        </p>
                      )}
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>
                        {entry.performedBy} • {getTimeAgo(entry.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worker Notes */}
            {liveSelected.workerNotes.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-3)' }}>Worker Notes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {liveSelected.workerNotes.map((note, idx) => (
                    <div key={idx} style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-neutral-50)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--color-warning-400)',
                    }}>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-800)', marginBottom: 'var(--space-1)' }}>
                        {note.note}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>
                        {note.workerName} • {getTimeAgo(note.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', borderTop: '1px solid var(--color-neutral-200)', paddingTop: 'var(--space-5)' }}>
              <button className="btn btn--primary btn--sm" onClick={() => { setShowReassignModal(true); }} id="btn-reassign-complaint">
                Reassign Worker
              </button>
              <button className="btn btn--secondary btn--sm" onClick={() => { setShowEscalateModal(true); }} id="btn-escalate-complaint" style={{ borderColor: 'var(--color-danger-200)', color: 'var(--color-danger-600)' }}>
                Escalate
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelectedComplaint(null)}>Close</button>
              {liveSelected.status !== 'closed' && (
                <button 
                  className="btn btn--sm" 
                  style={{ background: 'var(--color-success-600)', color: 'white', marginLeft: 'auto' }} 
                  onClick={async () => {
                    await handleStatusChange(liveSelected.id, 'closed');
                  }}
                >
                  Mark as Closed
                </button>
              )}
            </div>
          </Modal>
        )}

        {/* ────────────────────────────────────── */}
        {/* Reassign Modal */}
        {/* ────────────────────────────────────── */}
        <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="Reassign Worker" subtitle={liveSelected ? `Complaint ${liveSelected.id} — Flat ${liveSelected.flatId}` : ''}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Select Worker</label>
            <select className="form-select" value={reassignWorker} onChange={(e) => setReassignWorker(e.target.value)} style={{ width: '100%' }}>
              <option value="">Choose a worker...</option>
              {workers.map(w => (
                <option key={w.id} value={w.name}>{w.name} ({w.category}) — {w.activeComplaints} active</option>
              ))}
            </select>
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowReassignModal(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleReassign} disabled={!reassignWorker}>Reassign</button>
          </div>
        </Modal>

        {/* ────────────────────────────────────── */}
        {/* Escalate Modal */}
        {/* ────────────────────────────────────── */}
        <Modal isOpen={showEscalateModal} onClose={() => setShowEscalateModal(false)} title="Escalate Complaint" subtitle={liveSelected ? `Complaint ${liveSelected.id} — Flat ${liveSelected.flatId}` : ''}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Reason for Escalation</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Describe why this complaint needs escalation..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowEscalateModal(false)}>Cancel</button>
            <button className="btn btn--danger btn--sm" onClick={handleEscalate} disabled={!escalateReason.trim()}>Escalate</button>
          </div>
        </Modal>

        {/* ────────────────────────────────────── */}
        {/* Create Complaint Modal */}
        {/* ────────────────────────────────────── */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Complaint" subtitle="Create a complaint on behalf of a resident">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Flat Number *</label>
              <input className="form-input" placeholder="e.g. 2402" value={newComplaint.flatId} onChange={(e) => setNewComplaint(p => ({ ...p, flatId: e.target.value.toUpperCase() }))} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={newComplaint.category} onChange={(e) => setNewComplaint(p => ({ ...p, category: e.target.value as ComplaintCategory }))} style={{ width: '100%' }}>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="ironing">Ironing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Urgency *</label>
                <select className="form-select" value={newComplaint.urgency} onChange={(e) => setNewComplaint(p => ({ ...p, urgency: e.target.value as UrgencyLevel }))} style={{ width: '100%' }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description * <span style={{ fontWeight: 400, color: 'var(--color-neutral-400)' }}>({newComplaint.description.length}/500)</span></label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe the issue in detail (min 10 characters)..."
                value={newComplaint.description}
                onChange={(e) => setNewComplaint(p => ({ ...p, description: e.target.value.slice(0, 500) }))}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-5)' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleCreateComplaint}>Create Complaint</button>
          </div>
        </Modal>
      </div>
    </>
  );
}

export default function ComplaintsPage() {
  return (
    <Suspense fallback={
      <div className="dashboard-content animate-fadeIn" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
        Loading complaints...
      </div>
    }>
      <ComplaintsPageContent />
    </Suspense>
  );
}
