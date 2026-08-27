import React, { useState } from 'react';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import IssueStatus from '../citizen/IssueStatus';

const STATUSES = [
  { value: 'reported', label: 'Reported' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'reopened', label: 'Reopened' }
];

const StatusControl = ({ issue, onUpdate }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState(issue?.status || issue?.currentStatus || 'reported');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStatus = issue?.status || issue?.currentStatus || 'reported';

  const handleUpdate = async () => {
    if (status === currentStatus) return;
    
    setLoading(true);
    setError('');
    try {
      await workflowService.changeStatus(issue.id, currentStatus, status, user.uid, note, !issue.isCluster);
      setNote('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Status update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="text-h3" style={{ margin: 0 }}>Operational Status</h3>
        <IssueStatus status={currentStatus} />
      </div>
      
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        
        {status !== currentStatus && (
          <textarea 
            placeholder="Add a status update note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '80px', resize: 'vertical' }}
          />
        )}

        <Button 
          variant="outline" 
          onClick={handleUpdate} 
          disabled={loading || status === currentStatus} 
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </div>
    </div>
  );
};

export default StatusControl;
