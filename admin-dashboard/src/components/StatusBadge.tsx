'use client';

import React from 'react';
import type { ComplaintStatus, UrgencyLevel, SlaStatus, SocietyIssueStatus, LeaveRequestStatus } from '@/types';

type BadgeType = ComplaintStatus | UrgencyLevel | SlaStatus | SocietyIssueStatus | LeaveRequestStatus | string;

interface StatusBadgeProps {
  status: BadgeType;
  withDot?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  // Complaint statuses
  submitted: 'Submitted',
  queued: 'Queued',
  visited: 'Visited',
  need_tools: 'Need Tools',
  revisit_scheduled: 'Revisit Scheduled',
  awaiting_confirmation: 'Awaiting Confirmation',
  closed: 'Closed',
  reopened: 'Reopened',
  escalated: 'Escalated',

  // Urgency levels
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  emergency: 'Emergency',

  // SLA statuses
  within_sla: 'Within SLA',
  warning: 'Warning',
  breached: 'Breached',

  // Society issue statuses
  reported: 'Reported',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',

  // Leave request statuses
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',

  // MONSOONPROOF
  triaged: 'Triaged',
  linked: 'Linked',
  open: 'Open',
  handoff_pending: 'Handoff Pending',
  in_repair: 'In Repair',
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified',
  disputed: 'Disputed',
  none: 'None',
  proposed: 'Proposed',
  accepted: 'Accepted',
  info_requested: 'Info Requested',
  draft: 'Draft',
};

export default function StatusBadge({ status, withDot = true }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`badge badge--${status}`}>
      {withDot && <span className="badge-dot" />}
      {label}
    </span>
  );
}
