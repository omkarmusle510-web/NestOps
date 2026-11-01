'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import type { HallBooking } from '@/types';
import { formatDate } from '@/lib/mock-data';

export default function HallBookingsPage() {
  const { isSimulated } = useAuth();
  const { hallBookings, updateHallBookingStatus, deleteHallBooking } = useApp();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pendingBookings = hallBookings.filter(b => b.status === 'pending');
  const processedBookings = hallBookings.filter(b => b.status !== 'pending');

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge badge--awaiting_confirmation';
      case 'approved': return 'badge badge--submitted';
      case 'rejected': return 'badge badge--escalated';
      case 'cancelled': return 'badge badge--escalated';
      default: return 'badge';
    }
  };

  return (
    <>
      <Header title="Community Hall Bookings" subtitle="Manage venue reservations" />

      <div className="dashboard-content animate-fadeIn">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-neutral-200)' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
              color: activeTab === 'pending' ? 'var(--color-primary-500)' : 'var(--color-neutral-500)',
              fontWeight: activeTab === 'pending' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Pending Requests ({pendingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'processed' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
              color: activeTab === 'processed' ? 'var(--color-primary-500)' : 'var(--color-neutral-500)',
              fontWeight: activeTab === 'processed' ? 600 : 500,
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            Processed ({processedBookings.length})
          </button>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {(activeTab === 'pending' ? pendingBookings : processedBookings).map((booking) => (
            <div key={booking.id} className="card stagger-item" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                    <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-900)' }}>
                      Flat {booking.flatId} - {booking.eventName}
                    </h3>
                    <span className={getStatusBadgeClass(booking.status)}>{booking.status.toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>
                    Requested on {formatDate(booking.createdAt)}
                  </span>
                </div>
                
                {activeTab === 'processed' && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Delete this booking record forever?')) {
                        deleteHallBooking(booking.id);
                      }
                    }} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-emergency-500)' }} 
                    title="Delete Record"
                  >
                    🗑️
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: activeTab === 'pending' ? 'var(--space-5)' : 0 }}>
                <div>
                  <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: '2px' }}>Date</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{booking.date}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: '2px' }}>Time Slot</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{booking.timeSlot}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginBottom: '2px' }}>Guest Count</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{booking.guestCount}</span>
                </div>
              </div>

              {activeTab === 'pending' && (
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button
                    onClick={() => updateHallBookingStatus(booking.id, 'approved')}
                    className="btn btn--primary btn--sm"
                    style={{ flex: 1, backgroundColor: 'var(--color-success-500)' }}
                  >
                    ✓ Approve Request
                  </button>
                  <button
                    onClick={() => {
                      setRejectingBookingId(booking.id);
                      setRejectionReason('');
                      setRejectModalOpen(true);
                    }}
                    className="btn btn--outline btn--sm"
                    style={{ flex: 1, color: 'var(--color-emergency-500)', borderColor: 'var(--color-emergency-500)' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ))}

          {(activeTab === 'pending' ? pendingBookings : processedBookings).length === 0 && (
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
              No {activeTab} bookings found.
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Booking Request"
        subtitle="Please provide a mandatory reason for rejecting this booking."
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (rejectingBookingId && rejectionReason.trim()) {
            updateHallBookingStatus(rejectingBookingId, 'rejected', rejectionReason.trim());
            setRejectModalOpen(false);
          }
        }}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Rejection Reason *</label>
            <textarea
              className="form-input"
              required
              rows={3}
              placeholder="e.g. Hall is under maintenance"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: '100%', resize: 'none' }}
            />
          </div>
          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm" style={{ backgroundColor: 'var(--color-emergency-500)', borderColor: 'var(--color-emergency-500)' }}>
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
