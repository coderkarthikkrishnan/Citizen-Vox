import { db } from '../firebase/config';
import { collection, doc, addDoc, updateDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';

export const workflowService = {
  /**
   * Assigns an issue cluster to a department and/or officer.
   */
  assignIssue: async (clusterId, departmentId, officerId, assignerId, isIndependent = false) => {
    try {
      const collectionName = isIndependent ? 'issues' : 'issueClusters';
      const docRef = doc(db, collectionName, clusterId);
      
      const assignmentData = {
        assignedDepartment: departmentId,
        assignedOfficer: officerId,
        assignedAt: serverTimestamp(),
        assignedBy: assignerId,
        currentStatus: 'Assigned',
        updatedAt: serverTimestamp()
      };
      
      // 1. Update the cluster/issue document
      await updateDoc(docRef, assignmentData);
      
      // 2. Add to assignments collection for audit trail
      await addDoc(collection(db, 'assignments'), {
        clusterId,
        departmentId,
        officerId,
        assignedBy: assignerId,
        assignedAt: serverTimestamp(),
        status: 'Assigned'
      });

      // 3. Add status history event
      await workflowService.addStatusHistory(clusterId, 'Under Review', 'Assigned', assignerId, `Assigned to ${departmentId}`);

      return assignmentData;
    } catch (error) {
      console.error("Error assigning issue:", error);
      throw error;
    }
  },

  /**
   * Changes the status of an issue and records it in history.
   */
  changeStatus: async (clusterId, oldStatus, newStatus, changerId, note = "", isIndependent = false) => {
    try {
      const collectionName = isIndependent ? 'issues' : 'issueClusters';
      const docRef = doc(db, collectionName, clusterId);
      
      // 1. Update document
      await updateDoc(docRef, {
        status: newStatus,
        currentStatus: newStatus,
        updatedAt: serverTimestamp()
      });

      // 2. Record history
      await workflowService.addStatusHistory(clusterId, oldStatus, newStatus, changerId, note);
      
      return newStatus;
    } catch (error) {
      console.error("Error changing status:", error);
      throw error;
    }
  },

  /**
   * Internal helper to record status changes.
   */
  addStatusHistory: async (clusterId, fromStatus, toStatus, changedBy, note = "") => {
    try {
      await addDoc(collection(db, 'statusHistory'), {
        clusterId,
        fromStatus: fromStatus || 'reported',
        toStatus,
        changedBy,
        changedAt: serverTimestamp(),
        note
      });
    } catch (error) {
      console.error("Error writing status history:", error);
    }
  },

  /**
   * Fetches the timeline (history + assignments) for an issue.
   */
  getTimeline: async (clusterId) => {
    try {
      const historyQ = query(collection(db, 'statusHistory'), where('clusterId', '==', clusterId), orderBy('changedAt', 'desc'));
      const snapshot = await getDocs(historyQ);
      
      const timeline = [];
      snapshot.forEach(doc => {
        timeline.push({ id: doc.id, ...doc.data() });
      });
      return timeline;
    } catch (error) {
      console.error("Error fetching timeline:", error);
      return [];
    }
  },

  /**
   * Adds an internal note.
   */
  addInternalNote: async (clusterId, text, createdBy, department) => {
    try {
      const noteDoc = await addDoc(collection(db, 'internalNotes'), {
        clusterId,
        text,
        createdBy,
        department,
        createdAt: serverTimestamp()
      });
      return { id: noteDoc.id, clusterId, text, createdBy, department, createdAt: new Date() };
    } catch (error) {
      console.error("Error adding internal note:", error);
      throw error;
    }
  },

  /**
   * Fetches internal notes for a given issue.
   */
  getInternalNotes: async (issueId) => {
    try {
      const notesQ = query(
        collection(db, 'internalNotes'), 
        where('issueId', '==', issueId), 
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(notesQ);
      
      const notes = [];
      snapshot.forEach(doc => {
        notes.push({ id: doc.id, ...doc.data() });
      });
      return notes;
    } catch (error) {
      // Silently handle permission errors (notes visible only to admin after rules deploy)
      if (error?.code === 'permission-denied') {
        console.warn("InternalNotes: permission denied - rules may need deploying.");
        return [];
      }
      console.error("Error fetching internal notes:", error);
      return [];
    }
  },

  /**
   * Adds an internal note for a given issue.
   */
  addInternalNote: async (issueId, text, authorId, department) => {
    try {
      await addDoc(collection(db, 'internalNotes'), {
        issueId,
        // keep clusterId for backward compat
        clusterId: issueId,
        text,
        authorId,
        department,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding internal note:", error);
      throw error;
    }
  }
};
