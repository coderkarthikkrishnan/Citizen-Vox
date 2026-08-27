import { db } from '../firebase/config';
import { collection, doc, setDoc, updateDoc, increment, getDoc, getDocs, query, orderBy, limit, serverTimestamp, arrayUnion } from 'firebase/firestore';

export const civicMemoryService = {
  /**
   * Records a recurrence of a previously resolved civic issue cluster.
   */
  recordRecurrence: async (originalIssueId, newIssueId, originalClusterId, newIssueData) => {
    try {
      if (!originalClusterId) return null;

      const memoryRef = doc(db, 'civicMemory', originalClusterId);
      const memorySnap = await getDoc(memoryRef);

      if (!memorySnap.exists()) {
        // Create initial memory record linked to the cluster ID
        const clusterSnap = await getDoc(doc(db, 'issueClusters', originalClusterId));
        const clusterData = clusterSnap.exists() ? clusterSnap.data() : {};

        await setDoc(memoryRef, {
          title: clusterData.title || newIssueData.title,
          category: clusterData.category || newIssueData.category,
          latitude: newIssueData.latitude,
          longitude: newIssueData.longitude,
          firstReportedAt: clusterData.createdAt || serverTimestamp(),
          latestRecurrenceAt: serverTimestamp(),
          recurrenceCount: 1,
          linkedIssues: [originalIssueId, newIssueId],
          impact: newIssueData.aiAnalysis?.impact || 'Unknown',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing memory record
        await updateDoc(memoryRef, {
          latestRecurrenceAt: serverTimestamp(),
          recurrenceCount: increment(1),
          linkedIssues: arrayUnion(newIssueId),
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      console.error("Civic Memory Service Error:", error);
      return false;
    }
  },

  /**
   * Fetches top recurring civic memory records.
   */
  getMemoryRecords: async () => {
    try {
      const q = query(collection(db, 'civicMemory'), orderBy('recurrenceCount', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const records = [];
      snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
      return records;
    } catch (error) {
      console.error("Failed to fetch memory records:", error);
      return [];
    }
  }
};
