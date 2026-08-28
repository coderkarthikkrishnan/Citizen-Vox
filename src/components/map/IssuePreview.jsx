import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IssueStatus from '../citizen/IssueStatus';
import { getSeverity } from '../../hooks/useMapIssues';
import { Navigation } from 'lucide-react';
import PriorityBadge from '../priority/PriorityBadge';
import { useAuth } from '../../hooks/useAuth';
import { issueService } from '../../services/issueService';
import './MapStyles.css';

const IssuePreview = ({ issue }) => {
  const severity = getSeverity(issue);
  const { user } = useAuth();
  
  const [endorsing, setEndorsing] = useState(false);
  const [alreadyEndorsed, setAlreadyEndorsed] = useState(false);

  useEffect(() => {
    if (user && issue.id) {
      issueService.checkEndorsement(issue.id, user.uid).then(setAlreadyEndorsed);
    }
  }, [issue.id, user]);

  const handleEndorse = async (e) => {
    e.stopPropagation();
    if (!user) {
      alert("Sign in to confirm this issue.");
      return;
    }
    setEndorsing(true);
    const success = await issueService.endorseIssue(issue.id, user.uid);
    if (success) {
      setAlreadyEndorsed(true);
    } else {
      alert("Failed to endorse. You may have already endorsed this issue.");
    }
    setEndorsing(false);
  };
  
  // Format distance
  const distanceText = issue.distance !== undefined && issue.distance !== null 
    ? issue.distance < 1 
      ? `${Math.round(issue.distance * 1000)}m away` 
      : `${issue.distance.toFixed(1)}km away`
    : null;

  const bgStyle = issue.media && issue.media.length > 0
    ? { backgroundImage: `url(${issue.media[0].url})` }
    : { background: 'var(--surface-hover)' };

  return (
    <div className="issue-preview">
      <div className="issue-preview-header" style={bgStyle}>
        {!issue.media?.length && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            No Image
          </div>
        )}
      </div>
      
      <div className="issue-preview-body">
        <div className="issue-preview-meta">
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {issue.category?.replace(/_/g, ' ')}
          </span>
          {distanceText && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {distanceText}
            </span>
          )}
        </div>
        
        <h3 className="issue-preview-title">{issue.title || 'Untitled Issue'}</h3>
        
        {/* Community Verification Summary */}
        {(issue.verificationCount > 0 || issue.reportCount > 1 || issue.confidenceScore) && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '500' }}>
            <span style={{ color: 'var(--primary)' }}>
              {issue.verificationCount || issue.reportCount || 1} Confirmations
            </span>
            {issue.confidenceScore && (
              <>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ color: issue.confidenceScore >= 70 ? 'var(--success-dark)' : 'var(--warning-dark)' }}>
                  {issue.confidenceScore}% Confidence
                </span>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <IssueStatus status={issue.status} />
          {issue.priority && (
            <PriorityBadge level={issue.priority.level} score={issue.priority.finalScore} />
          )}
          {!issue.priority && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '2px 8px', 
              borderRadius: '12px',
              backgroundColor: `var(--${severity.toLowerCase()}-light, #f3f4f6)`,
              color: `var(--${severity.toLowerCase()}-dark, #374151)`,
              fontWeight: '500'
            }}>
              {severity}
            </span>
          )}
        </div>
        
        <div className="issue-preview-footer" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <Link to={`/citizen/issues/${issue.id}`} className="preview-btn preview-btn-primary" style={{ flex: 1, minWidth: '40%', padding: '0.5rem' }}>
            View
          </Link>
          <button 
            className="preview-btn preview-btn-secondary"
            onClick={handleEndorse}
            disabled={endorsing || alreadyEndorsed}
            style={{ 
              flex: 1.5, 
              minWidth: '45%', 
              cursor: (endorsing || alreadyEndorsed) ? 'not-allowed' : 'pointer',
              background: alreadyEndorsed ? 'var(--success-light)' : undefined,
              color: alreadyEndorsed ? 'var(--success-dark)' : undefined,
              border: alreadyEndorsed ? '1px solid var(--success-dark)' : undefined,
              padding: '0.5rem'
            }}
          >
            {endorsing ? 'Working...' : alreadyEndorsed ? '✓ Endorsed' : 'Endorse'}
          </button>
          <button 
            className="preview-btn preview-btn-secondary"
            style={{ padding: '0.5rem', flex: '0 0 auto' }}
            onClick={() => {
              if (issue.latitude && issue.longitude) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`, '_blank');
              }
            }}
          >
            <Navigation size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssuePreview;
