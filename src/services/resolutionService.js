import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where, getDoc } from 'firebase/firestore';
import { resolutionConfidenceService } from './resolutionConfidenceService';

export const resolutionService = {
  /**
   * Fetches all verifications for a specific cluster in the current cycle
   */
  getVerificationsForIssue: async (clusterId, cycle = 1) => {
    try {
      const q = query(
        collection(db, 'resolutionVerifications'), 
        where('clusterId', '==', clusterId),
        where('verificationCycle', '==', cycle)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error fetching verifications:", error);
      return [];
    }
  },

  /**
   * Recalculates and updates the resolution confidence for a cluster
   */
  updateResolutionConfidence: async (clusterId, cycle) => {
    try {
      const verifications = await resolutionService.getVerificationsForIssue(clusterId, cycle);
      const confidenceData = resolutionConfidenceService.calculateConfidence(verifications);
      
      const docRef = doc(db, 'issues', clusterId);
      await updateDoc(docRef, {
        resolutionConfidence: confidenceData,
        updatedAt: serverTimestamp()
      });
      
      return confidenceData;
    } catch (error) {
      console.error("Error updating resolution confidence:", error);
    }
  },

  /**
   * Submits a positive verification ("Yes, it's resolved")
   */
  submitVerification: async (clusterId, userId, completedBy, currentCycle = 1) => {
    if (userId === completedBy) {
      throw new Error("Self-verification is not allowed. Workers cannot verify their own work.");
    }

    try {
      // Check for duplicate in same cycle
      const existing = await resolutionService.getVerificationsForIssue(clusterId, currentCycle);
      if (existing.some(v => v.verifiedBy === userId)) {
        throw new Error("You have already submitted a verification for this work cycle.");
      }

      await addDoc(collection(db, 'resolutionVerifications'), {
        clusterId,
        verifiedBy: userId,
        decision: 'verified',
        verificationCycle: currentCycle,
        createdAt: serverTimestamp()
      });

      // Update issue status to Verified Resolved
      const docRef = doc(db, 'issues', clusterId);
      await updateDoc(docRef, {
        status: 'Verified Resolved',
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update Timeline
      const { taskService } = await import('./taskService');
      await taskService.addStatusHistory(clusterId, 'Awaiting Verification', 'Verified Resolved', userId, "Resolution verified by community.");

      // Recalculate confidence
      await resolutionService.updateResolutionConfidence(clusterId, currentCycle);

      return true;
    } catch (error) {
      console.error("Error submitting verification:", error);
      throw error;
    }
  },

  /**
   * Submits a rejection ("No, problem still exists")
   */
  submitRejection: async (clusterId, userId, completedBy, currentCycle, reason, note, media) => {
    if (userId === completedBy) {
      throw new Error("Self-verification is not allowed.");
    }

    try {
      // Check for duplicate
      const existing = await resolutionService.getVerificationsForIssue(clusterId, currentCycle);
      if (existing.some(v => v.verifiedBy === userId)) {
        throw new Error("You have already submitted feedback for this work cycle.");
      }

      await addDoc(collection(db, 'resolutionVerifications'), {
        clusterId,
        verifiedBy: userId,
        decision: 'rejected',
        reason,
        note,
        media: media || null,
        verificationCycle: currentCycle,
        createdAt: serverTimestamp()
      });

      // Update issue status back to Reopened
      // We also increment the verification cycle so the NEXT time it's completed, it gets fresh verifications.
      const docRef = doc(db, 'issues', clusterId);
      const { increment } = await import('firebase/firestore');
      
      await updateDoc(docRef, {
        status: 'Reopened',
        reopenedAt: serverTimestamp(),
        reopenedCount: increment(1),
        verificationCycle: (currentCycle || 1) + 1,
        updatedAt: serverTimestamp()
      });

      // Record in Civic Memory for tracking recurrences
      const { civicMemoryService } = await import('./civicMemoryService');
      const issueSnap = await getDoc(docRef);
      if (issueSnap.exists()) {
        await civicMemoryService.recordRecurrence(clusterId, clusterId, clusterId, issueSnap.data());
      }

      // Update Timeline
      const { taskService } = await import('./taskService');
      await taskService.addStatusHistory(clusterId, 'Awaiting Verification', 'Reopened', userId, `Issue remains unresolved. Reason: ${reason}`);

      // Recalculate confidence for the history
      await resolutionService.updateResolutionConfidence(clusterId, currentCycle);

      return true;
    } catch (error) {
      console.error("Error submitting rejection:", error);
      throw error;
    }
  }
};
