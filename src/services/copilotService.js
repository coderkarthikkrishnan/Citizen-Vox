import { db } from '../firebase/config';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { civicMemoryService } from './civicMemoryService';
import { resolutionDurabilityService } from './resolutionDurabilityService';

export const copilotService = {
  /**
   * Retrieves context based on the nature of the question, 
   * falling back to a general overview if the question is ambiguous.
   */
  getContextForQuestion: async (question, user) => {
    try {
      const qLower = question.toLowerCase();
      
      // Intent: Recurrence / Broken again / Durability
      if (qLower.includes('recurring') || qLower.includes('durability') || qLower.includes('broken again') || qLower.includes('coming back')) {
        const durabilityMetrics = await resolutionDurabilityService.getDurabilityMetrics(user);
        const memoryRecords = await civicMemoryService.getMemoryRecords();
        return {
          intent: 'durability',
          metrics: durabilityMetrics,
          topRecurringProblems: memoryRecords.slice(0, 5) // Only send top 5 to save tokens
        };
      }
      
      // Intent: Critical / Priority / Attention
      if (qLower.includes('critical') || qLower.includes('attention') || qLower.includes('priority')) {
        let q = collection(db, 'issues');
        let queryConstraints = [where('status', 'not-in', ['closed', 'Resolved']), orderBy('status'), orderBy('createdAt', 'desc'), limit(20)];
        
        if (user?.municipalityId) queryConstraints.push(where('municipalityId', '==', user.municipalityId));
        
        const snapshot = await getDocs(query(q, ...queryConstraints));
        const issues = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.priority?.level === 'Critical' || data.priority?.level === 'High') {
             issues.push({ id: doc.id, title: data.title, category: data.category, priority: data.priority?.level, daysOpen: Math.floor((new Date() - new Date(data.createdAt?.toDate?.() || data.createdAt)) / (1000 * 60 * 60 * 24)) });
          }
        });
        return { intent: 'priority', criticalIssues: issues };
      }
      
      // General Context (Fallback)
      let q = collection(db, 'issues');
      let queryConstraints = [orderBy('createdAt', 'desc'), limit(15)];
      if (user?.municipalityId) queryConstraints.push(where('municipalityId', '==', user.municipalityId));
      
      const snapshot = await getDocs(query(q, ...queryConstraints));
      const issues = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        issues.push({ title: data.title, status: data.status, priority: data.priority?.level, department: data.assignedDepartment || 'unassigned', reports: data.reportCount || 1 });
      });
      return { intent: 'general', recentIssues: issues };

    } catch (err) {
      console.error("Copilot Context Error:", err);
      return { error: "Failed to gather context." };
    }
  }
};
