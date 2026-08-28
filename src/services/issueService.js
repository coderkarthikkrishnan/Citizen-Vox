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
  deleteDoc,
  setDoc,
  increment
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
      language: issueData.language || 'en-IN',
      municipalityId: null,
      departmentId: null,
      assignedWorkerId: null
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

  subscribeToAllIssues: (callback) => {
    if (!db) return () => {};
    
    // Do not use orderBy('createdAt') here, because Firestore will silently drop
    // any mock documents that are missing the 'createdAt' field.
    const q1 = query(collection(db, 'issues'), limit(200));
    const q2 = query(collection(db, 'issueClusters'), limit(200));
    
    let issuesData = [];
    let clustersData = [];

    const emit = () => {
      // Merge and deduplicate by ID just in case
      const merged = [...issuesData, ...clustersData];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      
      // Sort by createdAt desc in memory
      unique.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
      callback(unique);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      emit();
    }, (error) => console.error("Error subscribing to issues:", error));

    const unsub2 = onSnapshot(q2, (snapshot) => {
      clustersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isCluster: true }));
      emit();
    }, (error) => console.error("Error subscribing to issueClusters:", error));
    
    return () => {
      unsub1();
      unsub2();
    };
  },

  /**
   * Check if a user has already endorsed an issue
   */
  checkEndorsement: async (issueId, userId) => {
    if (!db || !userId || !issueId) return false;
    try {
      let endorseRef = doc(db, 'issues', issueId, 'endorsements', userId);
      let snap = await getDoc(endorseRef);
      if (snap.exists()) return true;

      endorseRef = doc(db, 'issueClusters', issueId, 'endorsements', userId);
      snap = await getDoc(endorseRef);
      return snap.exists();
    } catch (e) {
      if (e.code === 'permission-denied') {
        console.warn("Firebase Rules blocked endorsement check. Please update firestore.rules in your Firebase Console.");
      } else {
        console.error("Error checking endorsement:", e);
      }
      return false;
    }
  },

  /**
   * Endorse (Verify) an issue by a citizen using a secure subcollection
   */
  endorseIssue: async (issueId, userId) => {
    if (!db || !userId || !issueId) return false;
    try {
      let collectionName = 'issues';
      let issueRef = doc(db, collectionName, issueId);
      let issueSnap = await getDoc(issueRef);
      
      // Fallback to issueClusters for mock data
      if (!issueSnap.exists()) {
        collectionName = 'issueClusters';
        issueRef = doc(db, collectionName, issueId);
        issueSnap = await getDoc(issueRef);
        
        if (!issueSnap.exists()) return false;
      }

      const endorseRef = doc(db, collectionName, issueId, 'endorsements', userId);
      const endorseSnap = await getDoc(endorseRef);
      
      const issue = issueSnap.data();
      
      // Prevent self-endorsement or double endorsement
      if (issue.reportedBy === userId || endorseSnap.exists()) {
        return false;
      }

      // Calculate auto-verify threshold
      const currentVerifications = issue.verificationCount || (issue.endorsements?.length || 0);
      let newStatus = issue.status || issue.currentStatus; // issueClusters uses currentStatus sometimes
      
      if (currentVerifications + 1 >= 3 && (newStatus === 'reported' || newStatus === 'under_review' || newStatus === 'submitted')) {
        newStatus = 'Under Review';
      }

      // Write subcollection doc
      await setDoc(endorseRef, {
        userId: userId,
        createdAt: serverTimestamp()
      });

      // Atomically increment counts on parent issue
      const updates = {
        verificationCount: increment(1),
        reportCount: increment(1),
        confidenceScore: increment(5),
        updatedAt: serverTimestamp()
      };
      
      if (newStatus !== (issue.status || issue.currentStatus)) {
        if (collectionName === 'issues') {
          updates.status = newStatus;
        } else {
          updates.currentStatus = newStatus;
        }
      }

      await updateDoc(issueRef, updates);

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
