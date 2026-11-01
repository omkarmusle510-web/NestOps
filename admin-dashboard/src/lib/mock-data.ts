// ──────────────────────────────────────
// Centralized Mock Data Service
// Single source of truth — swap to Firestore later
// ──────────────────────────────────────

import type {
  Complaint,
  Worker,
  SocietyIssue,
  LeaveRequest,
  Escalation,
  ComplaintCategory,
  UrgencyLevel,
  ComplaintStatus,
  SocietyIssueStatus,
  EscalationType,
  EscalationSeverity,
  LeaveRequestStatus,
  Notice,
  FlatLedger,
  IroningRates,
} from '@/types';

// ──────────────────────────────────────
// Complaints
// ──────────────────────────────────────

export const initialComplaints: Complaint[] = [
  {
    id: 'C001',
    flatId: '1302',
    category: 'electrical',
    description: 'Sparking from main switchboard near kitchen area',
    urgency: 'emergency',
    isEmergency: true,
    workerPriority: 'emergency',
    status: 'queued',
    slaStatus: 'breached',
    assignedWorker: 'Rajesh Kumar',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 1302', role: 'resident', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'C002',
    flatId: '2104',
    category: 'plumbing',
    description: 'Kitchen sink pipe leaking heavily, water pooling under the cabinet',
    urgency: 'high',
    isEmergency: false,
    workerPriority: 'high',
    status: 'visited',
    slaStatus: 'within_sla',
    assignedWorker: 'Suresh Patil',
    images: [],
    availability: { type: 'morning' },
    workerNotes: [
      { note: 'Inspected, need pipe wrench and sealant', workerId: 'w2', workerName: 'Suresh Patil', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 2104', role: 'resident', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Visited', performedBy: 'Suresh Patil', role: 'worker', note: 'Inspected, need pipe wrench and sealant', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C003',
    flatId: '1501',
    category: 'electrical',
    description: 'Ceiling fan making grinding noise and wobbling dangerously',
    urgency: 'medium',
    isEmergency: false,
    workerPriority: 'medium',
    status: 'need_tools',
    slaStatus: 'within_sla',
    assignedWorker: 'Rajesh Kumar',
    images: [],
    availability: { type: 'evening' },
    workerNotes: [
      { note: 'Need replacement capacitor and fan regulator', workerId: 'w1', workerName: 'Rajesh Kumar', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 1501', role: 'resident', timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Visited', performedBy: 'Rajesh Kumar', role: 'worker', timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Need Tools', performedBy: 'Rajesh Kumar', role: 'worker', note: 'Need replacement capacitor and fan regulator', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 1,
    slaDeadline: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C004',
    flatId: '1103',
    category: 'plumbing',
    description: 'Bathroom tap dripping consistently, wasting water',
    urgency: 'low',
    isEmergency: false,
    workerPriority: 'low',
    status: 'awaiting_confirmation',
    slaStatus: 'within_sla',
    assignedWorker: 'Suresh Patil',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [
      { note: 'Replaced washer and tightened fitting', workerId: 'w2', workerName: 'Suresh Patil', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 1103', role: 'resident', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Visited', performedBy: 'Suresh Patil', role: 'worker', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Marked as completed', performedBy: 'Suresh Patil', role: 'worker', note: 'Replaced washer and tightened fitting', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C005',
    flatId: '2203',
    category: 'electrical',
    description: 'Power outlets in bedroom not working after recent power outage',
    urgency: 'high',
    isEmergency: false,
    workerPriority: 'high',
    status: 'reopened',
    slaStatus: 'warning',
    assignedWorker: 'Rajesh Kumar',
    images: [],
    availability: { type: 'custom_slot', customSlot: '2-5 PM' },
    workerNotes: [
      { note: 'Checked MCB, reset breaker', workerId: 'w1', workerName: 'Rajesh Kumar', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { note: 'Issue returned, may need wiring replacement', workerId: 'w1', workerName: 'Rajesh Kumar', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 2203', role: 'resident', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Visited', performedBy: 'Rajesh Kumar', role: 'worker', timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Marked as completed', performedBy: 'Rajesh Kumar', role: 'worker', note: 'Checked MCB, reset breaker', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Complaint reopened', performedBy: 'Resident 2203', role: 'resident', note: 'Issue came back', timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Reopened again (2nd time)', performedBy: 'Resident 2203', role: 'resident', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Reopened again (3rd time) — Auto-escalated', performedBy: 'System', role: 'admin', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 3,
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C006',
    flatId: '2301',
    category: 'plumbing',
    description: 'Water pressure very low in the morning hours',
    urgency: 'medium',
    isEmergency: false,
    workerPriority: 'medium',
    status: 'queued',
    slaStatus: 'within_sla',
    assignedWorker: 'Suresh Patil',
    images: [],
    availability: { type: 'morning' },
    workerNotes: [],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 2301', role: 'resident', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C007',
    flatId: '1202',
    category: 'electrical',
    description: 'Doorbell not working, needs battery or wiring check',
    urgency: 'low',
    isEmergency: false,
    workerPriority: 'low',
    status: 'closed',
    slaStatus: 'within_sla',
    assignedWorker: 'Rajesh Kumar',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [
      { note: 'Replaced doorbell battery, working now', workerId: 'w1', workerName: 'Rajesh Kumar', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 1202', role: 'resident', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Status changed to Visited', performedBy: 'Rajesh Kumar', role: 'worker', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Marked as completed', performedBy: 'Rajesh Kumar', role: 'worker', note: 'Replaced doorbell battery, working now', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Resident confirmed completion', performedBy: 'Resident 1202', role: 'resident', timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: '',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C008',
    flatId: '2402',
    category: 'plumbing',
    description: 'Toilet flush not working properly, water keeps running',
    urgency: 'medium',
    isEmergency: false,
    workerPriority: 'medium',
    status: 'submitted',
    slaStatus: 'breached',
    assignedWorker: 'Suresh Patil',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 2402', role: 'resident', timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C009',
    flatId: '1101',
    category: 'plumbing',
    description: 'Sink tap leaking in the master bathroom',
    urgency: 'low',
    isEmergency: false,
    workerPriority: 'low',
    status: 'closed',
    slaStatus: 'within_sla',
    assignedWorker: 'Suresh Patil',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [
      { note: 'Replaced plumbing washer', workerId: 'w2', workerName: 'Suresh Patil', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 1101', role: 'resident', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Marked as completed', performedBy: 'Suresh Patil', role: 'worker', note: 'Replaced washer', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: '',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'C010',
    flatId: '2402',
    category: 'electrical',
    description: 'Balcony light bulb flickering and needs replacement',
    urgency: 'low',
    isEmergency: false,
    workerPriority: 'low',
    status: 'closed',
    slaStatus: 'within_sla',
    assignedWorker: 'Rajesh Kumar',
    images: [],
    availability: { type: 'anytime_today' },
    workerNotes: [
      { note: 'Replaced LED bulb, working perfectly', workerId: 'w1', workerName: 'Rajesh Kumar', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    timeline: [
      { action: 'Complaint created', performedBy: 'Resident 2402', role: 'resident', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Marked as completed', performedBy: 'Rajesh Kumar', role: 'worker', note: 'Replaced LED bulb, working perfectly', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { action: 'Resident confirmed completion', performedBy: 'Resident 2402', role: 'resident', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    reopenCount: 0,
    slaDeadline: '',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ──────────────────────────────────────
// Workers
// ──────────────────────────────────────

export interface WorkerWithStats extends Worker {
  activeComplaints: number;
  completedThisWeek: number;
  avgResolutionHours: number;
  slaCompliance: number;
}

export const initialWorkers: WorkerWithStats[] = [
  {
    id: 'w1',
    name: 'Rajesh Kumar',
    category: 'electrical',
    phone: '+91 98765 43210',
    inviteCode: '123456',
    active: true,
    onLeave: false,
    pauseStatus: false,
    activeComplaints: 3,
    completedThisWeek: 8,
    avgResolutionHours: 5.2,
    slaCompliance: 94,
  },
  {
    id: 'w2',
    name: 'Suresh Patil',
    category: 'plumbing',
    phone: '+91 98765 43211',
    inviteCode: '123456',
    active: true,
    onLeave: false,
    pauseStatus: false,
    activeComplaints: 2,
    completedThisWeek: 6,
    avgResolutionHours: 7.8,
    slaCompliance: 88,
  },
  {
    id: 'w3',
    name: 'Ramesh Singh',
    category: 'housekeeping',
    phone: '+91 98765 43212',
    inviteCode: '123456',
    active: true,
    onLeave: false,
    pauseStatus: false,
    activeComplaints: 1,
    completedThisWeek: 12,
    avgResolutionHours: 2.1,
    slaCompliance: 98,
  },
];

// ──────────────────────────────────────
// Escalations
// ──────────────────────────────────────

export interface EscalationWithDetails extends Escalation {
  flatId: string;
  worker: string;
  timeElapsed: string;
}

export const initialEscalations: EscalationWithDetails[] = [
  {
    id: 'E001',
    complaintId: 'C001',
    flatId: '1302',
    type: 'emergency',
    severity: 'critical',
    reason: 'Emergency complaint not acknowledged within 15 minutes. Sparking from switchboard reported.',
    worker: 'Rajesh Kumar',
    timeElapsed: '30 minutes',
    resolved: false,
    resolvedBy: '',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolvedAt: '',
  },
  {
    id: 'E002',
    complaintId: 'C005',
    flatId: '2203',
    type: 'reopen_threshold',
    severity: 'high',
    reason: 'Complaint reopened 3 times. Bedroom power outlets issue persists after multiple visits.',
    worker: 'Rajesh Kumar',
    timeElapsed: '3 days',
    resolved: false,
    resolvedBy: '',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolvedAt: '',
  },
  {
    id: 'E003',
    complaintId: 'C008',
    flatId: '2402',
    type: 'sla_breach',
    severity: 'medium',
    reason: 'Medium priority complaint exceeded 24-hour initial response SLA. No worker action taken.',
    worker: 'Suresh Patil',
    timeElapsed: '28 hours',
    resolved: false,
    resolvedBy: '',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolvedAt: '',
  },
  {
    id: 'E004',
    complaintId: 'C009',
    flatId: '1101',
    type: 'sla_breach',
    severity: 'low',
    reason: 'Low priority complaint resolved after SLA breach. Tap washer replacement took 5 days.',
    worker: 'Suresh Patil',
    timeElapsed: '5 days',
    resolved: true,
    resolvedBy: 'Admin',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ──────────────────────────────────────
// Society Issues
// ──────────────────────────────────────

export const initialSocietyIssues: SocietyIssue[] = [
  {
    id: 'SI001',
    title: 'Lift #2 malfunction — stuck between floors',
    description: 'Residents reported lift #2 getting stuck between 3rd and 4th floor. Lift company has been contacted.',
    status: 'in_progress',
    reportedBy: 'Flat 2301',
    updates: [
      { message: 'Lift company technician scheduled for tomorrow morning', updatedBy: 'Admin', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { message: 'Lift put out of service, signage placed', updatedBy: 'Admin', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'SI002',
    title: 'Parking area lights not working — Zone B',
    description: 'Multiple lights in Zone B parking area have stopped working. Dark and unsafe during evening hours.',
    status: 'assigned',
    reportedBy: 'Flat 1202',
    updates: [
      { message: 'Assigned to Rajesh (Electrician) for inspection', updatedBy: 'Admin', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'SI003',
    title: 'Water supply disruption — Building C',
    description: 'No water supply to Building C since morning. Possible pump failure or valve issue.',
    status: 'under_review',
    reportedBy: 'Flat 1501',
    updates: [],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'SI004',
    title: 'Main gate intercom not functioning',
    description: 'Gate intercom system has stopped working. Guards unable to contact residents for visitor verification.',
    status: 'resolved',
    reportedBy: 'Guard Post',
    updates: [
      { message: 'Intercom system replaced and tested', updatedBy: 'Admin', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { message: 'Vendor contacted for replacement unit', updatedBy: 'Admin', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ──────────────────────────────────────
// Leave Requests
// ──────────────────────────────────────

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'LR001',
    workerId: 'w1',
    workerName: 'Rajesh Kumar',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    reason: 'Family function',
    note: 'Will be available on phone for emergencies',
    status: 'pending',
    adminActionBy: '',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'LR002',
    workerId: 'w2',
    workerName: 'Suresh Patil',
    startDate: '2026-05-20',
    endDate: '2026-05-22',
    reason: 'Medical appointment',
    note: '',
    status: 'approved',
    adminActionBy: 'Priya Sharma',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ──────────────────────────────────────
// Admin Committee
// ──────────────────────────────────────

export interface AdminMember {
  id: string;
  name: string;
  role: string;
  phone: string;
}

export const initialAdmins: AdminMember[] = [
  { id: 'admin1', name: 'Priya Sharma', role: 'Chairperson', phone: '+91 98765 43200' },
  { id: 'admin2', name: 'Amit Patel', role: 'Secretary', phone: '+91 98765 43201' },
  { id: 'admin3', name: 'Deepa Nair', role: 'Treasurer', phone: '+91 98765 43202' },
];

// ──────────────────────────────────────
// Helper: ID Generator
// ──────────────────────────────────────

let complaintCounter = 11;
let issueCounter = 5;
let escalationCounter = 5;
let leaveCounter = 3;

export function nextComplaintId(): string {
  return `C${String(complaintCounter++).padStart(3, '0')}`;
}

export function nextIssueId(): string {
  return `SI${String(issueCounter++).padStart(3, '0')}`;
}

export function nextEscalationId(): string {
  return `E${String(escalationCounter++).padStart(3, '0')}`;
}

export function nextLeaveId(): string {
  return `LR${String(leaveCounter++).padStart(3, '0')}`;
}

// ──────────────────────────────────────
// Helper: Time Formatting
// ──────────────────────────────────────

export function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ──────────────────────────────────────
// Category helpers
// ──────────────────────────────────────

export const CATEGORY_CONFIG: Record<ComplaintCategory, { icon: string; label: string; gradient: string; color: string }> = {
  electrical: { icon: '', label: 'Electrical', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: 'var(--color-warning-600)' },
  plumbing: { icon: '', label: 'Plumbing', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'var(--color-info-600)' },
  housekeeping: { icon: '', label: 'Housekeeping', gradient: 'linear-gradient(135deg, #34d399, #10b981)', color: 'var(--color-success-600)' },
  ironing: { icon: '👕', label: 'Ironing', gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'var(--color-primary-600)' },
};

export const WORKER_FOR_CATEGORY: Record<ComplaintCategory, string> = {
  electrical: 'Rajesh Kumar',
  plumbing: 'Suresh Patil',
  housekeeping: 'Ramesh Singh',
  ironing: 'Sita Devi',
};

export const initialNotices: Notice[] = [
  {
    id: 'notice_1',
    title: 'Water Tank Cleaning Scheduled',
    topic: 'Maintenance',
    content: 'Periodic maintenance cleaning for secondary drinking water overhead tank on Friday.',
    author: 'Admin Team',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let noticeCounter = initialNotices.length + 1;
export function nextNoticeId(): string {
  return `notice_${noticeCounter++}`;
}

export const initialIroningRates: IroningRates = {
  shirts: 10,
  trousers: 15,
  sarees: 25,
  others: 12,
};

export const initialLedgers: FlatLedger[] = [
  {
    flatId: '1302',
    outstandingBalance: 110,
    transactions: [
      {
        id: 'txn_1',
        type: 'charge',
        amount: 110,
        description: 'Ironing delivery: 5 Shirts, 4 Trousers',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        itemCounts: { shirts: 5, trousers: 4, sarees: 0, others: 0 }
      }
    ]
  },
  {
    flatId: '2104',
    outstandingBalance: 162,
    transactions: [
      {
        id: 'txn_2',
        type: 'charge',
        amount: 162,
        description: 'Ironing delivery: 2 Shirts, 2 Trousers, 4 Sarees, 1 Other',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        itemCounts: { shirts: 2, trousers: 2, sarees: 4, others: 1 }
      }
    ]
  },
  {
    flatId: '1501',
    outstandingBalance: 0,
    transactions: [
      {
        id: 'txn_3',
        type: 'payment',
        amount: 80,
        description: 'Cash payment recorded',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'txn_4',
        type: 'charge',
        amount: 80,
        description: 'Ironing delivery: 8 Shirts',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        itemCounts: { shirts: 8, trousers: 0, sarees: 0, others: 0 }
      }
    ]
  },
  {
    flatId: '2203',
    outstandingBalance: 45,
    transactions: [
      {
        id: 'txn_5',
        type: 'charge',
        amount: 45,
        description: 'Ironing delivery: 3 Trousers',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        itemCounts: { shirts: 0, trousers: 3, sarees: 0, others: 0 }
      }
    ]
  },
  {
    flatId: '2402',
    outstandingBalance: 90,
    transactions: [
      {
        id: 'txn_6',
        type: 'charge',
        amount: 90,
        description: 'Ironing delivery: 6 Shirts, 2 Trousers',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        itemCounts: { shirts: 6, trousers: 2, sarees: 0, others: 0 }
      }
    ]
  }
];

let transactionCounter = 6;
export function nextTransactionId(): string {
  return `txn_${transactionCounter++}`;
}

