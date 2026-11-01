'use client';

import React, { useState, useMemo } from 'react';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/SortableHeader';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/mock-data';
import type { FlatLedger, LedgerTransaction, IroningRates, WeeklyBillRequest } from '@/types';

export default function IroningLedgerPage() {
  const {
    ledgers,
    ironingRates,
    recordIroningPayment,
    addIroningCharge,
    updateIroningRates,
    weeklyBillRequests,
    closeWeeklyBills,
    resolveDisputedBill,
    adminOverrideBill,
  } = useApp();

  // Modals state
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [showCloseWeekModal, setShowCloseWeekModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedBillRequest, setSelectedBillRequest] = useState<WeeklyBillRequest | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState<'settle' | 'carry_forward'>('settle');
  const [overrideNote, setOverrideNote] = useState('');

  // Form states
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [newRates, setNewRates] = useState<IroningRates>({});
  const [newClothType, setNewClothType] = useState('');

  // Weekly Bill summary
  const flatsWithBalance = ledgers.filter(l => l.outstandingBalance > 0);
  const totalOutstanding = flatsWithBalance.reduce((s, l) => s + l.outstandingBalance, 0);
  const totalChargesThisWeek = flatsWithBalance.reduce((s, l) => {
    const charges = l.transactions
      .filter(t => t.type === 'charge')
      .reduce((a, t) => a + t.amount, 0);
    return s + charges;
  }, 0);

  // Current active week requests (pending/disputed)
  const activeWeekRequests = useMemo(() => {
    const activeStatuses = ['pending', 'resident_paid', 'disputed'];
    return weeklyBillRequests.filter(r => activeStatuses.includes(r.status));
  }, [weeklyBillRequests]);

  const disputedRequests = useMemo(
    () => weeklyBillRequests.filter(r => r.status === 'disputed'),
    [weeklyBillRequests]
  );

  const latestWeekId = weeklyBillRequests.length > 0 ? weeklyBillRequests[0].weekId : null;
  const latestWeekLabel = weeklyBillRequests.length > 0 ? weeklyBillRequests[0].weekLabel : '';

  const hasPendingWeek = activeWeekRequests.length > 0;

  // Get active ledger details
  const activeLedger = selectedFlatId ? ledgers.find(l => l.flatId === selectedFlatId) : null;
  const { sortedData: sortedLedgers, sortField: ledgerSortField, sortDirection: ledgerSortDirection, handleSort: handleLedgerSort } = useTableSort(ledgers, 'flatId', 'asc');

  // Handlers
  function openPaymentModal(ledger: FlatLedger) {
    setSelectedFlatId(ledger.flatId);
    setPaymentAmount(ledger.outstandingBalance);
    setShowPaymentModal(true);
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlatId || paymentAmount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }
    recordIroningPayment(selectedFlatId, paymentAmount);
    toast.success(`Payment of ₹${paymentAmount} recorded for Flat ${selectedFlatId}`);
    setShowPaymentModal(false);
    setSelectedFlatId(null);
  }

  function openDeliveryModal(ledger: FlatLedger) {
    setSelectedFlatId(ledger.flatId);
    
    // Initialize item counts for all existing cloth types to 0
    const initialCounts: Record<string, number> = {};
    Object.keys(ironingRates).forEach(key => initialCounts[key] = 0);
    setItemCounts(initialCounts);
    
    setShowDeliveryModal(true);
  }

  const calculatedTotalDeliveryCost = Object.entries(itemCounts).reduce((total, [cloth, count]) => {
    const rate = ironingRates[cloth] || 0;
    return total + (count * rate);
  }, 0);

  function handleDeliverySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFlatId) return;
    
    const totalItems = Object.values(itemCounts).reduce((a, b) => a + b, 0);
    if (totalItems === 0) {
      toast.error('Please add at least one cloth item');
      return;
    }

    addIroningCharge(selectedFlatId, itemCounts);
    toast.success(`Delivery of ${totalItems} clothes recorded for Flat ${selectedFlatId} (₹${calculatedTotalDeliveryCost})`);
    setShowDeliveryModal(false);
    setSelectedFlatId(null);
  }

  function openRatesModal() {
    setNewRates({ ...ironingRates });
    setShowRatesModal(true);
  }

  function handleRatesSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateIroningRates(newRates);
    toast.success('Ironing rates updated successfully');
    setShowRatesModal(false);
  }

  function handleAddNewClothType() {
    const type = newClothType.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!type) return;
    
    if (newRates[type] !== undefined) {
      toast.error('Cloth type already exists');
      return;
    }
    
    setNewRates(prev => ({ ...prev, [type]: 0 }));
    setNewClothType('');
    toast.success(`Added ${type}, please set a price`);
  }

  // Aggregate all transactions across ledgers to show a chronological global feed
  interface GlobalTransaction extends LedgerTransaction {
    flatId: string;
  }
  const recentTransactions: GlobalTransaction[] = ledgers
    .flatMap(l => l.transactions.map(t => ({ ...t, flatId: l.flatId })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const { sortedData: sortedTransactions, sortField: txSortField, sortDirection: txSortDirection, handleSort: handleTxSort } = useTableSort(recentTransactions, 'timestamp', 'desc');

  const handleExportCSV = () => {
    if (ledgers.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = ['Flat ID', 'Outstanding Balance', 'Last Paid Amount', 'Last Paid Date'];
    const rows = ledgers.map(l => {
      const payments = l.transactions.filter(t => t.type === 'payment').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastPayment = payments.length > 0 ? payments[0] : null;
      
      return [
        l.flatId,
        l.outstandingBalance,
        lastPayment ? lastPayment.amount : 0,
        lastPayment ? new Date(lastPayment.timestamp).toLocaleDateString() : 'N/A'
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ironing_bills_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header 
        title="Ironing Bills & Ledger" 
        subtitle="Manage flat-wise ironing deliveries and record payments"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export to CSV
            </button>
            <button className="btn btn--secondary" onClick={openRatesModal}>Manage Rates</button>
            <button
              className="btn btn--primary"
              onClick={() => setShowCloseWeekModal(true)}
              disabled={hasPendingWeek}
              title={hasPendingWeek ? `Bills for ${latestWeekLabel} already sent — awaiting confirmations` : 'Send weekly bills to all flats with dues'}
              style={{ opacity: hasPendingWeek ? 0.6 : 1, cursor: hasPendingWeek ? 'not-allowed' : 'pointer' }}
            >
              🗓️ Close Week&apos;s Bills
            </button>
          </div>
        }
      />

      <div className="dashboard-content animate-fadeIn">
        {/* Top Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          
          {/* Section: Flat Ledger Dues */}
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-5)' }}>
              Resident Balances
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <SortableHeader label="Flat ID" field="flatId" currentSortField={ledgerSortField as string} sortDirection={ledgerSortDirection} onSort={handleLedgerSort} />
                    <SortableHeader label="Outstanding Dues" field="outstandingBalance" currentSortField={ledgerSortField as string} sortDirection={ledgerSortDirection} onSort={handleLedgerSort} />
                    <th>Last Transaction</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-neutral-500)' }}>
                        No ledgers found.
                      </td>
                    </tr>
                  ) : (
                    sortedLedgers.map((ledger) => {
                      const lastTx = ledger.transactions[0];
                      const lastTxDesc = lastTx 
                        ? `${lastTx.type === 'charge' ? 'Charged' : 'Paid'} ₹${lastTx.amount} (${formatDate(lastTx.timestamp)})`
                        : 'No activity';

                      return (
                        <tr key={ledger.flatId}>
                          <td className="table-cell-primary">Flat {ledger.flatId}</td>
                          <td style={{ fontWeight: 700, color: ledger.outstandingBalance > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                            ₹{ledger.outstandingBalance}
                          </td>
                          <td className="table-cell-secondary">{lastTxDesc}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn--secondary btn--sm" 
                                onClick={() => openDeliveryModal(ledger)}
                              >
                                + Record Delivery
                              </button>
                              <button 
                                className="btn btn--primary btn--sm" 
                                onClick={() => openPaymentModal(ledger)}
                                disabled={ledger.outstandingBalance === 0}
                                style={{ opacity: ledger.outstandingBalance === 0 ? 0.5 : 1 }}
                              >
                                Clear Dues
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Price Configuration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                Active Rates
              </h2>
              <button className="btn btn--secondary btn--sm" onClick={openRatesModal}>Edit Rates</button>
            </div>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {Object.entries(ironingRates).map(([clothType, rate], index, array) => (
                  <div key={clothType} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: index === array.length - 1 ? 0 : 'var(--space-2)', borderBottom: index === array.length - 1 ? 'none' : '1px solid var(--color-neutral-100)' }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-neutral-600)', textTransform: 'capitalize' }}>{clothType}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-neutral-800)' }}>₹{rate} / piece</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Global Recent Ledger Feed */}
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', marginBottom: 'var(--space-5)' }}>
            Recent Activities
          </h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <SortableHeader label="Time" field="timestamp" currentSortField={txSortField as string} sortDirection={txSortDirection} onSort={handleTxSort} />
                  <SortableHeader label="Flat" field="flatId" currentSortField={txSortField as string} sortDirection={txSortDirection} onSort={handleTxSort} />
                  <SortableHeader label="Description" field="description" currentSortField={txSortField as string} sortDirection={txSortDirection} onSort={handleTxSort} />
                  <SortableHeader label="Type" field="type" currentSortField={txSortField as string} sortDirection={txSortDirection} onSort={handleTxSort} />
                  <SortableHeader label="Amount" field="amount" currentSortField={txSortField as string} sortDirection={txSortDirection} onSort={handleTxSort} className="text-right" />
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-neutral-500)' }}>
                      No transactions recorded.
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="table-cell-secondary">{formatDate(tx.timestamp)}</td>
                      <td className="table-cell-primary">Flat {tx.flatId}</td>
                      <td>{tx.description}</td>
                      <td>
                        <span className={`badge ${tx.type === 'charge' ? 'badge--need_tools' : 'badge--awaiting_confirmation'}`}>
                          {tx.type === 'charge' ? 'Delivery Charge' : 'Cash Paid'}
                        </span>
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 700, 
                        color: tx.type === 'charge' ? 'var(--color-danger-600)' : 'var(--color-success-600)' 
                      }}>
                        {tx.type === 'charge' ? '+' : '-'} ₹{tx.amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── Bill Closing Status Section ── */}
      {(activeWeekRequests.length > 0 || disputedRequests.length > 0) && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)', margin: 0 }}>
                Bill Closing Status — {latestWeekLabel}
              </h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>
                {activeWeekRequests.filter(r => r.status === 'settled' || r.status === 'admin_resolved').length} settled &nbsp;·&nbsp;
                {disputedRequests.length} disputed &nbsp;·&nbsp;
                {activeWeekRequests.filter(r => r.status === 'pending').length} pending
              </span>
            </div>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Flat</th>
                  <th>Billed</th>
                  <th>Resident</th>
                  <th>Worker</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {activeWeekRequests.map((req) => {
                  const statusColors: Record<string, string> = {
                    pending: '#f59e0b',
                    resident_paid: '#3b82f6',
                    settled: '#10b981',
                    carried_forward: '#6b7280',
                    disputed: '#ef4444',
                    admin_resolved: '#8b5cf6',
                  };
                  const statusLabels: Record<string, string> = {
                    pending: '⏳ Pending',
                    resident_paid: '🔵 Claimed Paid',
                    settled: '✅ Settled',
                    carried_forward: '⏩ Carry Fwd',
                    disputed: '⚠️ Disputed',
                    admin_resolved: '🟣 Admin Resolved',
                  };
                  return (
                    <tr key={req.id}>
                      <td className="table-cell-primary">Flat {req.flatId}</td>
                      <td style={{ fontWeight: 700 }}>₹{req.billedAmount}</td>
                      <td>
                        {req.residentConfirmed === null && <span style={{ color: '#94a3b8' }}>Awaiting…</span>}
                        {req.residentConfirmed === true && <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Paid</span>}
                        {req.residentConfirmed === false && <span style={{ color: '#6b7280' }}>⏩ Next week</span>}
                      </td>
                      <td>
                        {req.workerConfirmed === null && req.residentConfirmed === true && <span style={{ color: '#94a3b8' }}>Awaiting…</span>}
                        {req.workerConfirmed === null && req.residentConfirmed !== true && <span style={{ color: '#cbd5e1' }}>—</span>}
                        {req.workerConfirmed === true && <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Received</span>}
                        {req.workerConfirmed === false && <span style={{ color: '#ef4444' }}>❌ Not yet</span>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 600,
                          background: `${statusColors[req.status]}20`,
                          color: statusColors[req.status],
                        }}>
                          {statusLabels[req.status] ?? req.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {req.status === 'disputed' && (
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={() => { setSelectedBillRequest(req); setDisputeNote(''); setShowDisputeModal(true); }}
                            >
                              Resolve Dispute
                            </button>
                          )}
                          {(req.status === 'pending' || req.status === 'resident_paid' || req.status === 'carried_forward') && (
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                setSelectedBillRequest(req);
                                setOverrideAction('settle');
                                setOverrideNote('');
                                setShowOverrideModal(true);
                              }}
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* ── Close Week Confirmation Modal ── */}
      <Modal
        isOpen={showCloseWeekModal}
        onClose={() => setShowCloseWeekModal(false)}
        title="Close Week's Bills"
        subtitle="Send a weekly bill to every flat with outstanding dues"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary-600)' }}>{flatsWithBalance.length}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Flats with dues</div>
            </div>
            <div style={{ background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-danger-600)' }}>₹{totalOutstanding}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Total outstanding</div>
            </div>
            <div style={{ background: 'var(--color-neutral-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-warning-600)' }}>₹{totalChargesThisWeek}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginTop: '4px' }}>Charges this week</div>
            </div>
          </div>
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: '#92400e' }}>
            <strong>What happens next:</strong> Each flat with dues will receive a push notification with their bill breakdown. They tap &quot;I&apos;ve Paid&quot; to notify the ironing worker, who then confirms receipt. Unresponded bills auto-carry forward in 48h.
          </div>
          {flatsWithBalance.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-neutral-500)' }}>No flats with outstanding balance. Nothing to close.</p>
          )}
        </div>
        <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowCloseWeekModal(false)}>Cancel</button>
          <button
            className="btn btn--primary btn--sm"
            disabled={flatsWithBalance.length === 0}
            onClick={async () => {
              setShowCloseWeekModal(false);
              await closeWeeklyBills();
            }}
          >
            Send Bills &amp; Close Week
          </button>
        </div>
      </Modal>

      {/* ── Resolve Dispute Modal ── */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => { setShowDisputeModal(false); setSelectedBillRequest(null); }}
        title={`Resolve Dispute — Flat ${selectedBillRequest?.flatId}`}
        subtitle={`${selectedBillRequest?.weekLabel} · ₹${selectedBillRequest?.billedAmount}`}
      >
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: '#991b1b' }}>
            <strong>⚠️ Dispute:</strong> Resident claimed payment but worker has not confirmed receipt.
          </div>
          <div className="form-group">
            <label className="form-label">Admin Note (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Resident showed UPI receipt"
              value={disputeNote}
              onChange={e => setDisputeNote(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: 0, border: 'none', gap: 'var(--space-2)' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => { setShowDisputeModal(false); setSelectedBillRequest(null); }}>Cancel</button>
          <button
            className="btn btn--secondary btn--sm"
            onClick={async () => {
              if (!selectedBillRequest) return;
              await resolveDisputedBill(selectedBillRequest.id, false, disputeNote || undefined);
              setShowDisputeModal(false); setSelectedBillRequest(null);
            }}
          >
            Carry Forward
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={async () => {
              if (!selectedBillRequest) return;
              await resolveDisputedBill(selectedBillRequest.id, true, disputeNote || undefined);
              setShowDisputeModal(false); setSelectedBillRequest(null);
            }}
          >
            Mark Settled
          </button>
        </div>
      </Modal>

      {/* ── Admin Override Modal ── */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => { setShowOverrideModal(false); setSelectedBillRequest(null); }}
        title={`Admin Override — Flat ${selectedBillRequest?.flatId}`}
        subtitle={`${selectedBillRequest?.weekLabel} · ₹${selectedBillRequest?.billedAmount}`}
      >
        <div style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: 'var(--space-3)', border: `2px solid ${overrideAction === 'settle' ? 'var(--color-primary-500)' : 'var(--color-neutral-200)'}`, borderRadius: 'var(--radius-md)' }}>
              <input type="radio" name="override" value="settle" checked={overrideAction === 'settle'} onChange={() => setOverrideAction('settle')} />
              <div>
                <div style={{ fontWeight: 600 }}>✅ Mark as Settled</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Record payment, zero out balance</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, padding: 'var(--space-3)', border: `2px solid ${overrideAction === 'carry_forward' ? 'var(--color-neutral-400)' : 'var(--color-neutral-200)'}`, borderRadius: 'var(--radius-md)' }}>
              <input type="radio" name="override" value="carry_forward" checked={overrideAction === 'carry_forward'} onChange={() => setOverrideAction('carry_forward')} />
              <div>
                <div style={{ fontWeight: 600 }}>⏩ Carry Forward</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)' }}>Skip this week, add to next</div>
              </div>
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Reason / Note (optional)</label>
            <input type="text" className="form-input" placeholder="e.g. Direct payment received" value={overrideNote} onChange={e => setOverrideNote(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => { setShowOverrideModal(false); setSelectedBillRequest(null); }}>Cancel</button>
          <button
            className="btn btn--primary btn--sm"
            onClick={async () => {
              if (!selectedBillRequest) return;
              await adminOverrideBill(selectedBillRequest.id, overrideAction, overrideNote || undefined);
              setShowOverrideModal(false); setSelectedBillRequest(null);
            }}
          >
            Apply Override
          </button>
        </div>
      </Modal>

      {/* Existing Modals */}
      {/* Record Payment Modal */}
      <Modal 
        isOpen={showPaymentModal} 
        onClose={() => { setShowPaymentModal(false); setSelectedFlatId(null); }} 
        title={`Record Cash Payment — Flat ${selectedFlatId}`}
        subtitle="Confirm cash collected from resident to clear ledger dues"
      >
        <form onSubmit={handlePaymentSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Payment Amount (₹) *</label>
            <input 
              type="number"
              required
              className="form-input" 
              value={paymentAmount || ''} 
              onChange={(e) => setPaymentAmount(Math.max(0, parseFloat(e.target.value) || 0))} 
              min={1}
              max={activeLedger?.outstandingBalance || 10000}
              placeholder="e.g. 100"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)', marginTop: '4px' }}>
              Current Outstanding Balance: ₹{activeLedger?.outstandingBalance}
            </span>
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-6)' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowPaymentModal(false); setSelectedFlatId(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Confirm Cash Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Delivery Modal */}
      <Modal
        isOpen={showDeliveryModal}
        onClose={() => { setShowDeliveryModal(false); setSelectedFlatId(null); }}
        title={`Record Cloth Delivery — Flat ${selectedFlatId}`}
        subtitle="Add a charge to resident ledger based on returned ironed clothes"
      >
        <form onSubmit={handleDeliverySubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              {Object.keys(ironingRates).map((clothType) => (
                <div key={clothType} className="form-group">
                  <label className="form-label" style={{ textTransform: 'capitalize' }}>
                    {clothType} (₹{ironingRates[clothType]}/pc)
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={itemCounts[clothType] || ''} 
                    onChange={(e) => setItemCounts(p => ({ ...p, [clothType]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    placeholder="0"
                    min={0}
                  />
                </div>
              ))}
            </div>

            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'var(--color-neutral-50)', 
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--space-2)'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--color-neutral-600)' }}>Calculated Total Charge:</span>
              <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-primary-600)' }}>
                ₹{calculatedTotalDeliveryCost}
              </span>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setShowDeliveryModal(false); setSelectedFlatId(null); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Record Charge
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Rates Modal */}
      <Modal
        isOpen={showRatesModal}
        onClose={() => setShowRatesModal(false)}
        title="Configure Ironing Rates"
        subtitle="Set per-piece price rates for returned ironed clothes"
      >
        <form onSubmit={handleRatesSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              {Object.keys(newRates).map((clothType) => (
                <div key={clothType} className="form-group">
                  <label className="form-label" style={{ textTransform: 'capitalize', display: 'flex', justifyContent: 'space-between' }}>
                    {clothType} (₹) *
                    <button type="button" onClick={() => {
                      const updated = { ...newRates };
                      delete updated[clothType];
                      setNewRates(updated);
                    }} style={{ background: 'none', border: 'none', color: 'var(--color-danger-500)', cursor: 'pointer', padding: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </label>
                  <input 
                    type="number" 
                    required
                    className="form-input" 
                    value={newRates[clothType] || 0} 
                    onChange={(e) => setNewRates(p => ({ ...p, [clothType]: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    min={0}
                  />
                </div>
              ))}
            </div>

            {/* Add New Cloth Type */}
            <div style={{ borderTop: '1px solid var(--color-neutral-200)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <label className="form-label">Add New Cloth Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. bedsheets"
                  value={newClothType}
                  onChange={(e) => setNewClothType(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button" 
                  className="btn btn--secondary" 
                  onClick={handleAddNewClothType}
                  disabled={!newClothType.trim()}
                >
                  Add Type
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowRatesModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Save Rates
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
