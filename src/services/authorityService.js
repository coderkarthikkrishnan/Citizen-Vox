import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, limit, startAfter, doc, getDoc } from 'firebase/firestore';

export const authorityService = {
  /**
   * Fetches issues for the Authority Dashboard, sorted by Priority finalScore descending.
   */
  getPriorityQueue: async (user, filters = {}, pageSize = 50) => {
    try {
      let q = collection(db, 'issues');
      let queryConstraints = [];

      if (user.role === 'admin') {
        if (user.municipalityId) {
          queryConstraints.push(where('municipalityId', '==', user.municipalityId));
        }
        if (user.departmentId) {
          queryConstraints.push(where('departmentId', '==', user.departmentId));
        }
      }

      if (filters.status && filters.status !== 'All') {
        // Handle both status naming conventions
        queryConstraints.push(where('status', '==', filters.status));
      }
      
      if (filters.department && filters.department !== 'All') {
        queryConstraints.push(where('assignedDepartment', '==', filters.department));
      }

      // Execute query without Firestore orderBy to avoid dropping documents missing the priority field
      const finalQuery = query(q, ...queryConstraints);
      const snapshot = await getDocs(finalQuery);
      
      const issues = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        issues.push({ id: doc.id, ...data });
      });

      // Sort in memory: Priority (desc) -> Created At (desc)
      issues.sort((a, b) => {
        const scoreA = a.priority?.finalScore || 0;
        const scoreB = b.priority?.finalScore || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Fallback to creation date
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      return {
        issues: issues.slice(0, pageSize),
        lastDoc: null // Pagination disabled for in-memory sort
      };
    } catch (error) {
      console.error("Error fetching priority queue:", error);
      throw error;
    }
  },

  /**
   * Fetches all raw issues for the admin dashboard.
   */
  getAllIssues: async (user, limitCount = 100) => {
    try {
      let q = collection(db, 'issues');
      let queryConstraints = [orderBy('createdAt', 'desc'), limit(limitCount)];

      if (user.role === 'admin') {
        if (user.municipalityId) {
          queryConstraints.push(where('municipalityId', '==', user.municipalityId));
        }
        if (user.departmentId) {
          queryConstraints.push(where('departmentId', '==', user.departmentId));
        }
      }

      const finalQuery = query(q, ...queryConstraints);
      const snapshot = await getDocs(finalQuery);
      
      const issues = [];
      snapshot.forEach(doc => {
        issues.push({ id: doc.id, ...doc.data() });
      });

      return issues;
    } catch (error) {
      console.error("Error fetching all issues:", error);
      throw error;
    }
  },

  /**
   * Gets specific issue cluster details.
   */
  getIssueDetails: async (issueId) => {
    try {
      // Check issues collection first (primary data store)
      const issueRef = doc(db, 'issues', issueId);
      const issueSnap = await getDoc(issueRef);
      if (issueSnap.exists()) {
        return { id: issueSnap.id, ...issueSnap.data() };
      }

      // Fallback: legacy issueClusters collection
      const clusterRef = doc(db, 'issueClusters', issueId);
      const clusterSnap = await getDoc(clusterRef);
      if (clusterSnap.exists()) {
        return { id: clusterSnap.id, ...clusterSnap.data(), isCluster: true };
      }

      return null;
    } catch (error) {
      console.error("Error fetching issue details:", error);
      throw error;
    }
  },

  /**
   * Fetches KPIs for the dashboard.
   * This is a simplified MVP version. In a real app, you'd use Cloud Functions for aggregations.
   */
  getDashboardKPIs: async (user) => {
    try {
      // For MVP, we'll fetch the last 100 recent active clusters and compute stats.
      // In production, we'd use Firestore Aggregation queries (COUNT(), etc.)
      let queryConstraints = [orderBy('createdAt', 'desc'), limit(500)];
      
      if (user.role === 'admin') {
        if (user.municipalityId) {
          queryConstraints.push(where('municipalityId', '==', user.municipalityId));
        }
        if (user.departmentId) {
          queryConstraints.push(where('departmentId', '==', user.departmentId));
        }
      }

      const q = query(collection(db, 'issueClusters'), ...queryConstraints);
      const snapshot = await getDocs(q);
      
      let total = 0;
      let critical = 0;
      let high = 0;
      let inProgress = 0;
      let resolved = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        
        total++;
        if (data.priority?.level === 'Critical') critical++;
        if (data.priority?.level === 'High') high++;
        if (data.currentStatus === 'In Progress') inProgress++;
        if (data.currentStatus === 'Resolved') resolved++;
      });

      return {
        totalActive: total - resolved,
        critical,
        high,
        inProgress,
        resolved
      };
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      return { totalActive: 0, critical: 0, high: 0, inProgress: 0, resolved: 0 };
    }
  }
};
