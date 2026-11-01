// ──────────────────────────────────────
// Shared TypeScript Types for Firestore Data Models
// Matches Architecture doc data models exactly
// ──────────────────────────────────────

// ──────────────────────────────────────
// Enums
// ──────────────────────────────────────

export type UserRole = 'resident' | 'worker' | 'admin' | 'guard';

export type ComplaintCategory = 'electrical' | 'plumbing' | 'housekeeping' | 'ironing';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'emergency';

export type ComplaintStatus =
  | 'submitted'
  | 'queued'
  | 'visited'
  | 'need_tools'
  | 'revisit_scheduled'
  | 'awaiting_confirmation'
  | 'closed'
  | 'reopened'
  | 'escalated';

export type SocietyIssueStatus =
  | 'reported'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved';

export type SlaStatus = 'within_sla' | 'warning' | 'breached';

export type AvailabilityType = 'anytime_today' | 'morning' | 'evening' | 'custom_slot';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export type EscalationType = 'sla_breach' | 'emergency' | 'reopen_threshold' | 'worker_inactivity';

export type EscalationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ActivityLogAction =
  | 'status_change'
  | 'reopen'
  | 'worker_note'
  | 'admin_escalation'
  | 'assignment'
  | 'completion'
  | 'sla_breach';

export type NotificationType =
  | 'complaint_submitted'
  | 'worker_update'
  | 'revisit_scheduled'
  | 'completion_request'
  | 'resident_unavailable'
  | 'complaint_reopened'
  | 'emergency_alert'
  | 'sla_breach'
  | 'escalation'
  | 'admin_action'
  | 'leave_request'
  | 'pause_request'
  | 'weekly_bill'
  | 'payment_claim'
  | 'bill_resolved';

export type WeeklyBillStatus =
  | 'pending'            // Bill sent, waiting for resident
  | 'resident_paid'     // Resident claimed payment, waiting for worker
  | 'settled'           // Worker confirmed receipt → balance zeroed
  | 'carried_forward'   // Resident said "next week" or timed out
  | 'disputed'          // Resident claimed paid, worker said no
  | 'admin_resolved';   // Admin manually resolved a dispute

export interface WeeklyBillRequest {
  id: string;
  weekId: string;                    // e.g. '2026-W29'
  weekLabel: string;                 // e.g. 'Jul 14–20, 2026'
  periodFrom: string;                // ISO
  periodTo: string;                  // ISO
  flatId: string;
  billedAmount: number;              // Outstanding balance at close time
  chargesThisWeek: number;          // New charges added this week
  previousCarryForward: number;     // Carried from last week
  residentConfirmed: boolean | null; // null=pending, true=paid, false=carry
  residentConfirmedAt: string | null;
  workerConfirmed: boolean | null;   // null=pending, true=received, false=not yet
  workerConfirmedAt: string | null;
  status: WeeklyBillStatus;
  resolvedBy: string | null;         // 'resident'|'worker'|'admin'|'system'
  adminNote: string | null;
  createdAt: string;
  closedAt: string | null;
}

// ──────────────────────────────────────
// Firestore Document Types
// ──────────────────────────────────────

export interface User {
  id: string;
  role: UserRole;
  flatId: string;
  phone: string;
  name: string;
  devices: string[];
  createdAt: string;
}

export interface Flat {
  id: string;
  flatNumber: string;
  building?: string;
  residents?: string[];
  phoneNumbers: string[];
  inviteCode: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  category: ComplaintCategory;
  phone: string;
  inviteCode: string;
  active: boolean;
  onLeave: boolean;
  pauseStatus: boolean;
  createdAt?: string;
}

export interface Admin {
  id: string;
  name: string;
  phone: string;
  role: 'admin';
  createdAt: string;
}

export interface Guard {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface Availability {
  type: AvailabilityType;
  customSlot?: string;
}

export interface TimelineEntry {
  action: string;
  performedBy: string;
  role: UserRole;
  note?: string;
  timestamp: string;
}

export interface WorkerNote {
  note: string;
  workerId: string;
  workerName: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  flatId: string;
  category: ComplaintCategory;
  description: string;
  urgency: UrgencyLevel;
  isEmergency: boolean;
  workerPriority: UrgencyLevel;
  status: ComplaintStatus;
  assignedWorker: string;
  images: string[];
  availability: Availability;
  workerNotes: WorkerNote[];
  timeline: TimelineEntry[];
  reopenCount: number;
  slaDeadline: string;
  slaStatus: SlaStatus;
  createdAt: string;
  updatedAt: string;
  toolsResponsibility?: 'resident' | 'worker';
  toolsProcured?: boolean;
  toolsDescription?: string;
}

export interface SocietyIssueUpdate {
  message: string;
  updatedBy: string;
  timestamp: string;
}

export interface SocietyIssue {
  id: string;
  title: string;
  description: string;
  status: SocietyIssueStatus;
  reportedBy: string;
  updates: SocietyIssueUpdate[];
  images?: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  targetUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  complaintId?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  workerId: string;
  workerName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  note: string;
  status: LeaveRequestStatus;
  adminActionBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Escalation {
  id: string;
  complaintId: string;
  type: EscalationType;
  severity: EscalationSeverity;
  reason: string;
  resolved: boolean;
  resolvedBy: string;
  createdAt: string;
  resolvedAt: string;
}

export interface ActivityLog {
  id: string;
  complaintId: string;
  action: ActivityLogAction;
  performedBy: string;
  role: UserRole;
  previousValue: string;
  newValue: string;
  note: string;
  createdAt: string;
}

// ──────────────────────────────────────
// SLA Configuration
// ──────────────────────────────────────

export interface SlaConfig {
  urgency: UrgencyLevel;
  initialResponseMinutes: number;
  escalationThresholdMinutes: number;
}

export const DEFAULT_SLA_CONFIG: SlaConfig[] = [
  { urgency: 'emergency', initialResponseMinutes: 0, escalationThresholdMinutes: 15 },
  { urgency: 'high', initialResponseMinutes: 480, escalationThresholdMinutes: 720 },    // 8h / 12h
  { urgency: 'medium', initialResponseMinutes: 1440, escalationThresholdMinutes: 2880 }, // 24h / 2d
  { urgency: 'low', initialResponseMinutes: 2880, escalationThresholdMinutes: 5760 },    // 2d / 4d
];

// ──────────────────────────────────────
// Emergency Keywords
// ──────────────────────────────────────

export const EMERGENCY_KEYWORDS = [
  'smoke',
  'sparks',
  'sparking',
  'flooding',
  'flood',
  'gas smell',
  'gas leak',
  'burning smell',
  'burning',
  'fire',
  'electric shock',
  'electrocution',
] as const;

// ──────────────────────────────────────
// Dashboard KPI Types
// ──────────────────────────────────────

export interface DashboardKPIs {
  totalActive: number;
  emergencies: number;
  slaBreaches: number;
  avgResolutionHours: number;
  pendingEscalations: number;
  reopenRate: number;
}

export interface ComplaintsByCategory {
  category: ComplaintCategory;
  count: number;
}

export interface ComplaintsByStatus {
  status: ComplaintStatus;
  count: number;
}

export interface ComplaintTrend {
  date: string;
  created: number;
  resolved: number;
}

export interface Notice {
  id: string;
  title: string;
  topic: string;
  content: string;
  author: string;
  createdAt: any;
}

export type IroningRates = Record<string, number>;

export interface LedgerTransaction {
  id: string;
  type: 'charge' | 'payment';
  amount: number;
  description: string;
  timestamp: string;
  itemCounts?: Record<string, number>;
}

export interface FlatLedger {
  flatId: string;
  outstandingBalance: number;
  transactions: LedgerTransaction[];
  weeklyBillStatus?: 'open' | 'bill_sent' | 'settled' | 'carried_forward';
  currentWeekId?: string;
  lastReminderSentAt?: string;
}

export type HallBookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface HallBooking {
  id: string;
  flatId: string;
  eventName: string;
  date: string;
  timeSlot: string;
  guestCount: number;
  status: HallBookingStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

