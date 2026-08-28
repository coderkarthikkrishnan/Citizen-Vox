import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowRight, ShieldCheck, Map } from 'lucide-react';
import { issueService } from '../../services/issueService';
import Button from '../../components/common/Button';

const AuthorityDashboard = () => {
  const [metrics, setMetrics] = useState({
    active: 0,
    activeChange: 0,
    critical: 0,
    criticalChange: 0,
    resolved: 0,
    resolvedChange: 0,
    verified: 0,
    verifiedChange: 0
  });

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = issueService.subscribeToAllIssues((liveIssues) => {
      // Calculate Metrics
      const activeCount = liveIssues.filter(i => i.status === 'submitted' || i.status === 'in_progress').length;
      const resolvedCount = liveIssues.filter(i => i.status === 'resolved').length;
      
      // Calculate Priority (basic MVP threshold logic: if AI confidence > 80 it's High, if category is drainage/water and confidence > 90 it's Critical)
      let criticalCount = 0;
      
      const enrichedQueue = liveIssues.slice(0, 10).map(issue => {
        let priority = 'Medium';
        const conf = issue.confidenceScore || Math.floor(Math.random() * 30 + 50); // mock conf if missing
        
        if (conf > 80) priority = 'High';
        if (conf > 90 && (issue.category === 'drainage' || issue.category === 'road_damage')) {
          priority = 'Critical';
        }

        if (priority === 'Critical' && issue.status !== 'resolved') {
          criticalCount++;
        }

        return {
          id: issue.id,
          priority,
          title: issue.title || issue.category || 'New Issue',
          location: issue.address || issue.location?.address || (issue.latitude ? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}` : 'Unknown Location'),
          confidence: conf,
          status: issue.status === 'submitted' ? 'New' : issue.status
        };
      });

      setMetrics({
        active: activeCount,
        activeChange: 12, // Still mock change % since we need historical time-series data for this
        critical: criticalCount,
        criticalChange: 8,
        resolved: resolvedCount,
        resolvedChange: 18,
        verified: liveIssues.reduce((acc, curr) => acc + (curr.verificationCount || 0), 0),
        verifiedChange: 15
      });

      // Sort queue to put Critical at top
      enrichedQueue.sort((a, b) => {
        const pScore = { 'Critical': 3, 'High': 2, 'Medium': 1 };
        return pScore[b.priority] - pScore[a.priority];
      });

      setQueue(enrichedQueue);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h2" style={{ marginBottom: '8px' }}>Citizen Vox in Action</h1>
          <p className="text-body text-muted">From reporting to resolution — a transparent and accountable civic ecosystem.</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        
        <div className="card-premium">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Active Issues</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.active.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={12}/> {metrics.activeChange}% this week
          </div>
        </div>

        <div className="card-premium">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Critical Issues</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--critical)' }}>{metrics.critical.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--critical)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={12}/> {metrics.criticalChange}% this week
          </div>
        </div>

        <div className="card-premium">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Resolved Issues</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{metrics.resolved.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={12}/> {metrics.resolvedChange}% this week
          </div>
        </div>

        <div className="card-premium">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Citizen Verifications</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{(metrics.verified/1000).toFixed(1)}K</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={12}/> {metrics.verifiedChange}% this week
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Priority Queue */}
        <div className="card-premium">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="text-h4">Priority Queue</h3>
            <Link to="/authority/issues" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>View All</Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading live data...</div>
            ) : queue.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No issues reported yet.</div>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 0', fontWeight: 600 }}>Priority</th>
                    <th style={{ fontWeight: 600 }}>Issue</th>
                    <th style={{ fontWeight: 600 }}>Location</th>
                    <th style={{ fontWeight: 600 }}>Confidence</th>
                    <th style={{ fontWeight: 600 }}>Status</th>
                    <th style={{ fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '16px 0' }}>
                        <span style={{ 
                          background: item.priority === 'Critical' ? 'var(--danger-soft)' : item.priority === 'High' ? 'var(--warning-light)' : 'var(--surface-soft)', 
                          color: item.priority === 'Critical' ? 'var(--danger-dark)' : item.priority === 'High' ? 'var(--warning-dark)' : 'var(--warning-dark)', 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                        }}>
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.title.replace('_', ' ')}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.location}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.confidence}%</td>
                      <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{item.status.replace(/_/g, ' ')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {(item.status === 'in progress' || item.status === 'New' || item.status === 'community verified') && (
                           <button 
                             onClick={() => issueService.updateIssueStatus(item.id, 'awaiting_final_verification')}
                             style={{ background: 'var(--primary-green)', color: 'var(--near-black)', border: 'none', padding: '4px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                           >
                             Resolve
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Map Preview */}
        <div style={{ background: 'var(--near-black)', borderRadius: '24px', overflow: 'hidden', position: 'relative', minHeight: '400px' }}>
          <div style={{ padding: '24px', color: 'var(--white)', position: 'relative', zIndex: 2 }}>
            <h3 className="text-h4">Live Map</h3>
            
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--critical)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Critical</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Medium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-green)' }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Low</span>
              </div>
            </div>
          </div>
          
          <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'perspective(500px) rotateX(45deg) scale(1.5)', transformOrigin: 'top center' }}></div>
            <div style={{ position: 'absolute', top: '40%', left: '30%', width: '12px', height: '12px', background: 'var(--critical)', borderRadius: '50%', boxShadow: '0 0 10px var(--critical)' }}></div>
            <div style={{ position: 'absolute', top: '60%', left: '70%', width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '50%', boxShadow: '0 0 10px var(--warning)' }}></div>
            <div style={{ position: 'absolute', top: '70%', left: '40%', width: '8px', height: '8px', background: 'var(--primary-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary-green)' }}></div>
          </div>
          
          <Link to="/authority/map" style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 2, fontSize: '0.875rem', color: 'var(--primary-green)', fontWeight: 600, textDecoration: 'none' }}>
            View Map →
          </Link>
        </div>

      </div>

    </div>
  );
};

export default AuthorityDashboard;
