import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authorityService } from '../../services/authorityService';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, MapPin, Users, Edit2, ChevronDown } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

const PriorityQueue = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  const TABS = ['All', 'Critical', 'High', 'Medium', 'Low'];

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const { issues } = await authorityService.getPriorityQueue(user, { status: 'All' }, 50);
        setIssues(issues);
      } catch (err) {
        console.error("Failed to load priority queue:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchQueue();
    }
  }, [user]);

  const handlePriorityChange = async (issue, newLevel) => {
    try {
      const collectionName = issue.isCluster ? 'issueClusters' : 'issues';
      const docRef = doc(db, collectionName, issue.id);
      
      let newScore = issue.priority?.finalScore || 0;
      if (newLevel === 'Critical') newScore = 95;
      else if (newLevel === 'High') newScore = 75;
      else if (newLevel === 'Medium') newScore = 50;
      else if (newLevel === 'Low') newScore = 20;

      await updateDoc(docRef, {
        'priority.level': newLevel,
        'priority.finalScore': newScore,
        'priority.aiContext': `Manually prioritized to ${newLevel} from queue`
      });

      // Optimistically update UI
      setIssues(prev => prev.map(i => {
        if (i.id === issue.id) {
          return {
            ...i,
            priority: {
              ...(i.priority || {}),
              level: newLevel,
              finalScore: newScore
            }
          };
        }
        return i;
      }).sort((a, b) => {
        // Re-sort after optimistic update
        const scoreA = a.priority?.finalScore || 0;
        const scoreB = b.priority?.finalScore || 0;
        return scoreB - scoreA;
      }));

    } catch (err) {
      console.error("Failed to update priority", err);
    }
  };

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
        <h1 className="text-h1">Priority Command Center</h1>
        <p className="text-muted">Issues ranked by the Citizen Vox Priority Engine.</p>
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: activeTab === tab ? 'var(--text-primary)' : 'var(--surface)',
              color: activeTab === tab ? 'white' : 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {issues.filter(issue => activeTab === 'All' || issue.priority?.level === activeTab || (issue.priority?.level === undefined && activeTab === 'Unrated')).length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <AlertCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 className="text-h3">No civic issues found.</h3>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Your jurisdiction currently has no reported issues.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {issues.filter(issue => activeTab === 'All' || issue.priority?.level === activeTab || (issue.priority?.level === undefined && activeTab === 'Unrated')).map((issue) => (
            <div key={issue.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={issue.priority?.level || 'Unrated'}
                      onChange={(e) => handlePriorityChange(issue, e.target.value)}
                      style={{
                        appearance: 'none',
                        padding: '0.25rem 1.75rem 0.25rem 0.75rem', 
                        borderRadius: 'var(--radius-full)', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: issue.priority?.level === 'Critical' ? 'var(--danger)' : 
                                    issue.priority?.level === 'High' ? 'var(--warning-dark)' :
                                    issue.priority?.level === 'Medium' ? '#d97706' :
                                    issue.priority?.level === 'Low' ? 'var(--success-dark)' : 'var(--surface-soft)',
                        color: issue.priority?.level ? 'white' : 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <option value="Unrated" disabled>UNRATED</option>
                      <option value="Critical">CRITICAL</option>
                      <option value="High">HIGH</option>
                      <option value="Medium">MEDIUM</option>
                      <option value="Low">LOW</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: issue.priority?.level ? 'white' : 'var(--text-secondary)' }} />
                  </div>
                  <span className="text-small text-muted" style={{ textTransform: 'uppercase' }}>{issue.category?.replace('_', ' ')}</span>
                  <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {issue.currentStatus}</span>
                </div>
                
                <h3 className="text-h3" style={{ marginBottom: '0.5rem' }}>{issue.title}</h3>
                
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  {issue.locationName && (
                    <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} /> {issue.locationName}
                    </span>
                  )}
                  <span className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Users size={14} /> {issue.reportCount || 1} Reports
                  </span>
                  {issue.assignedDepartment && (
                    <span className="text-small text-muted" style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      Dept: {issue.assignedDepartment}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Link 
                  to={`/admin/issues/${issue.id}`}
                  style={{ padding: '0.75rem 1.5rem', background: 'var(--text-primary)', color: 'white', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: '500', display: 'inline-block' }}
                >
                  View Issue
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PriorityQueue;
