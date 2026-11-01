'use client';

// ──────────────────────────────────────
// App Context — Global state for Firestore
// ──────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  UrgencyLevel,
  SocietyIssue,
  SocietyIssueStatus,
  LeaveRequest,
  LeaveRequestStatus,
  Notice,
  FlatLedger,
  IroningRates,
  ActivityLog,
  Notification,
  UserRole,
  Flat,
  HallBooking,
  HallBookingStatus,
  WeeklyBillRequest,
  WeeklyBillStatus,
} from '@/types';
import {
  WORKER_FOR_CATEGORY,
  type WorkerWithStats,
  type EscalationWithDetails,
  type AdminMember,
  initialIroningRates,
} from '@/lib/mock-data';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  runTransaction,
  arrayUnion,
  increment,
  getDocs,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// ──────────────────────────────────────
// Context Shape
// ──────────────────────────────────────

interface AppContextType {
  // Data
  complaints: Complaint[];
  workers: WorkerWithStats[];
  escalations: EscalationWithDetails[];
  societyIssues: SocietyIssue[];
  leaveRequests: LeaveRequest[];
  admins: AdminMember[];
  notices: Notice[];
  ledgers: FlatLedger[];
  ironingRates: IroningRates;
  activityLogs: ActivityLog[];
  notifications: Notification[];
  flats: Flat[];
  hallBookings: HallBooking[];

  // Mobile Sidebar State
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Flat Actions
  addFlat: (data: Omit<Flat, 'id' | 'createdAt'>) => Promise<void>;
  updateFlatPhoneNumbers: (flatId: string, phoneNumbers: string[]) => Promise<void>;
  regenerateInviteCode: (flatId: string) => Promise<void>;
  updateInviteCode: (flatId: string, newCode: string) => Promise<void>;

  // Complaint Actions
  updateComplaintStatus: (id: string, status: ComplaintStatus, note?: string) => Promise<void>;
  reassignComplaint: (id: string, workerName: string) => Promise<void>;
  escalateComplaint: (id: string, reason: string) => Promise<void>;
  addComplaint: (data: { flatId: string; category: ComplaintCategory; description: string; urgency: UrgencyLevel }) => Promise<string>;

  // Society Issue Actions
  addSocietyIssue: (data: { title: string; description: string; reportedBy: string }) => Promise<void>;
  updateIssueStatus: (id: string, status: SocietyIssueStatus) => Promise<void>;
  addIssueUpdate: (id: string, message: string) => Promise<void>;

  // Worker Actions
  toggleWorkerActive: (id: string) => Promise<void>;
  addWorker: (data: { name: string; category: string; phone: string; inviteCode?: string }) => Promise<void>;
  updateWorker: (id: string, data: { name: string; category: string; phone: string; inviteCode?: string }, oldPhone?: string) => Promise<void>;

  // Leave Request Actions
  updateLeaveStatus: (id: string, status: LeaveRequestStatus) => Promise<void>;

  // Escalation Actions
  resolveEscalation: (id: string) => Promise<void>;

  // Admin Actions
  addAdmin: (data: { name: string; role: string; phone: string }) => Promise<void>;
  removeAdmin: (id: string) => Promise<void>;
  addNotice: (data: { title: string; topic: string; content: string; author?: string }) => Promise<Notice>;
  updateNotice: (id: string, data: Partial<Notice>) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;

  // Ironing Ledger Actions
  recordIroningPayment: (flatId: string, amount: number) => Promise<void>;
  addIroningCharge: (flatId: string, itemCounts: Record<string, number>) => Promise<void>;
  updateIroningRates: (rates: IroningRates) => void;

  // Weekly Bill Closing Actions
  weeklyBillRequests: WeeklyBillRequest[];
  closeWeeklyBills: () => Promise<void>;
  resolveDisputedBill: (requestId: string, settleNow: boolean, adminNote?: string) => Promise<void>;
  adminOverrideBill: (requestId: string, action: 'settle' | 'carry_forward', adminNote?: string) => Promise<void>;

  // Hall Booking Actions
  updateHallBookingStatus: (id: string, status: HallBookingStatus, reason?: string) => Promise<void>;
  deleteHallBooking: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// ──────────────────────────────────────
// Provider
// ──────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Mobile Sidebar State
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<WorkerWithStats[]>([]);
  const [rawWorkers, setRawWorkers] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<EscalationWithDetails[]>([]);
  const [societyIssues, setSocietyIssues] = useState<SocietyIssue[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [ledgers, setLedgers] = useState<FlatLedger[]>([]);
  const [ironingRates, setIroningRates] = useState<IroningRates>(initialIroningRates);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [hallBookings, setHallBookings] = useState<HallBooking[]>([]);
  const [weeklyBillRequests, setWeeklyBillRequests] = useState<WeeklyBillRequest[]>([]);

  // ── Firestore Listeners ──
  useEffect(() => {
    if (!user) return;

    // 1. Complaints
    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: Complaint[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Complaint);
        });
        setComplaints(list);
      },
      (error) => console.error('Firestore complaints listener error:', error)
    );

    // 2. Raw Workers
    const unsubWorkers = onSnapshot(
      collection(db, 'workers'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setRawWorkers(list);
      },
      (error) => console.error('Firestore workers listener error:', error)
    );

    // Flats
    const unsubFlats = onSnapshot(
      collection(db, 'flats'),
      (snapshot) => {
        const list: Flat[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Flat);
        });
        setFlats(list);
      },
      (error) => console.error('Firestore flats listener error:', error)
    );

    // 3. Escalations
    const unsubEscalations = onSnapshot(
      query(collection(db, 'escalations'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: EscalationWithDetails[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as EscalationWithDetails);
        });
        setEscalations(list);
      },
      (error) => console.error('Firestore escalations listener error:', error)
    );

    // 4. Society Issues
    const unsubIssues = onSnapshot(
      query(collection(db, 'society_issues'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: SocietyIssue[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as SocietyIssue);
        });
        setSocietyIssues(list);
      },
      (error) => console.error('Firestore society issues listener error:', error)
    );

    // 5. Leave Requests
    const unsubLeaves = onSnapshot(
      query(collection(db, 'leave_requests'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: LeaveRequest[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as LeaveRequest);
        });
        setLeaveRequests(list);
      },
      (error) => console.error('Firestore leave requests listener error:', error)
    );

    // 6. Admins
    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const list: AdminMember[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AdminMember);
        });
        setAdmins(list);
      },
      (error) => console.error('Firestore admins listener error:', error)
    );

    // 7. Notices
    const unsubNotices = onSnapshot(
      query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: Notice[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Notice);
        });
        setNotices(list);
      },
      (error) => console.error('Firestore notices listener error:', error)
    );

    // 8. Ledgers
    const unsubLedgers = onSnapshot(
      collection(db, 'flat_ledgers'),
      (snapshot) => {
        const list: FlatLedger[] = [];
        snapshot.forEach((doc) => {
          list.push({ flatId: doc.id, ...doc.data() } as FlatLedger);
        });
        setLedgers(list);
      },
      (error) => console.error('Firestore ledgers listener error:', error)
    );

    // 9. Activity Logs
    const unsubLogs = onSnapshot(
      query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as ActivityLog);
        });
        setActivityLogs(list);
      },
      (error) => console.error('Firestore activity logs listener error:', error)
    );

    // 10. Notifications
    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('targetUserId', '==', 'admin_committee_1'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Notification);
        });
        setNotifications(list);
      },
      (error) => console.error('Firestore notifications listener error:', error)
    );

    // 11. Hall Bookings
    const unsubHallBookings = onSnapshot(
      query(collection(db, 'hall_bookings'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: HallBooking[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as HallBooking);
        });
        setHallBookings(list);
      },
      (error) => console.error('Firestore hall bookings listener error:', error)
    );

    // 12. Weekly Bill Requests
    const unsubWeeklyBills = onSnapshot(
      query(collection(db, 'weekly_bill_requests'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: WeeklyBillRequest[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as WeeklyBillRequest);
        });
        setWeeklyBillRequests(list);
      },
      (error) => console.error('Firestore weekly bill requests listener error:', error)
    );

    return () => {
      unsubComplaints();
      unsubWorkers();
      unsubEscalations();
      unsubIssues();
      unsubLeaves();
      unsubAdmins();
      unsubNotices();
      unsubLedgers();
      unsubLogs();
      unsubNotifs();
      unsubFlats();
      unsubHallBookings();
      unsubWeeklyBills();
    };
  }, [user]);

  // ── Dynamically Calculate Worker Stats ──
  useEffect(() => {
    const computed = rawWorkers.map((w) => {
      const workerComplaints = complaints.filter((c) => c.assignedWorker === w.name);
      const activeComplaints = workerComplaints.filter((c) => c.status !== 'closed').length;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const completedThisWeek = workerComplaints.filter(
        (c) => c.status === 'closed' && new Date(c.updatedAt) > oneWeekAgo
      ).length;

      const closedComplaints = workerComplaints.filter((c) => c.status === 'closed');
      let avgResolutionHours = 0;
      if (closedComplaints.length > 0) {
        const totalHours = closedComplaints.reduce((acc, c) => {
          const hours = (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (3600 * 1000);
          return acc + hours;
        }, 0);
        avgResolutionHours = parseFloat((totalHours / closedComplaints.length).toFixed(1));
      }

      const totalSla = workerComplaints.length;
      const breachedSla = workerComplaints.filter((c) => c.slaStatus === 'breached').length;
      const slaCompliance = totalSla > 0 ? Math.round(((totalSla - breachedSla) / totalSla) * 100) : 100;

      return {
        ...w,
        activeComplaints,
        completedThisWeek,
        avgResolutionHours,
        slaCompliance,
      };
    });
    setWorkers(computed);
  }, [rawWorkers, complaints]);

  // ── Complaint Actions ──

  const updateComplaintStatus = useCallback(async (id: string, status: ComplaintStatus, note?: string) => {
    try {
      const now = new Date().toISOString();
      const complaintRef = doc(db, 'complaints', id);

      await updateDoc(complaintRef, {
        status,
        updatedAt: now,
        timeline: arrayUnion({
          action: `Status changed to ${status.replace(/_/g, ' ')}`,
          performedBy: 'Admin',
          role: 'admin',
          note: note || '',
          timestamp: now,
        }),
      });
      toast.success('Complaint status updated successfully.');
    } catch (e) {
      console.error('Firestore updateComplaintStatus error:', e);
      toast.error('Failed to update complaint status.');
    }
  }, []);

  const reassignComplaint = useCallback(async (id: string, workerName: string) => {
    try {
      const now = new Date().toISOString();
      const complaintRef = doc(db, 'complaints', id);

      await updateDoc(complaintRef, {
        assignedWorker: workerName,
        updatedAt: now,
        timeline: arrayUnion({
          action: `Reassigned to ${workerName}`,
          performedBy: 'Admin',
          role: 'admin',
          timestamp: now,
        }),
      });
      toast.success(`Complaint reassigned to ${workerName}.`);
    } catch (e) {
      console.error('Firestore reassignComplaint error:', e);
      toast.error('Failed to reassign complaint.');
    }
  }, []);

  const escalateComplaint = useCallback(async (id: string, reason: string) => {
    try {
      const now = new Date().toISOString();
      const complaint = complaints.find((c) => c.id === id);
      if (!complaint) return;

      const complaintRef = doc(db, 'complaints', id);
      await updateDoc(complaintRef, {
        status: 'escalated',
        updatedAt: now,
        timeline: arrayUnion({
          action: 'Escalated by admin',
          performedBy: 'Admin',
          role: 'admin',
          note: reason,
          timestamp: now,
        }),
      });

      const escalationRef = doc(collection(db, 'escalations'));
      await setDoc(escalationRef, {
        id: escalationRef.id,
        complaintId: id,
        flatId: complaint.flatId,
        type: 'sla_breach',
        severity: complaint.urgency === 'emergency' ? 'critical' : complaint.urgency === 'high' ? 'high' : 'medium',
        reason,
        worker: complaint.assignedWorker,
        resolved: false,
        resolvedBy: '',
        createdAt: now,
        resolvedAt: '',
      });
      toast.success('Complaint escalated successfully.');
    } catch (e) {
      console.error('Firestore escalateComplaint error:', e);
      toast.error('Failed to escalate complaint.');
    }
  }, [complaints]);

  const addComplaint = useCallback(async (data: { flatId: string; category: ComplaintCategory; description: string; urgency: UrgencyLevel }) => {
    try {
      const now = new Date().toISOString();
      let slaHours = 24;
      if (data.urgency === 'emergency') slaHours = 0.25;
      else if (data.urgency === 'high') slaHours = 12;
      else if (data.urgency === 'medium') slaHours = 48;
      else if (data.urgency === 'low') slaHours = 96;

      const complaintRef = doc(collection(db, 'complaints'));
      await setDoc(complaintRef, {
        id: complaintRef.id,
        flatId: data.flatId,
        category: data.category,
        description: data.description,
        urgency: data.urgency,
        isEmergency: data.urgency === 'emergency',
        workerPriority: data.urgency,
        status: 'submitted',
        slaStatus: 'within_sla',
        assignedWorker: WORKER_FOR_CATEGORY[data.category] || 'None',
        images: [],
        availability: { type: 'anytime_today' },
        workerNotes: [],
        timeline: [
          { action: 'Complaint created', performedBy: `Resident ${data.flatId}`, role: 'resident', timestamp: now },
        ],
        reopenCount: 0,
        slaDeadline: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(),
        createdAt: now,
        updatedAt: now,
      });
      toast.success('Complaint added successfully.');
      return complaintRef.id;
    } catch (e) {
      console.error('Firestore addComplaint error:', e);
      toast.error('Failed to add complaint.');
      throw e;
    }
  }, []);

  // ── Society Issue Actions ──

  const addSocietyIssue = useCallback(async (data: { title: string; description: string; reportedBy: string }) => {
    try {
      const now = new Date().toISOString();
      const ref = doc(collection(db, 'society_issues'));
      await setDoc(ref, {
        id: ref.id,
        title: data.title,
        description: data.description,
        status: 'reported',
        reportedBy: data.reportedBy,
        updates: [],
        createdAt: now,
      });
      toast.success('Society issue reported successfully.');
    } catch (e) {
      console.error('Firestore addSocietyIssue error:', e);
      toast.error('Failed to report society issue.');
    }
  }, []);

  const updateIssueStatus = useCallback(async (id: string, status: SocietyIssueStatus) => {
    try {
      const ref = doc(db, 'society_issues', id);
      await updateDoc(ref, {
        status,
        updates: arrayUnion({
          message: `Status changed to ${status.replace(/_/g, ' ')}`,
          updatedBy: 'Admin',
          timestamp: new Date().toISOString(),
        }),
      });
      toast.success('Society issue status updated.');
    } catch (e) {
      console.error('Firestore updateIssueStatus error:', e);
      toast.error('Failed to update status.');
    }
  }, []);

  const addIssueUpdate = useCallback(async (id: string, message: string) => {
    try {
      const ref = doc(db, 'society_issues', id);
      await updateDoc(ref, {
        updates: arrayUnion({
          message,
          updatedBy: 'Admin',
          timestamp: new Date().toISOString(),
        }),
      });
      toast.success('Issue update added.');
    } catch (e) {
      console.error('Firestore addIssueUpdate error:', e);
      toast.error('Failed to add update.');
    }
  }, []);

  // ── Worker Actions ──

  const toggleWorkerActive = useCallback(async (id: string) => {
    try {
      const ref = doc(db, 'workers', id);
      const worker = rawWorkers.find(w => w.id === id);
      if (!worker) return;

      await updateDoc(ref, {
        active: !worker.active,
      });
      toast.success(`Worker status set to ${!worker.active ? 'Active' : 'Inactive'}.`);
    } catch (e) {
      console.error('Firestore toggleWorkerActive error:', e);
      toast.error('Failed to toggle worker status.');
    }
  }, [rawWorkers]);

  const addWorker = useCallback(async (data: { name: string; category: string; phone: string; inviteCode?: string }) => {
    try {
      // Normalize phone: strip non-digits, take last 10, prepend +91
      const digits = data.phone.replace(/\D/g, '');
      const last10 = digits.slice(-10);
      if (last10.length !== 10) {
        toast.error('Phone number must be 10 digits.');
        return;
      }
      const normalizedPhone = `+91${last10}`;

      // Auto-generate a 6-digit invite code if not provided
      const inviteCode = data.inviteCode?.trim() || Math.floor(100000 + Math.random() * 900000).toString();

      const ref = doc(collection(db, 'workers'));
      await setDoc(ref, {
        id: ref.id,
        name: data.name,
        category: data.category,
        phone: normalizedPhone,
        inviteCode,
        active: true,
        onLeave: false,
        pauseStatus: false,
        rating: 5,
        ratingCount: 0,
        completedThisWeek: 0,
        avgResolutionHours: 0,
        slaCompliance: 100,
        activeComplaints: 0,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Worker added. Invite code: ${inviteCode}`);
    } catch (e) {
      console.error('Firestore addWorker error:', e);
      toast.error('Failed to add worker.');
    }
  }, []);

  const updateWorker = useCallback(async (id: string, data: { name: string; category: string; phone: string; inviteCode?: string }, oldPhone?: string) => {
    try {
      // Normalize phone for update too
      const digits = data.phone.replace(/\D/g, '');
      const last10 = digits.slice(-10);
      const normalizedPhone = last10.length === 10 ? `+91${last10}` : data.phone;

      const ref = doc(db, 'workers', id);
      const updateData: any = {
        name: data.name,
        category: data.category,
        phone: normalizedPhone,
      };
      if (data.inviteCode?.trim()) {
        updateData.inviteCode = data.inviteCode.trim();
      }

      await updateDoc(ref, updateData);

      // Try to sync with users collection if a user document exists for this worker
      if (oldPhone) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'worker'), where('phone', '==', oldPhone));
        const snapshot = await getDocs(q);
        
        const updatePromises = snapshot.docs.map(userDoc => {
          return updateDoc(doc(db, 'users', userDoc.id), {
            name: data.name,
            category: data.category,
            phone: normalizedPhone,
          });
        });
        await Promise.all(updatePromises);
      }

      toast.success('Worker updated successfully.');
    } catch (e) {
      console.error('Firestore updateWorker error:', e);
      toast.error('Failed to update worker.');
    }
  }, []);

  // ── Flat Actions ──

  const addFlat = useCallback(async (data: Omit<Flat, 'id' | 'createdAt'>) => {
    try {
      const ref = doc(collection(db, 'flats'));
      await setDoc(ref, {
        id: ref.id,
        ...data,
        createdAt: new Date().toISOString(),
      });
      toast.success('Flat added successfully.');
    } catch (e) {
      console.error('Firestore addFlat error:', e);
      toast.error('Failed to add flat.');
    }
  }, []);

  const updateFlatPhoneNumbers = useCallback(async (flatId: string, phoneNumbers: string[]) => {
    try {
      const ref = doc(db, 'flats', flatId);
      await updateDoc(ref, { phoneNumbers });
      toast.success('Phone numbers updated.');
    } catch (e) {
      console.error('Firestore updateFlatPhoneNumbers error:', e);
      toast.error('Failed to update phone numbers.');
    }
  }, []);

  const regenerateInviteCode = useCallback(async (flatId: string) => {
    try {
      const ref = doc(db, 'flats', flatId);
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      await updateDoc(ref, { inviteCode: newCode });
      toast.success('New invite code generated.');
    } catch (e) {
      console.error('Firestore regenerateInviteCode error:', e);
      toast.error('Failed to generate invite code.');
    }
  }, []);

  const updateInviteCode = useCallback(async (flatId: string, newCode: string) => {
    try {
      const ref = doc(db, 'flats', flatId);
      await updateDoc(ref, { inviteCode: newCode });
      toast.success('Invite code updated manually.');
    } catch (e) {
      console.error('Firestore updateInviteCode error:', e);
      toast.error('Failed to update invite code manually.');
    }
  }, []);

  // ── Leave Request Actions ──

  const updateLeaveStatus = useCallback(async (id: string, status: LeaveRequestStatus) => {
    try {
      const ref = doc(db, 'leave_requests', id);
      await updateDoc(ref, {
        status,
        adminActionBy: 'Admin',
        updatedAt: new Date().toISOString(),
      });

      if (status === 'approved') {
        const request = leaveRequests.find((lr) => lr.id === id);
        if (request) {
          const workerRef = doc(db, 'workers', request.workerId);
          await updateDoc(workerRef, { onLeave: true });
        }
      }
      toast.success(`Leave request ${status}.`);
    } catch (e) {
      console.error('Firestore updateLeaveStatus error:', e);
      toast.error('Failed to update leave request.');
    }
  }, [leaveRequests]);

  // ── Escalation Actions ──

  const resolveEscalation = useCallback(async (id: string) => {
    try {
      const ref = doc(db, 'escalations', id);
      await updateDoc(ref, {
        resolved: true,
        resolvedBy: 'Admin',
        resolvedAt: new Date().toISOString(),
      });
      toast.success('Escalation resolved.');
    } catch (e) {
      console.error('Firestore resolveEscalation error:', e);
      toast.error('Failed to resolve escalation.');
    }
  }, []);

  // ── Admin Actions ──

  const addAdmin = useCallback(async (data: { name: string; role: string; phone: string }) => {
    try {
      const ref = doc(collection(db, 'admins'));
      await setDoc(ref, {
        id: ref.id,
        name: data.name,
        role: data.role,
        phone: data.phone,
        createdAt: new Date().toISOString(),
      });
      toast.success('Admin added successfully.');
    } catch (e) {
      console.error('Firestore addAdmin error:', e);
      toast.error('Failed to add admin.');
    }
  }, []);

  const removeAdmin = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'admins', id));
      toast.success('Admin removed successfully.');
    } catch (e) {
      console.error('Firestore removeAdmin error:', e);
      toast.error('Failed to remove admin.');
    }
  }, []);

  const addNotice = useCallback(async (data: { title: string; topic: string; content: string; author?: string }): Promise<Notice> => {
    try {
      const now = new Date().toISOString();
      const ref = doc(collection(db, 'notices'));
      const newNotice = {
        id: ref.id,
        title: data.title,
        topic: data.topic,
        content: data.content,
        author: data.author || 'Admin Team',
        createdAt: now,
      };
      await setDoc(ref, newNotice);
      toast.success('Notice posted successfully.');
      return newNotice as Notice;
    } catch (e) {
      console.error('Firestore addNotice error:', e);
      toast.error('Failed to post notice.');
      throw e;
    }
  }, []);

  const updateNotice = useCallback(async (id: string, data: Partial<Notice>) => {
    try {
      await updateDoc(doc(db, 'notices', id), data);
      toast.success('Notice updated successfully.');
    } catch (e) {
      console.error('Firestore updateNotice error:', e);
      toast.error('Failed to update notice.');
    }
  }, []);

  const deleteNotice = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
      toast.success('Notice deleted successfully.');
    } catch (e) {
      console.error('Firestore deleteNotice error:', e);
      toast.error('Failed to delete notice.');
    }
  }, []);

  // ── Ironing Ledger Actions ──

  const recordIroningPayment = useCallback(async (flatId: string, amount: number) => {
    try {
      const docRef = doc(db, 'flat_ledgers', flatId);
      const now = new Date().toISOString();
      const transactionId = `txn_${Date.now()}`;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        let currentBalance = 0.0;
        let currentHistory: any[] = [];

        if (snap.exists()) {
          const data = snap.data()!;
          currentBalance = Number(data.outstandingBalance) || 0.0;
          currentHistory = Array.isArray(data.transactions) ? data.transactions : [];
        }

        const newBalance = Math.max(0, currentBalance - amount);
        const newTransaction = {
          id: transactionId,
          type: 'payment',
          amount,
          description: 'Cash payment recorded by admin',
          timestamp: now,
        };

        transaction.set(
          docRef,
          {
            outstandingBalance: newBalance,
            transactions: [newTransaction, ...currentHistory],
          },
          { merge: true }
        );
      });
      toast.success('Payment recorded successfully.');
    } catch (e) {
      console.error('Firestore recordIroningPayment error:', e);
      toast.error('Failed to record payment.');
    }
  }, []);

  const addIroningCharge = useCallback(async (flatId: string, itemCounts: Record<string, number>) => {
    try {
      const docRef = doc(db, 'flat_ledgers', flatId);
      const now = new Date().toISOString();
      const transactionId = `txn_${Date.now()}`;

      const amount =
        itemCounts.shirts * ironingRates.shirts +
        itemCounts.trousers * ironingRates.trousers +
        itemCounts.sarees * ironingRates.sarees +
        itemCounts.others * ironingRates.others;

      const description = `Ironing delivery: ${[
        itemCounts.shirts ? `${itemCounts.shirts} Shirts` : null,
        itemCounts.trousers ? `${itemCounts.trousers} Trousers` : null,
        itemCounts.sarees ? `${itemCounts.sarees} Sarees` : null,
        itemCounts.others ? `${itemCounts.others} Others` : null,
      ]
        .filter(Boolean)
        .join(', ')}`;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        let currentBalance = 0.0;
        let currentHistory: any[] = [];

        if (snap.exists()) {
          const data = snap.data()!;
          currentBalance = Number(data.outstandingBalance) || 0.0;
          currentHistory = Array.isArray(data.transactions) ? data.transactions : [];
        }

        const newBalance = currentBalance + amount;
        const newTransaction = {
          id: transactionId,
          type: 'charge',
          amount,
          description,
          timestamp: now,
          itemCounts,
        };

        transaction.set(
          docRef,
          {
            outstandingBalance: newBalance,
            transactions: [newTransaction, ...currentHistory],
          },
          { merge: true }
        );
      });
      toast.success('Charge added successfully.');
    } catch (e) {
      console.error('Firestore addIroningCharge error:', e);
      toast.error('Failed to add charge.');
    }
  }, [ironingRates]);

  const updateIroningRates = useCallback((rates: IroningRates) => {
    setIroningRates(rates);
  }, []);

  // ── Weekly Bill Closing Actions ──

  /**
   * Admin initiates a weekly bill close.
   * Creates one weekly_bill_requests doc per flat that has outstanding balance > 0.
   * Sets the ledger's weeklyBillStatus to 'bill_sent'.
   * Workers and residents are notified via Firestore triggers / Cloud Function.
   */
  const closeWeeklyBills = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      // ISO week number
      const startOfYear = new Date(year, 0, 1);
      const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const weekId = `${year}-W${String(weekNum).padStart(2, '0')}`;

      // Build human-readable label for the period (Mon–Sun of current week)
      const dayOfWeek = now.getDay(); // 0=Sun
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const weekLabel = `${fmt(monday)} – ${fmt(sunday)}, ${year}`;

      const flatsWithBalance = ledgers.filter(l => l.outstandingBalance > 0);
      if (flatsWithBalance.length === 0) {
        toast('No flats with outstanding balance to close.', { icon: 'ℹ️' });
        return;
      }

      // Check if a bill for this weekId is already sent
      const existing = weeklyBillRequests.find(r => r.weekId === weekId && r.status === 'pending');
      if (existing) {
        toast.error(`Bills for ${weekLabel} are already sent and pending.`);
        return;
      }

      const batch: Promise<any>[] = [];

      for (const ledger of flatsWithBalance) {
        const requestId = `${weekId}_${ledger.flatId}`;
        const requestRef = doc(db, 'weekly_bill_requests', requestId);

        // Calculate charges vs carry-forward split
        const lastWeekBill = weeklyBillRequests.find(
          r => r.flatId === ledger.flatId && (r.status === 'carried_forward' || r.status === 'admin_resolved')
        );
        const previousCarryForward = lastWeekBill?.billedAmount ?? 0;
        const chargesThisWeek = Math.max(0, ledger.outstandingBalance - previousCarryForward);

        batch.push(setDoc(requestRef, {
          id: requestId,
          weekId,
          weekLabel,
          periodFrom: monday.toISOString(),
          periodTo: sunday.toISOString(),
          flatId: ledger.flatId,
          billedAmount: ledger.outstandingBalance,
          chargesThisWeek,
          previousCarryForward,
          residentConfirmed: null,
          residentConfirmedAt: null,
          workerConfirmed: null,
          workerConfirmedAt: null,
          status: 'pending' as WeeklyBillStatus,
          resolvedBy: null,
          adminNote: null,
          createdAt: now.toISOString(),
          closedAt: null,
        }));

        // Mark ledger as bill_sent
        batch.push(updateDoc(doc(db, 'flat_ledgers', ledger.flatId), {
          weeklyBillStatus: 'bill_sent',
          currentWeekId: weekId,
        }));
      }

      await Promise.all(batch);
      toast.success(`Weekly bills sent to ${flatsWithBalance.length} flat(s) for ${weekLabel}`);
    } catch (e) {
      console.error('closeWeeklyBills error:', e);
      toast.error('Failed to close weekly bills.');
    }
  }, [ledgers, weeklyBillRequests]);

  /**
   * Admin resolves a disputed bill.
   * settleNow=true → records payment, zeroes balance.
   * settleNow=false → carries balance to next week.
   */
  const resolveDisputedBill = useCallback(async (requestId: string, settleNow: boolean, adminNote?: string) => {
    try {
      const request = weeklyBillRequests.find(r => r.id === requestId);
      if (!request) throw new Error('Bill request not found');

      const now = new Date().toISOString();
      const newStatus: WeeklyBillStatus = settleNow ? 'admin_resolved' : 'carried_forward';

      const updates: Promise<any>[] = [
        updateDoc(doc(db, 'weekly_bill_requests', requestId), {
          status: newStatus,
          resolvedBy: 'admin',
          adminNote: adminNote ?? null,
          closedAt: now,
        }),
      ];

      if (settleNow) {
        // Record payment transaction and zero balance
        const ledgerRef = doc(db, 'flat_ledgers', request.flatId);
        updates.push(
          runTransaction(db, async (tx) => {
            const snap = await tx.get(ledgerRef);
            if (!snap.exists()) return;
            const data = snap.data();
            const history: any[] = Array.isArray(data.transactions) ? data.transactions : [];
            const newTx = {
              id: `txn_${Date.now()}`,
              type: 'payment',
              amount: request.billedAmount,
              description: `Admin resolved dispute for ${request.weekLabel} — marked as settled`,
              timestamp: now,
            };
            tx.update(ledgerRef, {
              outstandingBalance: 0,
              transactions: [newTx, ...history],
              weeklyBillStatus: 'settled',
            });
          })
        );
      } else {
        updates.push(
          updateDoc(doc(db, 'flat_ledgers', request.flatId), {
            weeklyBillStatus: 'carried_forward',
          })
        );
      }

      await Promise.all(updates);
      toast.success(`Dispute resolved — ${settleNow ? 'Settled' : 'Carried forward'}`);
    } catch (e) {
      console.error('resolveDisputedBill error:', e);
      toast.error('Failed to resolve dispute.');
    }
  }, [weeklyBillRequests]);

  /**
   * Admin force-overrides any bill (bypass normal flow).
   */
  const adminOverrideBill = useCallback(async (requestId: string, action: 'settle' | 'carry_forward', adminNote?: string) => {
    await resolveDisputedBill(requestId, action === 'settle', adminNote);
  }, [resolveDisputedBill]);

  // ── Hall Booking Actions ──

  const updateHallBookingStatus = useCallback(async (id: string, status: HallBookingStatus, reason?: string) => {
    try {
      const data: any = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (status === 'rejected' && reason) {
        data.rejectionReason = reason;
      }
      await updateDoc(doc(db, 'hall_bookings', id), data);
      toast.success(`Booking ${status}.`);
    } catch (e) {
      console.error('Firestore updateHallBookingStatus error:', e);
      toast.error('Failed to update booking status.');
    }
  }, []);

  const deleteHallBooking = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'hall_bookings', id));
      toast.success('Booking deleted.');
    } catch (e) {
      console.error('Firestore deleteHallBooking error:', e);
      toast.error('Failed to delete booking.');
    }
  }, []);

  // ── Context Value ──

  const value: AppContextType = {
    complaints,
    workers,
    escalations,
    societyIssues,
    leaveRequests,
    admins,
    notices,
    ledgers,
    ironingRates,
    activityLogs,
    notifications,
    flats,
    weeklyBillRequests,
    hallBookings,
    isSidebarOpen,
    setSidebarOpen,
    updateComplaintStatus,
    reassignComplaint,
    escalateComplaint,
    addComplaint,
    addSocietyIssue,
    updateIssueStatus,
    addIssueUpdate,
    toggleWorkerActive,
    addWorker,
    updateWorker,
    addFlat,
    updateFlatPhoneNumbers,
    regenerateInviteCode,
    updateInviteCode,
    updateLeaveStatus,
    resolveEscalation,
    addAdmin,
    removeAdmin,
    addNotice,
    updateNotice,
    deleteNotice,
    recordIroningPayment,
    addIroningCharge,
    updateIroningRates,
    closeWeeklyBills,
    resolveDisputedBill,
    adminOverrideBill,
    updateHallBookingStatus,
    deleteHallBooking,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ──────────────────────────────────────
// Hook
// ──────────────────────────────────────

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
