'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';

export default function SettingsPage() {
  const { admins, addAdmin, removeAdmin } = useApp();

  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', role: '', phone: '' });

  function handleSaveSocietyInfo() {
    toast.success('Society information saved successfully');
  }

  function handleAddAdmin() {
    if (!newAdmin.name.trim() || !newAdmin.role.trim() || !newAdmin.phone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    addAdmin(newAdmin);
    toast.success('Admin committee member added');
    setShowAddAdmin(false);
    setNewAdmin({ name: '', role: '', phone: '' });
  }

  function handleRemoveAdmin(id: string, name: string) {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      removeAdmin(id);
      toast.success(`${name} removed from committee`);
    }
  }

  return (
    <>
      <Header title="Settings" subtitle="Configure society and system settings" />

      <div className="dashboard-content animate-fadeIn">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Society Info */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Society Information</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Society Name</label>
                <input className="form-input" type="text" defaultValue="Green Valley Residences" id="settings-society-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-input" type="text" defaultValue="Sector 15, Navi Mumbai, Maharashtra" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Total Flats</label>
                  <input className="form-input" type="number" defaultValue="120" />
                </div>
                <div className="form-group">
                  <label className="form-label">Buildings</label>
                  <input className="form-input" type="number" defaultValue="4" />
                </div>
              </div>
              <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={handleSaveSocietyInfo}>
                Save Changes
              </button>
            </div>
          </div>

          {/* SLA Configuration */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">SLA Configuration</h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', background: 'var(--color-neutral-100)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                V1: Read-only
              </span>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Initial Response</th>
                    <th>Escalation Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="table-cell-primary">Emergency</td>
                    <td>Immediate</td>
                    <td>15 minutes</td>
                  </tr>
                  <tr>
                    <td className="table-cell-primary">High</td>
                    <td>Same day</td>
                    <td>12 hours</td>
                  </tr>
                  <tr>
                    <td className="table-cell-primary">Medium</td>
                    <td>24 hours</td>
                    <td>2 days</td>
                  </tr>
                  <tr>
                    <td className="table-cell-primary">Low</td>
                    <td>Flexible</td>
                    <td>4 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Management */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Admin Committee</h2>
              <button className="btn btn--primary btn--sm" onClick={() => setShowAddAdmin(true)}>+ Add Admin</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {admins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-neutral-500)' }}>
                  No admins configured.
                </div>
              ) : (
                admins.map((admin, idx) => (
                  <div
                    key={admin.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-neutral-100)',
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: `linear-gradient(135deg, var(--color-primary-${400 + (idx % 3) * 100}), var(--color-primary-${500 + (idx % 3) * 100}))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 'var(--font-size-xs)',
                    }}>
                      {admin.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{admin.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>{admin.role} • {admin.phone}</div>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => handleRemoveAdmin(admin.id, admin.name)} style={{ color: 'var(--color-danger-600)' }}>Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Data & Notifications */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Data & Notifications</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Data Retention</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Complaint history is retained for 6 months</div>
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-primary-600)' }}>6 months</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Emergency Notifications</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Push + escalation after 15 min</div>
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-success-600)' }}>Enabled</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--color-neutral-50)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>SLA Breach Alerts</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Admin notified on SLA violations</div>
                </div>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-success-600)' }}>Enabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Admin Modal */}
        <Modal isOpen={showAddAdmin} onClose={() => setShowAddAdmin(false)} title="Add Admin Member">
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="e.g. Ramesh Singh" value={newAdmin.name} onChange={(e) => setNewAdmin(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Role *</label>
            <input className="form-input" placeholder="e.g. Joint Secretary" value={newAdmin.role} onChange={(e) => setNewAdmin(p => ({ ...p, role: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Phone *</label>
            <input className="form-input" placeholder="+91 XXXXXXXXXX" value={newAdmin.phone} onChange={(e) => setNewAdmin(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowAddAdmin(false)}>Cancel</button>
            <button className="btn btn--primary btn--sm" onClick={handleAddAdmin}>Add Member</button>
          </div>
        </Modal>
      </div>
    </>
  );
}
