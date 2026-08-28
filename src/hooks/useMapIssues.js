import { useState, useMemo } from 'react';

// Distance calculation using Haversine formula (in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useMapIssues = (issues, filters, userLocation) => {
  const [activeIssueId, setActiveIssueId] = useState(null);

  const filteredIssues = useMemo(() => {
    let result = [...issues];

    // Filter by Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(issue => 
        (issue.title && issue.title.toLowerCase().includes(q)) ||
        (issue.description && issue.description.toLowerCase().includes(q)) ||
        (issue.id && issue.id.toLowerCase().includes(q)) ||
        (issue.category && issue.category.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (filters.category && filters.category !== 'All') {
      // Assuming categories in Firebase might be snake_case, need mapping or exact match
      // We'll normalize to lowercase just in case
      result = result.filter(issue => issue.category?.toLowerCase() === filters.category.toLowerCase());
    }

    // Filter by Status
    if (filters.status && filters.status !== 'All') {
      result = result.filter(issue => issue.status?.toLowerCase() === filters.status.toLowerCase());
    }

    // Filter by Severity
    if (filters.severity && filters.severity !== 'All') {
      // If priorityScore/confidenceScore determines severity, we calculate it here, 
      // but if severity is a direct field, we use that. 
      // For MVP, we'll map confidenceScore to severity if severity field isn't present
      result = result.filter(issue => {
        const issueSeverity = getSeverity(issue);
        return issueSeverity.toLowerCase() === filters.severity.toLowerCase();
      });
    }

    // Distance Calculation and Filtering
    if (userLocation) {
      result = result.map(issue => {
        const lat = issue.latitude || issue.location?.lat;
        const lng = issue.longitude || issue.location?.lng;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        return { ...issue, distance: dist };
      });

      if (filters.distance && filters.distance !== 'All') {
        const maxDist = parseFloat(filters.distance); // e.g., '1', '2', '5'
        if (!isNaN(maxDist)) {
          result = result.filter(issue => issue.distance !== null && issue.distance <= maxDist);
        }
      }

      // Sort by distance
      result.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return result;
  }, [issues, filters, userLocation]);

  return {
    filteredIssues,
    activeIssueId,
    setActiveIssueId
  };
};

export const getSeverity = (issue) => {
  // Try to determine severity from priorityScore or confidenceScore if explicitly not set
  if (issue.severity) return issue.severity;
  
  // Fallback heuristic based on confidence for MVP visual display
  const score = issue.confidenceScore || 0;
  if (score > 80) return 'Critical';
  if (score > 60) return 'High';
  if (score > 30) return 'Medium';
  return 'Low';
};
