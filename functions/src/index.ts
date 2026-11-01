import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

/**
 * Triggered when a new complaint is filed in Firestore.
 * Creates an activity log entry and notifies the assigned worker.
 */
export const onComplaintCreated = onDocumentCreated("complaints/{complaintId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const complaint = snapshot.data();
  const complaintId = event.params.complaintId;
  const now = new Date().toISOString();

  // Create initial activity log
  const logRef = db.collection("activity_logs").doc();
  const logData = {
    id: logRef.id,
    complaintId,
    action: "status_change",
    performedBy: `Resident ${complaint.flatId || "Unknown"}`,
    role: "resident",
    previousValue: "",
    newValue: complaint.status || "submitted",
    note: "Complaint submitted",
    createdAt: now,
  };
  await logRef.set(logData);

  // Trigger notification for the worker
  if (complaint.assignedWorker) {
    const notifRef = db.collection("notifications").doc();
    const notifData = {
      id: notifRef.id,
      targetUserId: `worker_${complaint.assignedWorker}`,
      type: "complaint_submitted",
      title: `New Job Available - ${complaintId}`,
      message: `A new complaint has been filed in your category: ${complaint.description || ""}`,
      read: false,
      complaintId,
      createdAt: now,
    };
    await notifRef.set(notifData);
  }
});

/**
 * Triggered when an existing complaint is updated in Firestore.
 * Handles:
 * 1. Auto-escalation when reopenCount >= 3 and status transitions to "reopened".
 * 2. Activity logging and resident notifications on status changes.
 * 3. Activity logging and worker notifications on assignment updates.
 */
export const onComplaintUpdated = onDocumentUpdated("complaints/{complaintId}", async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.data();
  const after = change.after.data();
  const complaintId = event.params.complaintId;
  const now = new Date().toISOString();

  const promises: Promise<any>[] = [];

  // Prevent infinite trigger loop if there are no relevant updates
  const statusChanged = before.status !== after.status;
  const workerChanged = before.assignedWorker !== after.assignedWorker;
  const reopenCountChanged = before.reopenCount !== after.reopenCount;
  const slaStatusChanged = before.slaStatus !== after.slaStatus;
  const etaChanged = before.eta !== after.eta;
  const toolsChanged = before.toolsProcured !== after.toolsProcured;
  const notesLengthBefore = before.workerNotes?.length || 0;
  const notesLengthAfter = after.workerNotes?.length || 0;
  const newNoteAdded = notesLengthBefore < notesLengthAfter;

  if (
    !statusChanged &&
    !workerChanged &&
    !reopenCountChanged &&
    !slaStatusChanged &&
    !etaChanged &&
    !toolsChanged &&
    !newNoteAdded
  ) {
    return;
  }

  // 1. Reopen Threshold Auto-escalation
  if (
    after.status === "reopened" &&
    after.reopenCount >= 3 &&
    before.status !== "escalated" &&
    after.status !== before.status
  ) {
    // Auto-escalate the complaint in Firestore
    const complaintRef = db.collection("complaints").doc(complaintId);
    promises.push(
      complaintRef.update({
        status: "escalated",
        slaStatus: "breached",
        updatedAt: now,
        timeline: FieldValue.arrayUnion({
          action: "Auto-escalated due to reopen threshold (>= 3 times)",
          performedBy: "System",
          role: "admin",
          timestamp: now,
        }),
      })
    );

    // Create Escalation entry
    const escRef = db.collection("escalations").doc();
    promises.push(
      escRef.set({
        id: escRef.id,
        complaintId,
        flatId: after.flatId,
        type: "reopen_threshold",
        severity: "high",
        reason: `Complaint reopened ${after.reopenCount} times.`,
        resolved: false,
        resolvedBy: "",
        createdAt: now,
        resolvedAt: "",
      })
    );

    // Notify Admin
    const notifAdminRef = db.collection("notifications").doc();
    promises.push(
      notifAdminRef.set({
        id: notifAdminRef.id,
        targetUserId: "admin_committee_1",
        type: "escalation",
        title: `Auto-Escalation: Reopen Threshold - ${complaintId}`,
        message: `Complaint for Flat ${after.flatId} has been auto-escalated after being reopened ${after.reopenCount} times.`,
        read: false,
        complaintId,
        createdAt: now,
      })
    );

    // Notify Worker
    if (after.assignedWorker) {
      const notifWorkerRef = db.collection("notifications").doc();
      promises.push(
        notifWorkerRef.set({
          id: notifWorkerRef.id,
          targetUserId: `worker_${after.assignedWorker}`,
          type: "escalation",
          title: `Job Escalated - ${complaintId}`,
          message: `Your assigned job for Flat ${after.flatId} has been auto-escalated because it was reopened ${after.reopenCount} times.`,
          read: false,
          complaintId,
          createdAt: now,
        })
      );
    }

    // Activity Log
    const logRef = db.collection("activity_logs").doc();
    promises.push(
      logRef.set({
        id: logRef.id,
        complaintId,
        action: "admin_escalation",
        performedBy: "System",
        role: "admin",
        previousValue: before.status,
        newValue: "escalated",
        note: `Auto-escalated due to reopen threshold (reopened ${after.reopenCount} times)`,
        createdAt: now,
      })
    );

    await Promise.all(promises);
    return;
  }

  // 2. Compile updates and Notify Resident
  const updates: string[] = [];
  if (statusChanged) {
    updates.push(`Status changed to ${after.status.replace(/_/g, " ")}`);
  }
  if (workerChanged) {
    updates.push(after.assignedWorker ? `Worker assigned: ${after.assignedWorker}` : "Worker unassigned");
  }
  if (etaChanged && after.eta) {
    updates.push(`Estimated resolution time (ETA) set to ${after.eta}`);
  }
  if (newNoteAdded && after.workerNotes.length > 0) {
    const lastNote = after.workerNotes[after.workerNotes.length - 1];
    updates.push(`New note from worker: "${lastNote.note}"`);
  }
  if (toolsChanged) {
    updates.push(after.toolsProcured ? "Required tools have been procured" : "Required tools are not procured");
  }
  if (slaStatusChanged) {
    updates.push(`SLA status updated to ${after.slaStatus}`);
  }

  if (updates.length > 0) {
    const logRef = db.collection("activity_logs").doc();
    promises.push(
      logRef.set({
        id: logRef.id,
        complaintId,
        action: statusChanged ? (after.status === "reopened" ? "reopen" : "status_change") : "update",
        performedBy: "System",
        role: "admin",
        previousValue: before.status,
        newValue: after.status,
        note: updates.join(". "),
        createdAt: now,
      })
    );

    // Notify Resident
    const notifRef = db.collection("notifications").doc();
    promises.push(
      notifRef.set({
        id: notifRef.id,
        targetUserId: `resident_${after.flatId}`,
        type: "complaint_update",
        title: `Complaint Update - ${complaintId}`,
        message: updates.join(". "),
        read: false,
        complaintId,
        createdAt: now,
      })
    );
  }

  // 3. Assignment Change Handler (Notify worker when newly assigned)
  if (workerChanged && after.assignedWorker) {
    const notifRef = db.collection("notifications").doc();
    promises.push(
      notifRef.set({
        id: notifRef.id,
        targetUserId: `worker_${after.assignedWorker}`,
        type: "admin_action",
        title: `New Job Assigned - ${complaintId}`,
        message: `You have been assigned a new complaint: ${after.description || ""}`,
        read: false,
        complaintId,
        createdAt: now,
      })
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
});

/**
 * Scheduled cron job running every 5 minutes.
 * Checks active, uncompleted complaints for resolution SLA breaches
 * and emergency acknowledgment timeouts (15 minutes).
 */
export const checkSlaBreaches = onSchedule("every 5 minutes", async (event) => {
  const now = new Date();
  const nowStr = now.toISOString();

  // Query all active complaints that are NOT closed and NOT escalated
  const complaintsSnapshot = await db
    .collection("complaints")
    .where("status", "not-in", ["closed", "escalated"])
    .get();

  const batch = db.batch();
  let writeCount = 0;

  for (const doc of complaintsSnapshot.docs) {
    const c = doc.data();
    const complaintId = doc.id;
    let modified = false;

    // 1. SLA Breach Check
    if (c.slaDeadline && new Date(c.slaDeadline) < now && c.slaStatus !== "breached") {
      modified = true;

      // Update complaint
      batch.update(doc.ref, {
        slaStatus: "breached",
        status: "escalated",
        updatedAt: nowStr,
        timeline: FieldValue.arrayUnion({
          action: "Auto-escalated due to SLA breach",
          performedBy: "System",
          role: "admin",
          timestamp: nowStr,
        }),
      });

      // Create Escalation entry
      const escRef = db.collection("escalations").doc();
      batch.set(escRef, {
        id: escRef.id,
        complaintId,
        flatId: c.flatId,
        type: "sla_breach",
        severity: c.urgency === "emergency" ? "critical" : c.urgency === "high" ? "high" : "medium",
        reason: `Resolution deadline breached. Expected by ${new Date(c.slaDeadline).toLocaleString()}`,
        worker: c.assignedWorker || "",
        resolved: false,
        resolvedBy: "",
        createdAt: nowStr,
        resolvedAt: "",
      });

      // Create Notifications
      const notifResRef = db.collection("notifications").doc();
      batch.set(notifResRef, {
        id: notifResRef.id,
        targetUserId: `resident_${c.flatId}`,
        type: "sla_breach",
        title: `SLA Breached - ${complaintId}`,
        message: `Your complaint is delayed beyond the expected resolution timeline. Admin has been alerted.`,
        read: false,
        complaintId,
        createdAt: nowStr,
      });

      const notifAdminRef = db.collection("notifications").doc();
      batch.set(notifAdminRef, {
        id: notifAdminRef.id,
        targetUserId: "admin_committee_1",
        type: "sla_breach",
        title: `SLA Breach Alert - ${complaintId}`,
        message: `Complaint for Flat ${c.flatId} has breached its resolution SLA timeline.`,
        read: false,
        complaintId,
        createdAt: nowStr,
      });

      // Create Activity Log
      const logRef = db.collection("activity_logs").doc();
      batch.set(logRef, {
        id: logRef.id,
        complaintId,
        action: "sla_breach",
        performedBy: "System",
        role: "admin",
        previousValue: c.slaStatus || "within_sla",
        newValue: "breached",
        note: `Auto-escalated due to SLA breach`,
        createdAt: nowStr,
      });

      writeCount++;
    }

    // 2. Emergency Timeout Check (15 mins)
    if (!modified && c.urgency === "emergency" && (c.status === "submitted" || c.status === "queued")) {
      const createdAt = new Date(c.createdAt);
      const ageMinutes = (now.getTime() - createdAt.getTime()) / (60 * 1000);

      if (ageMinutes >= 15) {
        // Update complaint
        batch.update(doc.ref, {
          slaStatus: "breached",
          status: "escalated",
          updatedAt: nowStr,
          timeline: FieldValue.arrayUnion({
            action: "Auto-escalated due to acknowledgment timeout",
            performedBy: "System",
            role: "admin",
            timestamp: nowStr,
          }),
        });

        // Create Escalation entry
        const escRef = db.collection("escalations").doc();
        batch.set(escRef, {
          id: escRef.id,
          complaintId,
          flatId: c.flatId,
          type: "emergency",
          severity: "critical",
          reason: "Emergency complaint not acknowledged by worker within 15 minutes.",
          worker: c.assignedWorker || "",
          resolved: false,
          resolvedBy: "",
          createdAt: nowStr,
          resolvedAt: "",
        });

        // Create notification to admin
        const notifAdminRef = db.collection("notifications").doc();
        batch.set(notifAdminRef, {
          id: notifAdminRef.id,
          targetUserId: "admin_committee_1",
          type: "emergency_alert",
          title: `CRITICAL: Emergency Timeout - ${complaintId}`,
          message: `Emergency complaint for Flat ${c.flatId} has not been acknowledged within 15 minutes!`,
          read: false,
          complaintId,
          createdAt: nowStr,
        });

        // Create Activity Log
        const logRef = db.collection("activity_logs").doc();
        batch.set(logRef, {
          id: logRef.id,
          complaintId,
          action: "sla_breach",
          performedBy: "System",
          role: "admin",
          previousValue: c.status || "",
          newValue: "escalated",
          note: "Emergency acknowledgment timeout (15 mins)",
          createdAt: nowStr,
        });

        writeCount++;
      }
    }
  }

  if (writeCount > 0) {
    await batch.commit();
  }
});

/**
 * Scheduled monthly cron job.
 * Deletes complaints older than 180 days (6 months) for data retention policies.
 */
export const cleanupOldComplaints = onSchedule("0 0 1 * *", async (event) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
  const cutoffDateStr = sixMonthsAgo.toISOString();

  // Query complaints older than 6 months
  const querySnapshot = await db
    .collection("complaints")
    .where("createdAt", "<", cutoffDateStr)
    .get();

  const batch = db.batch();
  let deleteCount = 0;

  for (const doc of querySnapshot.docs) {
    batch.delete(doc.ref);
    deleteCount++;

    // Prevent batch sizing limits (500 write limit)
    if (deleteCount >= 450) {
      await batch.commit();
      return;
    }
  }

  if (deleteCount > 0) {
    await batch.commit();
  }
});

/**
 * Triggered when a new Notification is created in Firestore.
 * Finds the FCM token for the target user and dispatches a push notification.
 */
export const onNotificationCreated = onDocumentCreated("notifications/{notifId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notif = snapshot.data();

  const targetUserId = notif.targetUserId; // e.g., "resident_1302" or "worker_elec1"
  if (!targetUserId) return;

  // We need to find the FCM token.
  // We'll query the "users" collection based on the target string format.
  let userQuery: FirebaseFirestore.Query = db.collection("users");

  if (targetUserId.startsWith("resident_")) {
    const flatId = targetUserId.replace("resident_", "");
    userQuery = userQuery.where("role", "==", "resident").where("flatId", "==", flatId);
  } else if (targetUserId.startsWith("worker_")) {
    const workerPhone = targetUserId.replace("worker_", "");
    userQuery = userQuery.where("role", "==", "worker").where("phone", "==", workerPhone);
  }

  // If the targetUserId is just a raw UID (which might be the case for new features), try fetching it directly first.
  let tokens: string[] = [];
  try {
    const directUserDoc = await db.collection("users").doc(targetUserId).get();
    if (directUserDoc.exists && directUserDoc.data()?.fcmToken) {
      tokens.push(directUserDoc.data()!.fcmToken);
    }
  } catch (e) {
    // Ignore and fallback to query
  }

  if (tokens.length === 0 && (targetUserId.startsWith("resident_") || targetUserId.startsWith("worker_"))) {
    const usersSnapshot = await userQuery.get();
    usersSnapshot.forEach((doc) => {
      const token = doc.data().fcmToken;
      if (token) tokens.push(token);
    });
  }

  if (tokens.length === 0) {
    console.log(`No FCM token found for target ${targetUserId}`);
    return;
  }

  // Send the push notification
  const message = {
    notification: {
      title: notif.title || "New Notification",
      body: notif.message || "",
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "high_importance_channel"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true
        }
      }
    },
    tokens: tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent message to ${response.successCount} devices`);
  } catch (error) {
    console.error("Error sending FCM message:", error);
  }
});

/**
 * Triggered when a new Visitor is logged by the Guard.
 * Creates a notification for the resident.
 */
export const onVisitorCreated = onDocumentCreated("visitors/{visitorId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const visitor = snapshot.data();
  const visitorId = event.params.visitorId;
  const now = new Date().toISOString();

  if (visitor.status === "pending") {
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id,
      targetUserId: `resident_${visitor.flatId}`,
      type: "visitor_approval",
      title: `Visitor at Gate - ${visitor.name}`,
      message: `${visitor.name} from ${visitor.company} is at the gate for ${visitor.purpose}. Please approve or deny.`,
      read: false,
      visitorId,
      createdAt: now,
    });
  }
});

/**
 * Triggered when a new Notice is created.
 * Sends a push notification to all users.
 */
export const onNoticeCreated = onDocumentCreated("notices/{noticeId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notice = snapshot.data();

  const usersSnapshot = await db.collection("users").get();
  const tokens: string[] = [];
  usersSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `New Notice: ${notice.topic || 'General'}`,
      body: notice.title || "A new official notice has been posted.",
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "high_importance_channel"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true
        }
      }
    },
    data: {
      route: `/notice-details/${event.params.noticeId}`,
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    },
    tokens: tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent notice alert to ${response.successCount} devices`);
  } catch (error) {
    console.error("Error sending notice FCM message:", error);
  }
});

/**
 * Triggered when a Notice is updated.
 * Sends a push notification to all users.
 */
export const onNoticeUpdated = onDocumentUpdated("notices/{noticeId}", async (event) => {
  const change = event.data;
  if (!change) return;
  const after = change.after.data();
  const before = change.before.data();

  // Ensure it's an actual content change to avoid spam
  if (before.title === after.title && before.content === after.content && before.topic === after.topic) {
    return;
  }

  const usersSnapshot = await db.collection("users").get();
  const tokens: string[] = [];
  usersSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `Notice Updated: ${after.topic || 'General'}`,
      body: after.title || "An official notice has been updated.",
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "high_importance_channel"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true
        }
      }
    },
    data: {
      route: `/notice-details/${event.params.noticeId}`,
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    },
    tokens: tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent updated notice alert to ${response.successCount} devices`);
  } catch (error) {
    console.error("Error sending updated notice FCM message:", error);
  }
});

// ──────────────────────────────────────
// Hall Bookings Notifications
// ──────────────────────────────────────

export const onHallBookingCreated = onDocumentCreated("hall_bookings/{bookingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const eventName = data.eventName || 'an event';

  // Notify admins
  const adminsSnapshot = await getFirestore().collection("users").where("role", "==", "admin").get();
  const tokens: string[] = [];

  adminsSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: "New Hall Booking Request",
      body: `Flat ${data.flatId} has requested the hall for ${eventName} on ${data.date}.`,
    },
    tokens: tokens,
  };

  try {
    await getMessaging().sendEachForMulticast(message);
  } catch (error) {
    console.error("Error sending hall booking created FCM:", error);
  }
});

export const onHallBookingUpdated = onDocumentUpdated("hall_bookings/{bookingId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;
  if (before.status === after.status) return;

  const now = new Date().toISOString();

  // Create an in-app notification document for the resident
  const notifRef = getFirestore().collection("notifications").doc();
  await notifRef.set({
    id: notifRef.id,
    targetUserId: `resident_${after.flatId}`,
    type: "hall_booking",
    title: `Hall Booking ${after.status.toUpperCase()}`,
    message: `Your booking for ${after.eventName} on ${after.date} has been ${after.status}.`,
    read: false,
    bookingId: event.params.bookingId,
    createdAt: now,
  });

  // Also send push notification
  const usersSnapshot = await getFirestore()
    .collection("users")
    .where("flatId", "==", after.flatId)
    .where("role", "==", "resident")
    .get();

  const tokens: string[] = [];
  usersSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `Hall Booking ${after.status.toUpperCase()}`,
      body: `Your booking for ${after.eventName} on ${after.date} has been ${after.status}.`,
    },
    tokens: tokens,
  };

  try {
    await getMessaging().sendEachForMulticast(message);
  } catch (error) {
    console.error("Error sending hall booking updated FCM:", error);
  }
});

// ──────────────────────────────────────
// Society Issues Notifications
// ──────────────────────────────────────

export const onSocietyIssueCreated = onDocumentCreated("society_issues/{issueId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const issue = snapshot.data();

  const usersSnapshot = await getFirestore().collection("users").get();
  const tokens: string[] = [];
  usersSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `New Society Issue: ${issue.title || "Reported"}`,
      body: issue.description || "A new society issue has been reported.",
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "high_importance_channel"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true
        }
      }
    },
    tokens: tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent society issue alert to ${response.successCount} devices`);
  } catch (error) {
    console.error("Error sending society issue FCM message:", error);
  }
});

export const onSocietyIssueUpdated = onDocumentUpdated("society_issues/{issueId}", async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.data();
  const after = change.after.data();

  const statusChanged = before.status !== after.status;
  const newUpdateAdded = (before.updates?.length || 0) < (after.updates?.length || 0);

  if (!statusChanged && !newUpdateAdded) {
    return;
  }

  let body = `Society issue "${after.title}" was updated.`;
  if (statusChanged) {
    body = `Status of "${after.title}" changed from ${before.status} to ${after.status}.`;
  } else if (newUpdateAdded && after.updates.length > 0) {
    const lastUpdate = after.updates[after.updates.length - 1];
    body = `New update on "${after.title}": ${lastUpdate.message}`;
  }

  const usersSnapshot = await getFirestore().collection("users").get();
  const tokens: string[] = [];
  usersSnapshot.forEach((doc) => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `Society Issue Updated: ${after.title}`,
      body: body,
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "high_importance_channel"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          contentAvailable: true
        }
      }
    },
    tokens: tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`Successfully sent society issue update alert to ${response.successCount} devices`);
  } catch (error) {
    console.error("Error sending society issue update FCM message:", error);
  }
});

// ──────────────────────────────────────
// Weekly Bill Closing Functions
// ──────────────────────────────────────

/**
 * Scheduled every Monday at 8am IST (02:30 UTC).
 * Sends a push notification reminder to all flats with outstanding balance > 0.
 * Updates lastReminderSentAt on each ledger doc.
 */
export const weeklyBillReminder = onSchedule("30 2 * * 1", async (_event) => {
  const now = new Date().toISOString();

  const ledgersSnapshot = await db
    .collection("flat_ledgers")
    .where("outstandingBalance", ">", 0)
    .get();

  if (ledgersSnapshot.empty) {
    console.log("No flats with outstanding balance — skipping reminder.");
    return;
  }

  const batch = db.batch();

  for (const ledgerDoc of ledgersSnapshot.docs) {
    const flatId = ledgerDoc.id;

    // Find resident FCM tokens for this flat
    const usersSnap = await db
      .collection("users")
      .where("flatId", "==", flatId)
      .where("role", "==", "resident")
      .get();

    const tokens: string[] = [];
    usersSnap.forEach((u) => {
      if (u.data().fcmToken) tokens.push(u.data().fcmToken);
    });

    if (tokens.length > 0) {
      const balance = ledgerDoc.data().outstandingBalance ?? 0;
      const msg = {
        notification: {
          title: "⚠️ Ironing Bill Reminder",
          body: `You have an outstanding ironing balance of ₹${balance}. The ironing worker will collect this week.`,
        },
        android: {
          priority: "high" as const,
          notification: { sound: "default", channelId: "high_importance_channel" },
        },
        apns: { payload: { aps: { sound: "default", contentAvailable: true } } },
        tokens,
      };
      try {
        await getMessaging().sendEachForMulticast(msg);
      } catch (err) {
        console.error(`FCM reminder error for flat ${flatId}:`, err);
      }
    }

    batch.update(ledgerDoc.ref, { lastReminderSentAt: now });
  }

  await batch.commit();
  console.log(`Weekly bill reminders sent to ${ledgersSnapshot.size} flats.`);
});

/**
 * Triggered when a weekly_bill_requests document is updated.
 * Drives the confirmation state machine:
 *
 * 1. Resident sets residentConfirmed=true → status=resident_paid, notify worker
 * 2. Resident sets residentConfirmed=false → status=carried_forward
 * 3. Worker sets workerConfirmed=true → status=settled, zero ledger balance
 * 4. Worker sets workerConfirmed=false → status=disputed, notify admin
 */
export const onWeeklyBillRequestUpdated = onDocumentUpdated(
  "weekly_bill_requests/{requestId}",
  async (event) => {
    const change = event.data;
    if (!change) return;

    const before = change.before.data();
    const after = change.after.data();
    const requestId = event.params.requestId;
    const now = new Date().toISOString();

    const requestRef = db.collection("weekly_bill_requests").doc(requestId);

    // ── Case 1: Resident just confirmed payment ──
    if (before.residentConfirmed !== true && after.residentConfirmed === true) {
      await requestRef.update({
        status: "resident_paid",
        residentConfirmedAt: now,
      });

      // Notify ironing workers to confirm receipt
      const workerSnap = await db
        .collection("users")
        .where("role", "==", "worker")
        .where("category", "in", ["ironing", "housekeeping"])
        .get();

      const tokens: string[] = [];
      workerSnap.forEach((d) => {
        if (d.data().fcmToken) tokens.push(d.data().fcmToken);
      });

      if (tokens.length > 0) {
        const msg = {
          notification: {
            title: `💰 Payment Claim — Flat ${after.flatId}`,
            body: `Flat ${after.flatId} says they've paid ₹${after.billedAmount}. Please confirm if you received it.`,
          },
          android: {
            priority: "high" as const,
            notification: { sound: "default", channelId: "high_importance_channel" },
          },
          apns: { payload: { aps: { sound: "default", contentAvailable: true } } },
          tokens,
        };
        try {
          await getMessaging().sendEachForMulticast(msg);
        } catch (err) {
          console.error("FCM worker notify error:", err);
        }
      }

      // In-app notification for the worker
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id,
        targetUserId: "admin_committee_1", // also alert admin
        type: "payment_claim",
        title: `Payment Claim — Flat ${after.flatId}`,
        message: `Flat ${after.flatId} has claimed payment of ₹${after.billedAmount} for ${after.weekLabel}. Awaiting worker confirmation.`,
        read: false,
        createdAt: now,
      });
    }

    // ── Case 2: Resident chose "Pay Next Week" ──
    if (before.residentConfirmed !== false && after.residentConfirmed === false) {
      await requestRef.update({
        status: "carried_forward",
        residentConfirmedAt: now,
        resolvedBy: "resident",
        closedAt: now,
      });

      // Mark ledger as carried_forward
      await db.collection("flat_ledgers").doc(after.flatId).update({
        weeklyBillStatus: "carried_forward",
      });
    }

    // ── Case 3: Worker confirmed receipt → settle ──
    if (
      after.status === "resident_paid" &&
      before.workerConfirmed !== true &&
      after.workerConfirmed === true
    ) {
      await requestRef.update({
        status: "settled",
        workerConfirmedAt: now,
        resolvedBy: "worker",
        closedAt: now,
      });

      // Zero out ledger balance
      const ledgerRef = db.collection("flat_ledgers").doc(after.flatId);
      await db.runTransaction(async (tx) => {
        const ledgerSnap = await tx.get(ledgerRef);
        if (!ledgerSnap.exists) return;
        const data = ledgerSnap.data()!;
        const history: any[] = Array.isArray(data.transactions) ? data.transactions : [];
        const newTx = {
          id: `txn_${Date.now()}`,
          type: "payment",
          amount: after.billedAmount,
          description: `Weekly bill settled — ${after.weekLabel} (Worker confirmed receipt)`,
          timestamp: now,
        };
        tx.update(ledgerRef, {
          outstandingBalance: 0,
          transactions: [newTx, ...history],
          weeklyBillStatus: "settled",
        });
      });

      // Notify resident that payment is confirmed
      const residentNotifRef = db.collection("notifications").doc();
      await residentNotifRef.set({
        id: residentNotifRef.id,
        targetUserId: `resident_${after.flatId}`,
        type: "bill_resolved",
        title: "✅ Bill Settled!",
        message: `Your ironing bill of ₹${after.billedAmount} for ${after.weekLabel} has been confirmed by the worker. Your balance is now ₹0.`,
        read: false,
        createdAt: now,
      });
    }

    // ── Case 4: Worker denied receipt → disputed ──
    if (
      after.status === "resident_paid" &&
      before.workerConfirmed !== false &&
      after.workerConfirmed === false
    ) {
      await requestRef.update({
        status: "disputed",
        workerConfirmedAt: now,
      });

      // Notify admin of dispute
      const adminNotifRef = db.collection("notifications").doc();
      await adminNotifRef.set({
        id: adminNotifRef.id,
        targetUserId: "admin_committee_1",
        type: "bill_resolved",
        title: `⚠️ Bill Dispute — Flat ${after.flatId}`,
        message: `Flat ${after.flatId} claims to have paid ₹${after.billedAmount} for ${after.weekLabel}, but the ironing worker has not confirmed receipt. Please resolve.`,
        read: false,
        createdAt: now,
      });
    }
  }
);

export * from "./propLock";
