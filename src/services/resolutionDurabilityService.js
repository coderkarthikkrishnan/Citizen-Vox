import { db } from '../firebase/config';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { civicMemoryService } from './civicMemoryService';
import { authorityService } from './authorityService';

export const resolutionDurabilityService = {
  /**
   * Calculates durability metrics for a given user context (e.g. municipality)
   */
  getDurabilityMetrics: async (user) => {
    try {
      // 1. Get all issues for this authority's jurisdiction
      const allIssues = await authorityService.getAllIssues(user);
      
      let total = 0;
      let resolvedCount = 0;
      let reopenedCount = 0;
      let approvedCount = 0;
      let totalResolutionTimeHours = 0;
      const problemIssues = [];

      allIssues.forEach(issue => {
        total++;
        if (issue.status === 'Resolved' || issue.status === 'closed' || issue.status === 'resolved') {
          resolvedCount++;
          
          // Calculate Approval Rate
          if (issue.verificationStatus === 'approved') {
            approvedCount++;
          }
          
          // Calculate Resolution Time (Hours)
          if (issue.createdAt && issue.resolvedAt) {
            const created = issue.createdAt.toDate ? issue.createdAt.toDate() : new Date(issue.createdAt);
            const resolved = issue.resolvedAt.toDate ? issue.resolvedAt.toDate() : new Date(issue.resolvedAt);
            totalResolutionTimeHours += (resolved - created) / (1000 * 60 * 60);
          }
        }
        
        // Count as problem if strictly reopened OR if it triggered a civic memory recurrence
        // Note: For MVP we just use the `reopenedCount` field which was incremented by workflows
        if (issue.reopenedCount > 0) {
          reopenedCount++;
          problemIssues.push(issue);
        }
      });

      // 2. Fetch Civic Memory records to find recurrent issues (resolved -> broken again)
      // For MVP, we'll fetch all memory records and match if they fall in this user's jurisdiction
      const memoryRecords = await civicMemoryService.getMemoryRecords();
      
      // Merge memory records into problem issues if they aren't just 'reopened' but 'recurrent'
      memoryRecords.forEach(mem => {
        // Find if this memory record matches any issue we know about
        const linkedIssues = allIssues.filter(i => mem.linkedIssues?.includes(i.id));
        if (linkedIssues.length > 0) {
          // This is a recurrent problem
          const representativeIssue = linkedIssues[0];
          
          if (!problemIssues.some(p => p.id === representativeIssue.id)) {
            problemIssues.push({
              ...representativeIssue,
              title: mem.title,
              reopenedCount: mem.recurrenceCount,
              isRecurrent: true // Flag to distinguish from simple 'reopened' task
            });
            reopenedCount++;
          }
        }
      });

      // Durability: (Total - Reopened/Recurrent) / Total
      const durabilityScore = total > 0 ? Math.round(((total - reopenedCount) / total) * 100) : 0;
      const approvalRate = resolvedCount > 0 ? Math.round((approvedCount / resolvedCount) * 100) : 0;
      const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTimeHours / resolvedCount) : 0;

      return {
        total,
        resolved: resolvedCount,
        reopened: reopenedCount,
        durability: durabilityScore,
        approvalRate,
        avgResolutionTime,
        problemIssues
      };

    } catch (error) {
      console.error("Durability metrics error:", error);
      return { total: 0, resolved: 0, reopened: 0, durability: 0, problemIssues: [] };
    }
  }
};
