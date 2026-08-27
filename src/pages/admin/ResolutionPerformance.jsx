import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { resolutionDurabilityService } from '../../services/resolutionDurabilityService';
import { CheckCircle, ShieldAlert, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ResolutionPerformance = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({ total: 0, resolved: 0, reopened: 0, durability: 0, approvalRate: 0, avgResolutionTime: 0 });
  const [problemIssues, setProblemIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const result = await resolutionDurabilityService.getDurabilityMetrics(user);
        
        setMetrics({ 
          total: result.total, 
          resolved: result.resolved, 
          reopened: result.reopened, 
          durability: result.durability,
          approvalRate: result.approvalRate || 0,
          avgResolutionTime: result.avgResolutionTime || 0
        });
        setProblemIssues(result.problemIssues);
      } catch (err) {
        console.error("Failed to load resolution performance:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchPerformance();
  }, [user]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Analyzing Durability...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle /> Resolution Durability
        </h1>
        <p className="text-muted">Tracking the long-term success of resolved civic issues.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="text-h2" style={{ color: 'var(--primary-green)' }}>{metrics.durability}%</div>
          <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Durability Score</p>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="text-h2" style={{ color: 'var(--primary-green)' }}>{metrics.approvalRate}%</div>
          <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Citizen Approval Rate</p>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="text-h2">{metrics.avgResolutionTime}h</div>
          <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Avg Resolution Time</p>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="text-h2">{metrics.resolved}</div>
          <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Total Resolved</p>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="text-h2" style={{ color: 'var(--danger)' }}>{metrics.reopened}</div>
          <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Total Reopened</p>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '2rem' }}>
        <h3 className="text-h3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert color="var(--warning)" /> Problematic Resolutions
        </h3>
        
        {problemIssues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted">Excellent. No issues have been reopened.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {problemIssues.map(issue => (
              <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--danger)' }}>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{issue.title}</h4>
                  <p className="text-small text-muted">Reopened {issue.reopenedCount} times • Dept: {issue.departmentId || 'Unassigned'}</p>
                </div>
                <Link to={`/admin/issues/${issue.id}`} style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  Investigate
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResolutionPerformance;
