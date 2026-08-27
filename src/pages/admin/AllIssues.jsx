import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authorityService } from '../../services/authorityService';
import { Link } from 'react-router-dom';
import { FileText, MapPin, Clock, ArrowRight, Filter } from 'lucide-react';

const AllIssues = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const data = await authorityService.getAllIssues(user);
      setIssues(data);
    } catch (err) {
      console.error("Failed to fetch all issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchIssues();
  }, [user]);

  const filteredIssues = issues.filter(issue => {
    if (filterCategory && issue.category !== filterCategory) return false;
    if (filterStatus && issue.status !== filterStatus) return false;
    if (filterPriority && (issue.priority?.level || 'Medium') !== filterPriority) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1">All Civic Reports</h1>
        <p className="text-muted">A comprehensive log of all raw citizen submissions.</p>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', alignItems: 'center' }}>
        <Filter size={20} color="var(--text-muted)" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <option value="">All Categories</option>
          <option value="roads">Roads & Transport</option>
          <option value="sanitation">Sanitation</option>
          <option value="water">Water Supply</option>
          <option value="drainage">Drainage</option>
          <option value="electrical">Electrical / Streetlights</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="verification_pending">Awaiting Verification</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {filteredIssues.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-h3">No civic issues found.</h3>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Try adjusting your filters or wait for citizens to report issues.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredIssues.map(issue => (
            <div key={issue.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '4px 8px', borderRadius: '4px' }}>
                    {issue.category?.replace('_', ' ')}
                  </span>
                  <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> {issue.status || 'Reported'}
                  </span>
                  {issue.priority && (
                     <span className="text-small" style={{ color: issue.priority.level === 'Critical' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                       {issue.priority.level}
                     </span>
                  )}
                </div>
                <h3 className="text-h3" style={{ marginBottom: '0.5rem' }}>{issue.title || 'Untitled Issue'}</h3>
                {issue.address && (
                  <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} /> {issue.address}
                  </span>
                )}
              </div>
              <div>
                <Link to={`/admin/issues/${issue.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--primary-green)', color: 'var(--near-black)', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                  View Report <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllIssues;
