import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit,
  onSnapshot,
  updateDoc,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { gamificationService } from './gamificationService';
import { clusterService } from './clusterService';

export const issueService = {
  /**
   * Create a new civic issue report
   */
  createIssue: async (issueData, userId) => {
    if (!db) throw new Error("Firestore not initialized");

    const issuesRef = collection(db, 'issues');
    
    // Preliminary issue structure
    const newIssue = {
      title: issueData.title || '',
      description: issueData.description,
      category: issueData.category,
      status: 'submitted',
      latitude: issueData.location?.lat,
      longitude: issueData.location?.lng,
      address: issueData.location?.address || 'Unknown Location',
      reportedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      media: issueData.media || [], // [{ url, type, publicId }]
      verificationCount: 0,
      endorsements: [], // Array of user IDs who verified this issue
      escalationLevel: 0,
      priorityScore: null,
      confidenceScore: null,
      inputMethod: issueData.inputMethod || 'text',
      language: issueData.language || 'en-IN'
    };

    let docRef;
    try {
      docRef = await addDoc(issuesRef, newIssue);
    } catch (err) {
      console.error("Error saving initial issue:", err);
      throw err;
    }
    
    // 1. AI Understanding
    try {
      const { aiService } = await import('./aiService'); // lazy load to avoid circular deps if any
      const aiAnalysis = await aiService.analyzeIssue(docRef.id, newIssue);
      
      // Update with AI insights
      await updateDoc(docRef, { 
        aiAnalysis: aiAnalysis,
        category: aiAnalysis.category || newIssue.category,
        title: aiAnalysis.summary || newIssue.title
      });
      newIssue.aiAnalysis = aiAnalysis;
      newIssue.category = aiAnalysis.category || newIssue.category;
    } catch (err) {
      console.error("AI Understanding failed during issue creation:", err);
    }

    // 2. Auto-cluster & Duplicate Detection
    try {
      await clusterService.processClustering(docRef.id, newIssue);
    } catch (err) {
      console.error("Clustering failed during issue creation:", err);
    }
    
    // 3. Award XP
    await gamificationService.addXp(userId, 50);
    await gamificationService.awardBadge(userId, 1);
    
    return docRef.id;
  },

  /**
   * Get issues reported by a specific user
   */
  getUserIssues: async (userId) => {
    if (!db) return [];
    
    try {
      const q = query(
        collection(db, 'issues'),
        where('reportedBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching user issues:", error);
      return [];
    }
  },

  /**
   * Get a single issue by ID
   */
  getIssueById: async (issueId) => {
    if (!db) return null;
    
    try {
      const docRef = doc(db, 'issues', issueId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching issue:", error);
      return null;
    }
  },

  /**
   * Simple MVP approach for nearby issues: just fetch recent active issues
   * In a real production environment, we would use GeoFirestore or calculate distance
   */
  getNearbyIssues: async () => {
    if (!db) return [];
    
    try {
      // Fetching 200 most recent issues for MVP client-side filtering
      const q = query(
        collection(db, 'issues'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching nearby issues:", error);
      return [];
    }
  },

  /**
   * Get all issues
   */
  getAllIssues: async (limitCount = 50) => {
    if (!db) return [];
    
    try {
      const q = query(
        collection(db, 'issues'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching all issues:", error);
      return [];
    }
  },

  /**
   * Subscribe to all issues for real-time dashboard updates
   */
  subscribeToAllIssues: (callback) => {
    if (!db) return () => {};
    
    const q = query(
      collection(db, 'issues'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(issues);
    }, (error) => {
      console.error("Error subscribing to issues:", error);
    });
  },

  /**
   * Endorse (Verify) an issue by a nearby user
   */
  endorseIssue: async (issueId, userId) => {
    if (!db) return false;
    try {
      const issueRef = doc(db, 'issues', issueId);
      const issueSnap = await getDoc(issueRef);
      
      if (!issueSnap.exists()) return false;
      const issue = issueSnap.data();
      
      // Prevent self-endorsement or double endorsement
      if (issue.reportedBy === userId || (issue.endorsements && issue.endorsements.includes(userId))) {
        return false;
      }

      const newEndorsements = [...(issue.endorsements || []), userId];
      let newStatus = issue.status;

      // Auto-verify if it hits threshold (3)
      if (newEndorsements.length >= 3 && (issue.status === 'reported' || issue.status === 'under_review')) {
        newStatus = 'community_verified';
      }

      await updateDoc(issueRef, {
        endorsements: arrayUnion(userId),
        verificationCount: newEndorsements.length,
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Award XP to the endorser
      await gamificationService.addXp(userId, 10);
      
      return true;
    } catch (error) {
      console.error("Error endorsing issue:", error);
      return false;
    }
  },

  /**
   * Update issue status (typically by authority)
   */
  updateIssueStatus: async (issueId, status, resolutionNotes = '') => {
    if (!db) return false;
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
      await updateDoc(doc(db, 'issues', issueId), updateData);
      return true;
    } catch (error) {
      console.error("Error updating status:", error);
      return false;
    }
  },

  /**
   * Post-Resolution Verification by Original Reporter
   */
  verifyResolution: async (issueId, isVerified) => {
    if (!db) return false;
    try {
      const issueRef = doc(db, 'issues', issueId);
      const issueSnap = await getDoc(issueRef);
      if (!issueSnap.exists()) return false;
      
      const issue = issueSnap.data();
      
      if (isVerified) {
        await updateDoc(issueRef, {
          status: 'closed',
          closedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        // Award XP to reporter for closing loop
        await gamificationService.addXp(issue.reportedBy, 20);
      } else {
        await updateDoc(issueRef, {
          status: 'in_progress',
          escalationLevel: (issue.escalationLevel || 0) + 1,
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      console.error("Error verifying resolution:", error);
      return false;
    }
  },

  /**
   * Delete an issue
   */
  deleteIssue: async (issueId) => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'issues', issueId));
      return true;
    } catch (error) {
      console.error("Error deleting issue:", error);
      return false;
    }
  },

  /**
   * Haversine distance formula (returns distance in km)
   */
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);  
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  }
};
