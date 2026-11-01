'use client';

import React, { useState } from 'react';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ImageViewerModal from '@/components/ImageViewerModal';
import { useApp } from '@/context/AppContext';
import { getTimeAgo } from '@/lib/mock-data';
import type { SocietyIssue, SocietyIssueStatus } from '@/types';

export default function SocietyIssuesPage() {
  const { societyIssues, addSocietyIssue, updateIssueStatus, addIssueUpdate } = useApp();

  const active = societyIssues.filter(i => i.status !== 'resolved');
  const resolvedIssuesList = societyIssues.filter(i => i.status === 'resolved');
  const { sortedData: resolved, sortField, sortDirection, handleSort } = useTableSort(resolvedIssuesList, 'createdAt', 'desc');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', reportedBy: '' });

  const [selectedIssue, setSelectedIssue] = useState<SocietyIssue | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<SocietyIssueStatus>('reported');

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  // Handlers
  function handleCreateIssue() {
    if (!newIssue.title.trim() || !newIssue.description.trim() || !newIssue.reportedBy.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    addSocietyIssue(newIssue);
    toast.success('Society issue reported successfully');
    setShowCreateModal(false);
    setNewIssue({ title: '', description: '', reportedBy: '' });
  }

  function handleUpdateStatus() {
    if (!selectedIssue) return;
    updateIssueStatus(selectedIssue.id, newStatus);
    toast.success('Status updated successfully');
    setShowStatusModal(false);
    setSelectedIssue(null);
  }

  function handleAddUpdate() {
    if (!selectedIssue || !updateMessage.trim()) return;
    addIssueUpdate(selectedIssue.id, updateMessage);
    toast.success('Update added successfully');
    setShowUpdateModal(false);
    setUpdateMessage('');
    setSelectedIssue(null);
  }

  function openStatusModal(issue: SocietyIssue) {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setShowStatusModal(true);
  }

  function openUpdateModal(issue: SocietyIssue) {
    setSelectedIssue(issue);
    setUpdateMessage('');
    setShowUpdateModal(true);
  }

  return (
    <>
      <Header title="Society Issues" subtitle="Common area and society-wide maintenance issues" />

      <div className="dashboard-content animate-fadeIn">
        {/* Active Issues */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
              Active Issues ({active.length})
            </h2>
            <button className="btn btn--primary btn--sm" onClick={() => setShowCreateModal(true)}>+ Report Issue</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {active.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-success-400)' }}><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div className="empty-state-title">No active issues</div>
                  <div className="empty-state-message">All common areas are functioning normally</div>
                </div>
              </div>
            ) : (
              active.map((issue) => (
                <div key={issue.id} className="card stagger-item" style={{ padding: 'var(--space-5) var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-1)' }}>
                        {issue.title}
                      </h3>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>
                        Reported by {issue.reportedBy} • {getTimeAgo(issue.createdAt)}
                      </span>
                    </div>
                    <StatusBadge status={issue.status} />
                  </div>

                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                    {issue.description}
                  </p>

                  {/* Issue Images */}
                  {issue.images && issue.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
                      {issue.images.map((imgUrl, index) => (
                        <div key={index} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setViewerImage(imgUrl)}>
                          <img
                            src={imgUrl}
                            alt={`Attachment ${index + 1}`}
                            style={{
                              width: '140px',
                              height: '140px',
                              objectFit: 'cover',
                              borderRadius: 'var(--radius-md)',
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
                  )}

                  {/* Updates Timeline */}
                  {issue.updates.length > 0 && (
                    <div style={{
                      padding: 'var(--space-4)',
                      background: 'var(--color-neutral-50)',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: 'var(--space-4)',
                    }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
                        Latest Updates
                      </div>
                      {issue.updates.map((update, idx) => (
                        <div
                          key={idx}
                          style={{
                            paddingLeft: 'var(--space-4)',
                            borderLeft: '2px solid var(--color-primary-200)',
                            marginBottom: idx < issue.updates.length - 1 ? 'var(--space-3)' : 0,
                          }}
                        >
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>{update.message}</p>
                          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', marginTop: 2 }}>
                            {update.updatedBy} • {getTimeAgo(update.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--primary btn--sm" onClick={() => openStatusModal(issue)}>Update Status</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => openUpdateModal(issue)}>Add Update</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resolved Issues */}
        {resolved.length > 0 && (
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-5)' }}>
              Resolved Issues
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <SortableHeader label="Issue" field="title" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Reported By" field="reportedBy" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Created" field="createdAt" currentSortField={sortField as string} sortDirection={sortDirection} onSort={handleSort} />
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resolved.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <div className="table-cell-primary">{issue.title}</div>
                        <div className="table-cell-secondary" style={{ marginTop: 2 }}>{issue.description.substring(0, 80)}...</div>
                      </td>
                      <td>{issue.reportedBy}</td>
                      <td className="table-cell-secondary">{getTimeAgo(issue.createdAt)}</td>
                      <td><StatusBadge status={issue.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────── */}
        {/* Modals */}
        {/* ────────────────────────────────────── */}

        {/* Create Issue Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Report Society Issue" subtitle="Create a new common area issue">
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Lift #2 malfunction" value={newIssue.title} onChange={(e) => setNewIssue(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Reported By *</label>
            <input className="form-input" placeholder="e.g. Flat 2301 or Guard Post" value={newIssue.reportedBy} onChange={(e) => setNewIssue(p => ({ ...p, reportedBy: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={3} placeholder="Describe the issue in detail..." value={newIssue.description} onChange={(e) => setNewIssue(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleCreateIssue}>Submit Issue</button>
          </div>
        </Modal>

        {/* Update Status Modal */}
        <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Issue Status" subtitle={selectedIssue?.title}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">New Status</label>
            <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value as SocietyIssueStatus)}>
              <option value="reported">Reported</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowStatusModal(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleUpdateStatus}>Save Status</button>
          </div>
        </Modal>

        {/* Add Update Modal */}
        <Modal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} title="Add Issue Update" subtitle={selectedIssue?.title}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Update Message</label>
            <textarea className="form-input" rows={3} placeholder="What is the latest progress?" value={updateMessage} onChange={(e) => setUpdateMessage(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowUpdateModal(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleAddUpdate}>Add Update</button>
          </div>
        </Modal>

        {/* Image Viewer Modal */}
        <ImageViewerModal
          isOpen={!!viewerImage}
          imageUrl={viewerImage || ''}
          onClose={() => setViewerImage(null)}
        />

      </div>
    </>
  );
}
