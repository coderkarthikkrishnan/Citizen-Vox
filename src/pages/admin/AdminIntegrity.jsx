import React from 'react';
import { ShieldCheck, ShieldAlert, Activity, Users } from 'lucide-react';

const AdminIntegrity = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck color="var(--primary-green)" /> Platform Integrity & Trust
        </h1>
        <p className="text-muted">Monitoring user trust scores and anti-spam protection systems.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="text-small text-muted text-uppercase">Spam Prevention</p>
            <ShieldAlert size={20} color="var(--success)" />
          </div>
          <div className="text-h2" style={{ color: 'var(--success)' }}>98.4%</div>
          <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>Spam accurately blocked</p>
        </div>
        
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="text-small text-muted text-uppercase">Avg Trust Score</p>
            <Activity size={20} color="var(--primary-green)" />
          </div>
          <div className="text-h2" style={{ color: 'var(--primary-green)' }}>92/100</div>
          <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>Platform-wide average</p>
        </div>

        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p className="text-small text-muted text-uppercase">Verified Users</p>
            <Users size={20} color="var(--text-primary)" />
          </div>
          <div className="text-h2">1,245</div>
          <p className="text-small text-muted" style={{ marginTop: '0.5rem' }}>Users with KYC complete</p>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '2rem' }}>
        <h3 className="text-h3" style={{ marginBottom: '1.5rem' }}>Recent Flagged Activity</h3>
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
          <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <p className="text-muted">No suspicious activity detected in the last 24 hours.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminIntegrity;
