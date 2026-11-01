'use client';

import React from 'react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import StatusBadge from '@/components/StatusBadge';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import { useState } from 'react';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';

function getCategorySvg(category: string) {
  switch (category) {
    case 'electrical':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'plumbing':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'housekeeping':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'ironing':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
          <path d="M4 19h16M20 14.5a3 3 0 00-3-3H7a3 3 0 00-3 3V19h16v-4.5zM17 11.5V6a2 2 0 00-2-2H9a2 2 0 00-2 2v5.5" />
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      );
  }
}

const CATEGORY_ICONS: Record<string, { gradient: string }> = {
  electrical: { gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
  plumbing: { gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
  housekeeping: { gradient: 'linear-gradient(135deg, #34d399, #10b981)' },
};

export default function WorkersPage() {
  const { workers, leaveRequests, toggleWorkerActive, updateLeaveStatus, addWorker, updateWorker } = useApp();
  const { sortedData: sortedLeaveRequests, sortField, sortDirection, handleSort } = useTableSort(leaveRequests, 'startDate', 'desc');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', category: 'electrical', phone: '', inviteCode: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<{ id: string; name: string; category: string; phone: string; oldPhone: string; inviteCode: string } | null>(null);

  function handleToggleActive(id: string, currentlyActive: boolean) {
    toggleWorkerActive(id);
    toast.success(`Worker ${currentlyActive ? 'deactivated' : 'activated'} successfully`);
  }

  function handleLeaveAction(id: string, action: 'approved' | 'rejected') {
    updateLeaveStatus(id, action);
    toast.success(`Leave request ${action}`);
  }

  async function handleAddWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorker.name.trim() || !newWorker.phone.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    await addWorker({
      name: newWorker.name,
      category: newWorker.category,
      phone: newWorker.phone,
      inviteCode: newWorker.inviteCode
    });
    setShowAddModal(false);
    setNewWorker({ name: '', category: 'electrical', phone: '', inviteCode: '' });
  }

  async function handleEditWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWorker || !editingWorker.name.trim() || !editingWorker.phone.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    await updateWorker(
      editingWorker.id, 
      { name: editingWorker.name, category: editingWorker.category, phone: editingWorker.phone, inviteCode: editingWorker.inviteCode },
      editingWorker.oldPhone
    );
    setShowEditModal(false);
    setEditingWorker(null);
  }

  return (
    <>
      <Header 
        title="Worker Management" 
        subtitle="Monitor worker status, performance, and leave requests" 
        action={
          <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
            + Add Worker
          </button>
        }
      />

      <div className="dashboard-content animate-fadeIn">
        {/* Worker Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          {workers.map((worker) => {
            const cat = CATEGORY_ICONS[worker.category] || { gradient: 'linear-gradient(135deg, #9ca3af, #6b7280)' };
            return (
              <div key={worker.id} className="card stagger-item" style={{ padding: 'var(--space-6)', opacity: worker.active ? 1 : 0.6 }}>
                {/* Worker Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-xl)',
                    background: cat.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}>
                    {getCategorySvg(worker.category)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-neutral-900)' }}>
                      {worker.name}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>
                      {worker.category.charAt(0).toUpperCase() + worker.category.slice(1)} • {worker.phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                    <div style={{ background: 'var(--color-primary-50)', padding: '4px 8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--color-primary-600)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                        Passcode
                      </div>
                      <div style={{ fontSize: 'var(--font-size-md)', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-900)', letterSpacing: '1px' }}>
                        {worker.inviteCode || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <StatusBadge status={worker.active ? 'approved' : 'rejected'} />
                      {worker.onLeave && <StatusBadge status="warning" />}
                      {worker.pauseStatus && <StatusBadge status="pending" />}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  background: 'var(--color-neutral-50)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-4)',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-primary-600)' }}>
                      {worker.activeComplaints}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Active</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success-600)' }}>
                      {worker.completedThisWeek}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>This Week</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-info-600)' }}>
                      {worker.avgResolutionHours}h
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Avg Time</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 'var(--font-size-xl)',
                      fontWeight: 800,
                      color: worker.slaCompliance >= 90 ? 'var(--color-success-600)' : 'var(--color-warning-600)',
                    }}>
                      {worker.slaCompliance}%
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>SLA</div>
                  </div>
                </div>

                {/* Contact Number — matches Resident Directory style */}
                <div style={{ borderTop: '1px solid var(--color-primary-100)', paddingTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-700)' }}>Contact Number</h4>
                  {!worker.phone ? (
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-400)', fontStyle: 'italic' }}>No phone added</p>
                  ) : (
                    <a
                      href={`tel:${worker.phone}`}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--color-neutral-700)', 
                        textDecoration: 'none',
                        padding: '6px 10px',
                        background: 'var(--color-neutral-50)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-neutral-200)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-50)')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-neutral-50)')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981', flexShrink: 0 }}>
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                      </svg>
                      {worker.phone}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button 
                    className="btn btn--secondary btn--sm" 
                    style={{ flex: 1, textAlign: 'center' }}
                    onClick={() => {
                      setEditingWorker({
                        id: worker.id,
                        name: worker.name,
                        category: worker.category,
                        phone: worker.phone,
                        oldPhone: worker.phone,
                        inviteCode: worker.inviteCode || ''
                      });
                      setShowEditModal(true);
                    }}
                  >
                    Edit Details
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => handleToggleActive(worker.id, worker.active)}>
                    {worker.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leave Requests */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Leave & Pause Requests</h2>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table" id="leave-requests-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-neutral-500)' }}>
                      No leave requests at the moment.
                    </td>
                  </tr>
                ) : (
                  sortedLeaveRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="table-cell-primary">{req.workerName}</td>
                      <td>Leave</td>
                      <td>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                          {new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {' — '}
                          {new Date(req.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>
                      <td>{req.reason}</td>
                      <td className="table-cell-secondary">{req.note || '—'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button className="btn btn--primary btn--sm" onClick={() => handleLeaveAction(req.id, 'approved')}>Approve</button>
                            <button className="btn btn--danger btn--sm" onClick={() => handleLeaveAction(req.id, 'rejected')}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Worker"
          subtitle="Register a new maintenance worker to the system"
          maxWidth={500}
        >
          <form onSubmit={handleAddWorker}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ramesh Kumar"
                value={newWorker.name}
                onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +91 9876543210"
                value={newWorker.phone}
                onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={newWorker.category}
                onChange={(e) => setNewWorker({ ...newWorker, category: e.target.value })}
              >
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="ironing">Ironing</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Custom Passcode (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Leave blank to auto-generate"
                value={newWorker.inviteCode}
                onChange={(e) => setNewWorker({ ...newWorker, inviteCode: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
                Register Worker
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && editingWorker && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorker(null);
          }}
          title="Edit Worker Details"
          subtitle="Update maintenance worker information"
          maxWidth={500}
        >
          <form onSubmit={handleEditWorker}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ramesh Kumar"
                value={editingWorker.name}
                onChange={(e) => setEditingWorker({ ...editingWorker, name: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +91 9876543210"
                value={editingWorker.phone}
                onChange={(e) => setEditingWorker({ ...editingWorker, phone: e.target.value })}
                required
              />
              <span style={{ fontSize: '12px', color: 'var(--color-warning-600)', marginTop: '4px', display: 'block' }}>
                Changing the phone number will affect how this worker logs into the mobile app.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={editingWorker.category}
                onChange={(e) => setEditingWorker({ ...editingWorker, category: e.target.value })}
              >
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="ironing">Ironing</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Update Passcode (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter new 6-digit code"
                value={editingWorker.inviteCode}
                onChange={(e) => setEditingWorker({ ...editingWorker, inviteCode: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
                Save Changes
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => {
                setShowEditModal(false);
                setEditingWorker(null);
              }}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
