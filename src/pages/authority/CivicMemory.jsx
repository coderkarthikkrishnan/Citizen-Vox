import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { civicMemoryService } from '../../services/civicMemoryService';
import { Database, AlertTriangle, Filter, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authorityService } from '../../services/authorityService';

const CivicMemory = () => {
  const { user } = useAuth();
  const [memoryRecords, setMemoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchMemory = async () => {
      setLoading(true);
      try {
        const issues = await authorityService.getAllIssues(user);
        
        // Simple Haversine distance function in meters
        const getDistance = (lat1, lon1, lat2, lon2) => {
          if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
          const R = 6371e3;
          const rLat1 = lat1 * Math.PI/180, rLat2 = lat2 * Math.PI/180;
          const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(rLat1) * Math.cos(rLat2) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        const clusters = [];
        issues.forEach(issue => {
          if (!issue.location?.lat || !issue.location?.lng) return;
          
          let added = false;
          for (let cluster of clusters) {
            // Check if issue is within 100m of the cluster's center
            if (getDistance(cluster.lat, cluster.lng, issue.location.lat, issue.location.lng) <= 100) {
              cluster.issues.push(issue);
              // Recalculate center roughly
              cluster.lat = (cluster.lat * (cluster.issues.length - 1) + issue.location.lat) / cluster.issues.length;
              cluster.lng = (cluster.lng * (cluster.issues.length - 1) + issue.location.lng) / cluster.issues.length;
              added = true;
              break;
            }
          }
          if (!added) {
            clusters.push({
              id: `cluster-${issue.id}`,
              lat: issue.location.lat,
              lng: issue.location.lng,
              category: issue.category,
              title: `Cluster near ${issue.locationName || 'Unknown Location'}`,
              issues: [issue]
            });
          }
        });

        // Filter for chronic defects (>= 3 issues)
        const chronicClusters = clusters
          .filter(c => c.issues.length >= 3)
          .map(c => ({
            id: c.id,
            title: c.title,
            category: c.category,
            recurrenceCount: c.issues.length,
            impact: 'Chronic Infrastructure Defect spanning multiple reports over time.',
            firstIssueId: c.issues[0].id
          }));
          
        setMemoryRecords(chronicClusters);
      } catch (err) {
        console.error("Failed to load civic memory:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchMemory();
  }, [user]);

  const filteredRecords = memoryRecords.filter(r => {
    if (!filter) return true;
    return r.category === filter;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database /> Civic Memory
        </h1>
        <p className="text-muted">Long-term tracking of clustered issues and community consensus.</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', alignItems: 'center' }}>
        <Filter size={20} color="var(--text-muted)" />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <option value="">All Categories</option>
          <option value="road_damage">Road Damage</option>
          <option value="garbage">Garbage</option>
          <option value="water_leakage">Water Leakage</option>
        </select>
      </div>

      {loading ? (
         <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Civic Memory...</div>
      ) : filteredRecords.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <Archive size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-h3">No Clustered Memory</h3>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>No historical issue clusters formed yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {filteredRecords.map(record => {
            const memoryScore = record.recurrenceCount * 25; // Simple formula based on recurrence count
            
            return (
              <div key={record.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '4px 8px', borderRadius: '4px' }}>
                      {record.category?.replace('_', ' ')}
                    </span>
                    <h3 className="text-h3" style={{ marginTop: '0.5rem' }}>{record.title || 'Recurring Civic Issue'}</h3>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '60px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-green)' }}>{memoryScore}</div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Score</div>
                  </div>
                </div>
                
                <p className="text-small text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {record.impact || 'Recurring problem affecting the community.'}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span className="text-small" style={{ fontWeight: 600 }}>{record.recurrenceCount} Occurrences</span>
                  </div>
                  <Link to={`/admin/issues/${record.firstIssueId}`} className="text-small" style={{ color: 'var(--primary-green)', fontWeight: 600, textDecoration: 'none' }}>View Issue</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CivicMemory;
