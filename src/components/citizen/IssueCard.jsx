import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { issueService } from '../../services/issueService';

const IssueCard = ({ issue, showConfidence = false, onDelete }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const priority = issue.priority?.level || 'Medium';
  const confidence = issue.confidenceScore || 0;
  
  const handleVerify = async (e, isVerified) => {
    e.preventDefault(); // prevent navigation
    const success = await issueService.verifyResolution(issue.id, isVerified);
    if (success) {
      alert(isVerified ? "Thank you for verifying! Issue Closed." : "Notified authorities. Issue escalated.");
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (window.confirm(t('action.confirmDelete') || "Are you sure you want to delete this issue?")) {
      setIsDeleting(true);
      const success = await issueService.deleteIssue(issue.id);
      if (success && onDelete) {
        onDelete(issue.id);
      }
      setIsDeleting(false);
    }
  };
  
  const getPriorityStyle = (level) => {
    switch(level?.toLowerCase()) {
      case 'critical': return { bg: 'var(--danger-soft)', color: 'var(--danger-dark)', border: 'var(--danger-light)' };
      case 'high': return { bg: 'var(--warning-light)', color: 'var(--warning-dark)', border: 'var(--warning)' };
      default: return { bg: 'var(--surface-soft)', color: 'var(--text-secondary)', border: 'var(--border)' };
    }
  };

  const pStyle = getPriorityStyle(priority);

  return (
    <Link to={`/citizen/issues/${issue.id}`} style={{ textDecoration: 'none' }}>
      <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Type Icon */}
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--near-black)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.25rem' }}>📍</span>
            </div>
            
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--near-black)', marginBottom: '2px', lineHeight: 1.2 }}>
                {issue.title || 'Civic Issue'}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '0.875rem' }}>📍</span> 
                {issue.location?.lat && issue.location?.lng 
                  ? `${issue.location.lat.toFixed(5)}, ${issue.location.lng.toFixed(5)}` 
                  : issue.location?.address || t('location.unknown')}
              </div>
            </div>
          </div>
          
          {user?.uid === issue.reportedBy && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isDeleting ? 0.5 : 1 }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
              {t(`severity.${priority.toLowerCase()}`) !== `severity.${priority.toLowerCase()}` ? t(`severity.${priority.toLowerCase()}`) : priority}
            </span>
            <span style={{ background: 'var(--surface-soft)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
              {t(`status.${(issue.status || 'reported').toLowerCase()}`) !== `status.${(issue.status || 'reported').toLowerCase()}` ? t(`status.${(issue.status || 'reported').toLowerCase()}`) : (issue.status || 'Reported')}
            </span>
          </div>

          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
             <ArrowRight size={16} />
          </div>
        </div>

        {/* Post-Resolution Verification Prompt */}
        {(issue.status === 'awaiting_final_verification' || issue.status === 'Awaiting Verification' || issue.status === 'Resolved' || issue.status === 'Verifying') && user && issue.reportedBy === user.uid && (
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '8px' }} onClick={(e) => {
            // Only stop propagation for the Yes button, let No button bubble to the link
            if (e.target.closest('.yes-btn')) {
              e.preventDefault();
            }
          }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--near-black)', margin: '0 0 8px 0' }}>Authorities marked this as resolved. Is it fixed?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="yes-btn"
                onClick={(e) => handleVerify(e, true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'var(--primary-green)', color: 'var(--near-black)', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <CheckCircle size={14} /> Yes, Fixed
              </button>
              <button 
                onClick={(e) => { /* let it bubble to the link to open IssueDetails */ }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                <XCircle size={14} /> No, Persists
              </button>
            </div>
          </div>
        )}

      </div>
    </Link>
  );
};

export default IssueCard;
