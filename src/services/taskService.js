import { db } from '../firebase/config';
import { collection, doc, updateDoc, serverTimestamp, getDocs, query, where, orderBy, runTransaction, getDoc } from 'firebase/firestore';

export const taskService = {
  /**
   * Fetches tasks assigned to a specific worker from the new tasks collection
   */
  getWorkerTasks: async (workerId) => {
    try {
      const q = query(
        collection(db, 'tasks'), 
        where('workerId', '==', workerId),
        orderBy('assignedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });

      return tasks;
    } catch (error) {
      console.error("Error fetching worker tasks:", error);
      return [];
    }
  },

  /**
   * Admin: Assigns an issue to a worker using a batched write
   */
  assignTask: async (issueId, workerId, workerName, departmentId, municipalityId, assignedByUid, deadline = null) => {
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);

    try {
      // 1. Create the new Task document
      const tasksRef = collection(db, 'tasks');
      const newTaskRef = doc(tasksRef);
      
      batch.set(newTaskRef, {
        issueId,
        workerId,
        departmentId,
        municipalityId: municipalityId || null,
        assignedBy: assignedByUid,
        assignedAt: serverTimestamp(),
        deadline: deadline ? new Date(deadline) : null,
        status: 'assigned'
      });

      // 2. Update the Issue document
      const issueRef = doc(db, 'issues', issueId);
      batch.update(issueRef, {
        assignedWorkerId: workerId,
        assignedWorkerName: workerName,
        assignedDepartment: departmentId,
        status: 'assigned',
        currentStatus: 'Assigned',
        updatedAt: serverTimestamp()
      });

      // 3. (Optional) Audit Log is handled by auditService outside the batch since it's a separate concern, 
      // but if we want it atomic, we can add it here.
      const auditRef = doc(collection(db, 'audit_logs'));
      batch.set(auditRef, {
        actorId: assignedByUid,
        actorRole: 'admin',
        action: 'ASSIGN_TASK',
        resourceType: 'issue',
        resourceId: issueId,
        timestamp: serverTimestamp(),
        metadata: { workerId, taskId: newTaskRef.id }
      });

      await batch.commit();
      return { success: true, taskId: newTaskRef.id };
    } catch (error) {
      console.error("Task assignment failed:", error);
      throw error;
    }
  },

  /**
   * Fetches a single task detail
   */
  getTaskDetails: async (issueId) => {
    try {
      const docRef = doc(db, 'issues', issueId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching task details:", error);
      return null;
    }
  },

  /**
   * Accepts a task using an atomic transaction to prevent race conditions.
   */
  acceptTask: async (issueId, workerId) => {
    const docRef = doc(db, 'issues', issueId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const taskDoc = await transaction.get(docRef);
        if (!taskDoc.exists()) {
          throw new Error("Task does not exist!");
        }

        const data = taskDoc.data();
        if (data.status !== 'assigned') {
          throw new Error("Task has already been accepted or is no longer available.");
        }

        transaction.update(docRef, {
          status: 'accepted',
          acceptedBy: workerId,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Add status history outside transaction for simplicity
      await taskService.addStatusHistory(issueId, 'assigned', 'accepted', workerId, "Task accepted by worker");
      
      return true;
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw error;
    }
  },

  /**
   * Starts a task
   */
  startTask: async (issueId, workerId) => {
    try {
      const docRef = doc(db, 'issues', issueId);
      
      await updateDoc(docRef, {
        status: 'in_progress',
        startedBy: workerId,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await taskService.addStatusHistory(issueId, 'accepted', 'in_progress', workerId, "Work started");
      return true;
    } catch (error) {
      console.error("Error starting task:", error);
      throw error;
    }
  },

  /**
   * Completes a task
   */
  completeTask: async (issueId, workerId, workDescription, beforeEvidence, afterEvidence) => {
    try {
      const docRef = doc(db, 'issues', issueId);
      
      await updateDoc(docRef, {
        status: 'verification_pending',
        completedBy: workerId,
        completedAt: serverTimestamp(),
        workDescription,
        beforeEvidence: beforeEvidence || null,
        afterEvidence: afterEvidence || null,
        updatedAt: serverTimestamp()
      });

      await taskService.addStatusHistory(issueId, 'in_progress', 'verification_pending', workerId, workDescription);
      return true;
    } catch (error) {
      console.error("Error completing task:", error);
      throw error;
    }
  },

  /**
   * Helper to record status changes.
   */
  addStatusHistory: async (clusterId, fromStatus, toStatus, changedBy, note = "") => {
    const { addDoc } = await import('firebase/firestore');
    try {
      await addDoc(collection(db, 'statusHistory'), {
        clusterId,
        fromStatus,
        toStatus,
        changedBy,
        changedAt: serverTimestamp(),
        note
      });
    } catch (error) {
      console.error("Error writing status history:", error);
    }
  }
};
