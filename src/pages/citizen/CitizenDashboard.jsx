import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, ShieldCheck, FileText, Activity, Star, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { issueService } from '../../services/issueService';
import IssueCard from '../../components/citizen/IssueCard';
import Button from '../../components/common/Button';

const CitizenDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Just fetch user's recent issues
      const issues = await issueService.getUserIssues(user.uid);
      setMyIssues(issues.slice(0, 3)); // Only show top 3 on dashboard
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getGreetingKey = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'dash.greeting.morning';
    if (hour < 17) return 'dash.greeting.afternoon';
    return 'dash.greeting.evening';
  };

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Greeting Area with Vibrant Gradient */}
      <div style={{ 
        padding: '32px 24px 24px', 
        background: 'linear-gradient(135deg, var(--near-black) 0%, #1a2a1f 100%)', 
        color: 'var(--white)', 
        borderRadius: '0 0 32px 32px', 
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        {/* Decorative background shapes */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(143,234,99,0.1)', filter: 'blur(30px)' }}></div>
        
        <button 
          onClick={handleLogout}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,85,85,0.1)', color: 'var(--danger-light)', border: '1px solid rgba(255,85,85,0.2)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', zIndex: 10 }}
        >
          <LogOut size={16} /> Log Out
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>{t(getGreetingKey())}</p>
          <h1 className="text-h2" style={{ marginBottom: '16px', fontSize: '2rem' }}>{user?.displayName || 'Citizen'} 👋</h1>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.9)', marginBottom: '24px', lineHeight: 1.5 }}>{t('dash.tagline')}</p>
          
          {/* Quick Stats Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-green)', marginBottom: '4px' }}>
                <Activity size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{t('dash.reportsCount')}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myIssues.length}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFD700', marginBottom: '4px' }}>
                <Star size={16} /> <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{t('dash.impactScore')}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myIssues.length * 10}</div>
            </div>
          </div>

          <Link to="/citizen/report" style={{ textDecoration: 'none', display: 'block' }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '16px', fontSize: '1.125rem', display: 'flex', justifyContent: 'center', gap: '8px', background: 'var(--primary-green)', color: 'var(--near-black)', border: 'none', borderRadius: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(143,234,99,0.3)' }}>
              <FileText size={20} /> {t('dash.reportBtn')}
            </motion.button>
          </Link>
        </motion.div>
      </div>

      <div style={{ padding: '0 24px' }}>
        
        {/* My Active Issues */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-h4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('dash.myIssues')}
              {myIssues.length > 0 && (
                <span style={{ background: 'var(--danger-soft)', color: 'var(--danger-dark)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{myIssues.length}</span>
              )}
            </h3>
            <Link to="/citizen/issues" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {t('dash.viewAll')} <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('dash.loading')}</div>
          ) : myIssues.length === 0 ? (
            <div className="card-premium" style={{ textAlign: 'center', padding: '2rem' }}>
              <ShieldCheck size={32} style={{ color: 'var(--primary-green)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>{t('dash.noIssues')}</p>
              <p className="text-small text-muted" style={{ marginTop: '4px' }}>{t('dash.noIssuesDesc')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>

        {/* Community Highlight */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="card-premium" style={{ background: 'linear-gradient(135deg, var(--near-black) 0%, #0a1f10 100%)', color: 'var(--white)', border: 'none', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', right: '-10%', bottom: '-20%', opacity: 0.1 }}>
            <MapPin size={120} />
          </div>

          <h3 className="text-h4" style={{ marginBottom: '8px', position: 'relative', zIndex: 1 }}>{t('dash.mapTitle')}</h3>
          <p className="text-small" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', position: 'relative', zIndex: 1, lineHeight: 1.5 }}>{t('dash.mapDesc')}</p>
          
          <Link to="/citizen/map" style={{ textDecoration: 'none', position: 'relative', zIndex: 1 }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--white)', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              {t('dash.exploreMap')}
            </motion.button>
          </Link>
        </motion.div>

      </div>
    </div>
  );
};

export default CitizenDashboard;
