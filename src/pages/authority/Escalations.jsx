import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authorityService } from '../../services/authorityService';
import { Link } from 'react-router-dom';
import { AlertOctagon, Clock, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';

const Escalations = () => {
  const { user } = useAuth();
  const [escalatedIssues, setEscalatedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEscalations = async () => {
      setLoading(true);
      try {
        const data = await authorityService.getAllIssues(user);
        
        const now = new Date();
        const escalated = data.filter(issue => {
          if (issue.status === 'Resolved' || issue.status === 'closed') return false;
          
          let isEscalated = false;
          let reasons = [];
          
          if (issue.priority?.level === 'Critical') {
            isEscalated = true;
            reasons.push('Critical Priority');
          }
          
          if (issue.createdAt) {
            const created = issue.createdAt.toDate ? issue.createdAt.toDate() : new Date(issue.createdAt);
            const hoursOld = (now - created) / (1000 * 60 * 60);
            
            let slaHours = 168; // Default 7 days
            const cat = issue.category?.toLowerCase() || '';
            if (cat.includes('water')) slaHours = 12;
            else if (cat.includes('garbage') || cat.includes('sanitation')) slaHours = 24;
            else if (cat.includes('road') || cat.includes('pothole')) slaHours = 72;

            if (hoursOld > slaHours) {
              isEscalated = true;
              reasons.push(`Breached SLA (> ${slaHours}h)`);
            }
          }
          
          if (issue.reopenedCount > 0) {
            isEscalated = true;
            reasons.push('Reopened Multiple Times');
          }

          if (isEscalated) {
            issue.escalationReasons = reasons;
            return true;
          }
          return false;
        });

        setEscalatedIssues(escalated);
      } catch (err) {
        console.error("Failed to fetch escalations:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEscalations();
    }
  }, [user]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Analyzing escalations...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertOctagon color="var(--danger)" /> Action Required
        </h1>
        <p className="text-muted">Issues that require immediate administrative intervention.</p>
      </header>

      {escalatedIssues.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-h3">No Escalations</h3>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>All issues are operating within normal parameters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {escalatedIssues.map(issue => (
            <div key={issue.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--danger)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  {issue.escalationReasons.map(reason => (
                     <span key={reason} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                       <AlertTriangle size={12} /> {reason}
                     </span>
                  ))}
                  <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> {issue.status || 'Reported'}
                  </span>
                </div>
                <h3 className="text-h3" style={{ marginBottom: '0.5rem' }}>{issue.title || 'Untitled Issue'}</h3>
              </div>
              <div>
                <Link to={`/admin/issues/${issue.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--danger)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                  Intervene <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Escalations;
