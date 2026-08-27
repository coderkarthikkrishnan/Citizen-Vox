import { db } from '../firebase/config';
import { collection, doc, addDoc, updateDoc, increment, getDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { aiService } from './aiService';
import { civicMemoryService } from './civicMemoryService';

export const clusterService = {
  /**
   * Process a newly submitted report to see if it belongs to a cluster or triggers civic memory.
   */
  processClustering: async (newReportId, newReportData) => {
    try {
      if (!newReportData.latitude || !newReportData.longitude) return null;

      // Dynamically import issueService to avoid circular dependency
      const { issueService } = await import('./issueService');

      // 1. Fetch nearby issues as candidates (simplified bounding box or just recent for MVP)
      const nearbyIssues = await issueService.getNearbyIssues();
      const radiusKm = 0.05; // 50 meters
      
      const candidates = nearbyIssues
        .filter(issue => issue.id !== newReportId)
        .filter(issue => issue.category === newReportData.category)
        .map(issue => ({
          ...issue,
          distanceStr: `${(issueService.calculateDistance(newReportData.latitude, newReportData.longitude, issue.latitude, issue.longitude) * 1000).toFixed(1)}m`
        }))
        .filter(issue => issueService.calculateDistance(newReportData.latitude, newReportData.longitude, issue.latitude, issue.longitude) <= radiusKm);

      if (candidates.length === 0) return null; // New occurrence

      // 2. Ask AI to check for semantic duplicates
      const result = await aiService.checkDuplicates(
        { id: newReportId, ...newReportData }, 
        candidates
      );

      if (!result.potentialMatch || !result.matchedCandidateId) {
        return null; // AI determined it's not the same problem
      }

      const matchedIssue = candidates.find(c => c.id === result.matchedCandidateId);
      if (!matchedIssue) return null;

      // 3. Distinguish between Duplicate (active) and Recurrence (resolved)
      const isActive = !['closed', 'Resolved'].includes(matchedIssue.status);

      if (isActive) {
        // DUPLICATE -> Join Cluster
        return await clusterService.joinCluster(newReportId, newReportData, matchedIssue.id, matchedIssue.issueClusterId);
      } else {
        // RECURRENCE -> Record in Civic Memory
        await civicMemoryService.recordRecurrence(matchedIssue.id, newReportId, matchedIssue.issueClusterId, newReportData);
        return null; // It's tracked in memory, but stands alone as a new active issue ticket
      }

    } catch (error) {
      console.error("Clustering Process Error:", error);
      return null;
    }
  },

  joinCluster: async (newReportId, newReportData, candidateId, candidateClusterId = null) => {
    try {
      let finalClusterId = candidateClusterId;

      if (!finalClusterId) {
        const candidateRef = doc(db, 'issues', candidateId);
        const candidateSnap = await getDoc(candidateRef);
        
        if (!candidateSnap.exists()) throw new Error("Candidate issue not found");
        const candidateData = candidateSnap.data();

        const newClusterRef = await addDoc(collection(db, 'issueClusters'), {
          title: candidateData.title || newReportData.title,
          category: candidateData.category || newReportData.category,
          severity: candidateData.aiAnalysis?.severity || newReportData.aiAnalysis?.severity || 'medium',
          latitude: candidateData.latitude,
          longitude: candidateData.longitude,
          status: candidateData.status || 'under_review',
          reportCount: 2,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastReportedAt: serverTimestamp(),
          representativeReportId: candidateId
        });

        finalClusterId = newClusterRef.id;
        await updateDoc(candidateRef, { issueClusterId: finalClusterId });
      } else {
        const clusterRef = doc(db, 'issueClusters', finalClusterId);
        await updateDoc(clusterRef, {
          reportCount: increment(1),
          updatedAt: serverTimestamp(),
          lastReportedAt: serverTimestamp()
        });
      }

      const newReportRef = doc(db, 'issues', newReportId);
      await updateDoc(newReportRef, { issueClusterId: finalClusterId });

      return finalClusterId;

    } catch (error) {
      console.error("Cluster Service Error:", error);
      throw error;
    }
  },

  keepIndependent: async (newReportId) => {
    return null;
  }
};
