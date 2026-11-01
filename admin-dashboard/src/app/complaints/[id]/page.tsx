'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ImageViewerModal from '@/components/ImageViewerModal';
import { useApp } from '@/context/AppContext';
import { getTimeAgo, formatDate, CATEGORY_CONFIG } from '@/lib/mock-data';
import type { ComplaintStatus } from '@/types';

export default function ComplaintDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const { complaints, workers, updateComplaintStatus, reassignComplaint, escalateComplaint } = useApp();
  
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [reassignWorker, setReassignWorker] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState('');

  // Find complaint, checking both raw ID and URL decoded ID just in case
  const complaint = complaints.find(c => c.id === id || c.id === decodeURIComponent(id));

  // If complaint not found, you could redirect or show an error.
  // Wait a tick for context to load if it's async (mock is sync though)
  if (!complaint) {
    return (
      <div className="dashboard-content" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Complaint Not Found</h2>
        <p style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--space-4)' }}>
          The complaint with ID {id} does not exist or has been removed.
        </p>
        <button className="btn btn--primary" onClick={() => router.push('/complaints')}>
          Back to Complaints
        </button>
      </div>
    );
  }

  async function handleStatusChange(status: ComplaintStatus) {
    if (!complaint) return;
    await updateComplaintStatus(complaint.id, status);
  }

  async function handleReassign() {
    if (!complaint || !reassignWorker) return;
    await reassignComplaint(complaint.id, reassignWorker);
    setShowReassignModal(false);
    setReassignWorker('');
  }

  async function handleEscalate() {
    if (!complaint || !escalateReason.trim()) return;
    await escalateComplaint(complaint.id, escalateReason);
    setShowEscalateModal(false);
    setEscalateReason('');
  }

  return (
    <>
      <Header 
        title={`Complaint ${complaint.id}`} 
        subtitle={`Flat ${complaint.flatId} • Logged on ${formatDate(complaint.createdAt)}`}
      />

      <div className="dashboard-content animate-fadeIn" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: 'var(--space-6)' }}>
        
        {/* Back Button */}
        <button 
          className="btn btn--ghost btn--sm" 
          onClick={() => router.push('/complaints')}
          style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-2) var(--space-3)' }}
        >
          ← Back to Complaints List
        </button>

        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          {/* Status Row */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
            <StatusBadge status={complaint.status} />
            <StatusBadge status={complaint.urgency} />
            <StatusBadge status={complaint.slaStatus} />
            {complaint.isEmergency && <StatusBadge status="emergency" />}
            {complaint.reopenCount >= 3 && <StatusBadge status="escalated" />}
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label" style={{ fontSize: 'var(--font-size-lg)' }}>Description</label>
            <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-800)', lineHeight: 1.6, padding: 'var(--space-3)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)' }}>
              {complaint.description}
            </p>
          </div>

          {/* Complaint Images */}
          {complaint.images && complaint.images.length > 0 && (
            <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label">Attached Photos</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
                {complaint.images.map((imgUrl, index) => (
                  <div key={index} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setViewerImage(imgUrl)}>
                    <img
                      src={imgUrl}
                      alt={`Complaint Photo ${index + 1}`}
                      style={{
                        width: '180px',
                        height: '180px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-neutral-200)',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                      View
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-800)', fontWeight: 500 }}>
                {CATEGORY_CONFIG[complaint.category].label}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Worker</label>
              <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-800)', fontWeight: 500 }}>
                {complaint.assignedWorker || 'Unassigned'}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Availability</label>
              <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-800)', fontWeight: 500 }}>
                {complaint.availability.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                {complaint.availability.customSlot ? ` (${complaint.availability.customSlot})` : ''}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Reopen Count</label>
              <span style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: complaint.reopenCount >= 3 ? 700 : 500,
                color: complaint.reopenCount >= 3 ? 'var(--color-danger-600)' : 'var(--color-neutral-800)',
              }}>
                {complaint.reopenCount}
                {complaint.reopenCount >= 3 && ' (Auto-escalated)'}
              </span>
            </div>
          </div>

          {/* Tools Info */}
          {complaint.status === 'need_tools' && complaint.toolsResponsibility && (
            <div style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-4)', border: '1px solid var(--color-warning-300)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-warning-50)' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)', color: 'var(--color-warning-800)' }}>
                <span style={{ marginRight: '8px' }}>🔧</span> 
                Tools / Parts Required
              </label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginBottom: '4px' }}>Requested Items</p>
                  <p style={{ fontWeight: 600 }}>{complaint.toolsDescription || 'Not specified'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginBottom: '4px' }}>Procurement Responsibility</p>
                  <p style={{ fontWeight: 600, color: complaint.toolsResponsibility === 'resident' ? 'var(--color-danger-600)' : 'var(--color-primary-600)' }}>
                    {complaint.toolsResponsibility === 'resident' ? 'Resident must buy' : 'Worker will procure'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', marginBottom: '4px' }}>Procurement Status</p>
                  {complaint.toolsProcured ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', backgroundColor: 'var(--color-success-100)', color: 'var(--color-success-800)', borderRadius: '12px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                      ✓ Procured
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', backgroundColor: 'var(--color-warning-100)', color: 'var(--color-warning-800)', borderRadius: '12px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Status Change */}
          {complaint.status !== 'closed' && (
            <div style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-4)', border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-lg)' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>Admin Actions: Quick Status Change</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                {(['queued', 'visited', 'need_tools', 'revisit_scheduled', 'awaiting_confirmation', 'closed'] as ComplaintStatus[])
                  .filter(s => s !== complaint.status)
                  .map(status => (
                    <button
                      key={status}
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleStatusChange(status)}
                    >
                      Mark as {status.replace(/_/g, ' ')}
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* Detailed History Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            {/* Timeline */}
            <div>
              <label className="form-label" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>Audit Timeline</label>
              {complaint.timeline.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {[...complaint.timeline].reverse().map((entry, idx) => (
                    <div key={idx} style={{
                      padding: 'var(--space-4)',
                      background: 'var(--color-neutral-50)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--color-primary-400)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>
                        {entry.action}
                      </p>
                      {entry.note && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-2)', fontStyle: 'italic' }}>
                          "{entry.note}"
                        </p>
                      )}
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>By {entry.performedBy} ({entry.role})</span>
                        <span>{formatDate(entry.timestamp)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-neutral-500)' }}>No timeline events recorded.</p>
              )}
            </div>

            {/* Worker Notes */}
            <div>
              <label className="form-label" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>Worker Notes & Logs</label>
              {complaint.workerNotes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {complaint.workerNotes.map((note, idx) => (
                    <div key={idx} style={{
                      padding: 'var(--space-4)',
                      background: 'var(--color-warning-50)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--color-warning-400)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-2)' }}>
                        {note.note}
                      </p>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{note.workerName}</span>
                        <span>{formatDate(note.timestamp)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                  No notes added by the assigned worker yet.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', borderTop: '1px solid var(--color-neutral-200)', marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setShowReassignModal(true)}>
              Reassign Worker
            </button>
            <button className="btn btn--danger" onClick={() => setShowEscalateModal(true)}>
              Force Escalate
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────── */}
      {/* Reassign Modal */}
      {/* ────────────────────────────────────── */}
      <Modal isOpen={showReassignModal} onClose={() => setShowReassignModal(false)} title="Reassign Worker" subtitle={`Complaint ${complaint.id} — Flat ${complaint.flatId}`}>
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
          <button className="btn btn--primary btn--sm" onClick={handleReassign} disabled={!reassignWorker}>Confirm Reassignment</button>
        </div>
      </Modal>

      {/* ────────────────────────────────────── */}
      {/* Escalate Modal */}
      {/* ────────────────────────────────────── */}
      <Modal isOpen={showEscalateModal} onClose={() => setShowEscalateModal(false)} title="Force Escalate Complaint" subtitle={`Complaint ${complaint.id} — Flat ${complaint.flatId}`}>
        <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="form-label">Reason for Manual Escalation</label>
          <textarea
            className="form-input"
            rows={4}
            placeholder="Describe why this complaint is being manually escalated to higher authorities..."
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            style={{ resize: 'vertical', width: '100%' }}
          />
        </div>
        <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowEscalateModal(false)}>Cancel</button>
          <button className="btn btn--danger btn--sm" onClick={handleEscalate} disabled={!escalateReason.trim()}>Confirm Escalation</button>
        </div>
      </Modal>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        imageUrl={viewerImage || ''}
        onClose={() => setViewerImage(null)}
      />
    </>
  );
}
