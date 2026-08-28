import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import IssueStatus from '../citizen/IssueStatus';
import { getSeverity } from '../../hooks/useMapIssues';
import { useAuth } from '../../hooks/useAuth';
import { issueService } from '../../services/issueService';
import './MapStyles.css';

const IssueActionButtons = ({ issue }) => {
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

  return (
    <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
      <Link to={`/citizen/issues/${issue.id}`} className="preview-btn preview-btn-primary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}>
        View
      </Link>
      <button 
        className="preview-btn preview-btn-secondary"
        onClick={handleEndorse}
        disabled={endorsing || alreadyEndorsed}
        style={{ 
          flex: 1.5, 
          padding: '0.4rem', 
          fontSize: '0.8rem',
          cursor: (endorsing || alreadyEndorsed) ? 'not-allowed' : 'pointer',
          background: alreadyEndorsed ? 'var(--success-light)' : undefined,
          color: alreadyEndorsed ? 'var(--success-dark)' : undefined,
          border: alreadyEndorsed ? '1px solid var(--success-dark)' : undefined,
        }}
      >
        {endorsing ? 'Working...' : alreadyEndorsed ? '✓ Endorsed' : 'Endorse'}
      </button>
      <button 
        className="preview-btn preview-btn-secondary"
        style={{ padding: '0.4rem 0.6rem', flex: '0 0 auto' }}
        onClick={(e) => {
          e.stopPropagation();
          if (issue.latitude && issue.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`, '_blank');
          }
        }}
        title="Get Directions"
      >
        <Navigation size={14} />
      </button>
    </div>
  );
};

const NearbyIssueList = ({ issues, isMobile, activeIssueId, onIssueHover, onIssueClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (isMobile) setIsExpanded(!isExpanded);
  };

  const containerClasses = `map-list-pane ${isExpanded ? 'expanded' : ''}`;

  return (
    <div className={containerClasses}>
      {isMobile && (
        <div className="bottom-sheet-handle" onClick={handleToggle} />
      )}
      
      <div className="map-list-header" onClick={handleToggle} style={{ cursor: isMobile ? 'pointer' : 'default' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
          {issues.length} {issues.length === 1 ? 'Issue' : 'Issues'} Nearby
        </h2>
        {isMobile && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {isExpanded ? 'Swipe down to close' : 'Tap to view list'}
          </p>
        )}
      </div>

      <div className="map-list-content">
        {issues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: '500', marginBottom: '8px', color: 'var(--text-primary)' }}>No civic issues found nearby.</p>
            <p style={{ fontSize: '0.875rem' }}>Your community is looking clear here.</p>
          </div>
        ) : (
          issues.map(issue => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '1rem',
                border: '1px solid',
                borderColor: activeIssueId === issue.id ? 'var(--accent)' : 'var(--border)',
                borderRadius: '12px',
                background: activeIssueId === issue.id ? 'var(--surface-hover)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={() => !isMobile && onIssueHover(issue.id)}
              onMouseLeave={() => !isMobile && onIssueHover(null)}
              onClick={() => onIssueClick(issue.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  {issue.category?.replace(/_/g, ' ')}
                </span>
                
                {issue.distance !== undefined && issue.distance !== null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {issue.distance < 1 
                      ? `${Math.round(issue.distance * 1000)}m away` 
                      : `${issue.distance.toFixed(1)}km away`
                    }
                  </span>
                )}
              </div>
              
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                {issue.title}
              </h4>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IssueStatus status={issue.status} />
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  backgroundColor: `var(--${getSeverity(issue).toLowerCase()}-light, #f3f4f6)`,
                  color: `var(--${getSeverity(issue).toLowerCase()}-dark, #374151)`,
                  fontWeight: '500'
                }}>
                  {getSeverity(issue)}
                </span>
              </div>
              
              <IssueActionButtons issue={issue} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default NearbyIssueList;
