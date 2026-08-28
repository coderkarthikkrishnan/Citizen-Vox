import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle, PieChart, Clock, ShieldCheck, ShieldAlert, Users, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, query, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { resolutionDurabilityService } from '../../services/resolutionDurabilityService';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [integrityStats, setIntegrityStats] = useState(null);
  const [durabilityMetrics, setDurabilityMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user) return;
        
        // Import analyticsService dynamically
        const { analyticsService } = await import('../../services/analyticsService');
        
        // Execute all heavy fetches concurrently
        const [
          analyticsData,
          totalUsersSnap,
          flaggedSnap,
          durabilityData
        ] = await Promise.all([
          analyticsService.getAdminDashboardMetrics(user.municipalityId, user.departmentId),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'integrity_reports'), where('resolved', '==', false))),
          resolutionDurabilityService.getDurabilityMetrics(user)
        ]);
        
        setMetrics(analyticsData);
        setIntegrityStats({
          totalUsers: totalUsersSnap.data().count,
          flaggedIssues: flaggedSnap.data().count,
        });
        setDurabilityMetrics(durabilityData);

      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!metrics || !integrityStats || !durabilityMetrics) return null;

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>Citizen Vox Command Center</h1>
        <p className="text-muted">Global Platform Governance & Intelligence</p>
      </header>

      {/* --- SECTION 1: CORE KPIs --- */}
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Activity />} label="Total Issues" value={metrics.total || 0} />
        <StatCard icon={<AlertTriangle color="var(--danger)" />} label="Critical Issues" value={metrics.critical || 0} />
        <StatCard icon={<CheckCircle color="var(--success)" />} label="Resolved Issues" value={metrics.resolved || 0} />
        <StatCard icon={<PieChart />} label="Resolution Rate" value={`${metrics.resolutionRate || 0}%`} />
        
        {/* Integrity KPIs */}
        <StatCard icon={<Users color="var(--primary-green)" />} label="Platform Users" value={integrityStats.totalUsers} />
        <StatCard 
          icon={<ShieldAlert color={integrityStats.flaggedIssues > 0 ? 'var(--danger)' : 'var(--success)'} />} 
          label="Flagged Reports" 
          value={integrityStats.flaggedIssues} 
        />
      </div>

      {/* --- SECTION 2: CHARTS & BREAKDOWNS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Category Breakdown */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h3 className="text-h3" style={{ marginBottom: '1.5rem' }}>Category Breakdown</h3>
          {Object.keys(metrics.categories).length === 0 ? (
             <p className="text-muted">No data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(metrics.categories)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => {
                  const percentage = Math.round((count / metrics.total) * 100);
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{category.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{count} ({percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary-green)' }}></div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>

        {/* Department Workload */}
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <h3 className="text-h3" style={{ marginBottom: '1.5rem' }}>Department Workload</h3>
          {Object.keys(metrics.departments).length === 0 ? (
             <p className="text-muted">No data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(metrics.departments)
                .sort(([,a], [,b]) => b - a)
                .map(([dept, count]) => {
                  const percentage = Math.round((count / metrics.total) * 100);
                  return (
                    <div key={dept}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{dept.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{count} ({percentage}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)' }}></div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 3: DURABILITY & REOPENED ISSUES --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <CheckCircle color="var(--primary-green)"/> Resolution Durability
          </h3>
          
          <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-h1" style={{ color: 'var(--primary-green)' }}>{durabilityMetrics.durability}%</div>
            <p className="text-small text-muted text-uppercase" style={{ marginTop: '0.5rem' }}>Durability Score</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">Citizen Approval</span>
            <span style={{ fontWeight: 600 }}>{durabilityMetrics.approvalRate}%</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">Avg Resolution Time</span>
            <span style={{ fontWeight: 600 }}>{durabilityMetrics.avgResolutionTime}h</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
            <span className="text-muted">Reopened Issues</span>
            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{durabilityMetrics.reopened}</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '2rem' }}>
          <h3 className="text-h3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert color="var(--warning)" /> Problematic Resolutions
          </h3>
          
          {durabilityMetrics.problemIssues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
              <p className="text-muted">Excellent. No issues have been repeatedly reopened.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {durabilityMetrics.problemIssues.map(issue => (
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
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ 
      background: 'var(--surface)', 
      padding: '1.5rem', 
      borderRadius: 'var(--radius-lg)', 
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)'
    }}
  >
    <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
      {icon}
    </div>
    <div>
      <p className="text-small text-muted">{label}</p>
      <p className="text-h2">{value}</p>
    </div>
  </motion.div>
);

export default AdminDashboard;
