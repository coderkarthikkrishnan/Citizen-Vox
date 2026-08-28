import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { gamificationService } from '../../services/gamificationService';
import { Award, Shield, Star, Zap, TrendingUp, Medal, Trophy, CheckCircle, Camera, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

import { useLanguage } from '../../hooks/useLanguage';

const CitizenProfile = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState({ xp: 0, badges: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [globalRank, setGlobalRank] = useState('#--');
  const [privacySettings, setPrivacySettings] = useState({
    shareLocation: true,
    visibilityRadius: 5 // miles
  });
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [fullLeaderboard, setFullLeaderboard] = useState([]);
  const [loadingFull, setLoadingFull] = useState(false);

  const openFullLeaderboard = async () => {
    setShowFullLeaderboard(true);
    setLoadingFull(true);
    try {
      const data = await gamificationService.getLeaderboard(50);
      setFullLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFull(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = gamificationService.subscribeToProfile(user.uid, (data) => {
        setProfile(data);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      const data = await gamificationService.getLeaderboard(5);
      
      // Ensure the current user is always included at the bottom if they aren't in the top 5
      if (user && !data.some(u => u.id === user.uid)) {
        // Just mock their rank for now as ">5" or similar if they aren't in top
        data.push({
          id: user.uid,
          rank: 'Your Rank',
          name: user.displayName || 'You',
          avatar: user.displayName ? user.displayName.charAt(0).toUpperCase() : 'Y',
          xp: profile.xp || 0,
          isCurrentUser: true
        });
      }
      
      setLeaderboard(data);
      setLoadingLeaderboard(false);
    };
    
    fetchLeaderboard();
  }, [user, profile.xp]); // Refetch if XP changes

  // Fetch actual Global Rank
  useEffect(() => {
    if (user?.uid && profile.xp !== undefined) {
      gamificationService.getUserRank(profile.xp).then(rank => {
        setGlobalRank(rank > 0 ? `#${rank}` : '#--');
      });
    }
  }, [user, profile.xp]);
  
  // Real-time gamification calculations
  const currentXP = profile.xp || 0;
  // Let's assume level formula: Level = Math.floor(sqrt(XP / 100)) + 1
  // Simple thresholds for hackathon:
  const level = Math.max(1, Math.floor(Math.sqrt(currentXP / 100)) + 1);
  const nextLevelXP = Math.pow(level, 2) * 100;
  const previousLevelXP = level === 1 ? 0 : Math.pow(level - 1, 2) * 100;
  
  const rank = level < 3 ? "Civic Novice" : level < 6 ? "Civic Guardian" : "City Champion";
  
  const badges = [
    { id: 1, name: "First Reporter", icon: <Camera size={24} />, description: "Submitted your first issue", earned: profile.badges?.includes(1), color: "var(--primary-green)", bg: "rgba(143,234,99,0.1)" },
    { id: 2, name: "Truth Seeker", icon: <CheckCircle size={24} />, description: "Verified an issue", earned: profile.badges?.includes(2), color: "var(--success)", bg: "rgba(99,216,78,0.1)" },
    { id: 3, name: "Local Hero", icon: <Shield size={24} />, description: "Resolved an issue in your neighborhood", earned: profile.badges?.includes(3), color: "var(--warning)", bg: "rgba(243,185,75,0.1)" },
    { id: 4, name: "Civic Expert", icon: <Award size={24} />, description: "Reach Level 10", earned: level >= 10 || profile.badges?.includes(4), color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    { id: 5, name: "Sharpshooter", icon: <Zap size={24} />, description: "High AI confidence score on reports", earned: profile.badges?.includes(5), color: "#9b59b6", bg: "rgba(155,89,182,0.1)" },
    { id: 6, name: "Top 10%", icon: <Star size={24} />, description: "Rank in the top 10% of users", earned: currentXP > 1000 || profile.badges?.includes(6), color: "#FFD700", bg: "rgba(255,215,0,0.1)" },
  ];

  const xpInCurrentLevel = currentXP - previousLevelXP;
  const xpNeededForNextLevel = nextLevelXP - previousLevelXP;
  const progressPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  return (
    <div style={{ paddingBottom: '40px' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-h2" style={{ marginBottom: '1.5rem' }}>{t('profile.title')}</h2>
      </motion.div>

      {/* User Header Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="card-premium" style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--near-black)', color: 'var(--white)' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-green)', color: 'var(--dark-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700, flexShrink: 0 }}>
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
        </div>
        
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3 className="text-h3" style={{ marginBottom: '0.25rem' }}>{user?.displayName || 'Citizen'}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Medal size={16} color="var(--warning)" /> {rank} • {t('profile.level')} {level}
          </p>
          
          {/* XP Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>{currentXP} XP</span>
              <span style={{ color: 'var(--text-secondary)' }}>{nextLevelXP} XP to {t('profile.level')} {level + 1}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{ height: '100%', background: 'var(--primary-green)', borderRadius: '4px' }} 
              />
            </div>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center', minWidth: '120px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{t('profile.globalRank')}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-green)' }}>{globalRank}</div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Badges Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Trophy size={20} color="var(--warning)" />
            <h3 className="text-h3">{t('profile.achievements')}</h3>
          </div>
          <div className="card-premium" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {badges.map(badge => (
              <div key={badge.id} style={{ 
                padding: '1rem', 
                borderRadius: '12px', 
                background: badge.earned ? 'var(--off-white)' : 'transparent',
                border: badge.earned ? '1px solid transparent' : '1px dashed var(--border-light)',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                textAlign: 'center',
                opacity: badge.earned ? 1 : 0.6,
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              className="badge-card"
              >
                <div style={{ 
                  width: '48px', height: '48px', 
                  borderRadius: '12px', 
                  background: badge.bg, 
                  color: badge.color, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  marginBottom: '0.75rem' 
                }}>
                  {badge.icon}
                </div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{badge.name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{badge.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={20} color="var(--primary-green)" />
            <h3 className="text-h3">{t('profile.leaderboard')}</h3>
          </div>
          <div className="card-premium" style={{ padding: '0' }}>
            {loadingLeaderboard ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available.</div>
            ) : (
              leaderboard.map((lbUser, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1rem 1.5rem', 
                  borderBottom: index < leaderboard.length - 1 ? '1px solid var(--border-light)' : 'none',
                  background: lbUser.isCurrentUser || lbUser.id === user?.uid ? 'rgba(143,234,99,0.05)' : 'transparent',
                  borderLeft: lbUser.isCurrentUser || lbUser.id === user?.uid ? '4px solid var(--primary-green)' : '4px solid transparent'
                }}>
                  <div style={{ width: '50px', fontWeight: 700, color: lbUser.rank <= 3 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    {typeof lbUser.rank === 'number' ? `#${lbUser.rank}` : lbUser.rank}
                  </div>
                  <div style={{ 
                    width: '32px', height: '32px', 
                    borderRadius: '50%', 
                    background: lbUser.isCurrentUser || lbUser.id === user?.uid ? 'var(--primary-green)' : 'var(--border-light)', 
                    color: lbUser.isCurrentUser || lbUser.id === user?.uid ? 'var(--dark-green)' : 'var(--text-primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '0.875rem', fontWeight: 600,
                    marginRight: '1rem' 
                  }}>
                    {lbUser.avatar}
                  </div>
                  <div style={{ flex: 1, fontWeight: lbUser.isCurrentUser || lbUser.id === user?.uid ? 700 : 500 }}>
                    {lbUser.name}
                    {(lbUser.isCurrentUser || lbUser.id === user?.uid) && <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', marginLeft: '0.5rem' }}>(You)</span>}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lbUser.xp.toLocaleString()} XP
                  </div>
                </div>
              ))
            )}
            
            <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-light)' }}>
              <span onClick={openFullLeaderboard} style={{ fontSize: '0.875rem', color: 'var(--primary-green)', fontWeight: 600, cursor: 'pointer' }}>View Global Rankings →</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Privacy Settings Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Lock size={20} color="var(--text-primary)" />
          <h3 className="text-h3">{t('profile.privacy')}</h3>
        </div>
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Location Sharing Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--near-black)', marginBottom: '4px' }}>{t('profile.verification')}</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{t('profile.verificationDesc')}</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input type="checkbox" checked={privacySettings.shareLocation} onChange={(e) => setPrivacySettings(prev => ({...prev, shareLocation: e.target.checked}))} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: privacySettings.shareLocation ? 'var(--primary-green)' : '#cbd5e1', transition: '.4s', borderRadius: '24px' }}>
                <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: privacySettings.shareLocation ? '30px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
              </span>
            </label>
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)' }}></div>

          {/* Visibility Radius Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--near-black)', marginBottom: '4px' }}>{t('profile.radius')}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{t('profile.radiusDesc')}</p>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--primary-green)', background: 'var(--off-white)', padding: '4px 12px', borderRadius: '16px' }}>
                {privacySettings.visibilityRadius} miles
              </div>
            </div>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={privacySettings.visibilityRadius} 
              onChange={(e) => setPrivacySettings(prev => ({...prev, visibilityRadius: parseInt(e.target.value)}))}
              disabled={!privacySettings.shareLocation}
              style={{ width: '100%', accentColor: 'var(--primary-green)', opacity: privacySettings.shareLocation ? 1 : 0.5 }}
            />
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            <Eye size={14} /> {t('profile.anonymized')}
          </div>

        </div>
      </motion.div>

      <style>{`
        .badge-card:hover {
          transform: translateY(-2px);
        }
      `}</style>

      {/* Global Rankings Modal */}
      {showFullLeaderboard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', width: '100%', maxWidth: '500px', maxHeight: '80vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--near-black)', color: 'white' }}>
              <h3 className="text-h3" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp color="var(--primary-green)" /> Global Rankings
              </h3>
              <button onClick={() => setShowFullLeaderboard(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              {loadingFull ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading all rankings...</div>
              ) : (
                fullLeaderboard.map((lbUser, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '1rem', 
                    borderBottom: index < fullLeaderboard.length - 1 ? '1px solid var(--border-light)' : 'none',
                    background: lbUser.id === user?.uid ? 'rgba(143,234,99,0.05)' : 'transparent',
                    borderRadius: '8px'
                  }}>
                    <div style={{ width: '40px', fontWeight: 700, color: lbUser.rank <= 3 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                      #{lbUser.rank}
                    </div>
                    <div style={{ 
                      width: '32px', height: '32px', 
                      borderRadius: '50%', 
                      background: lbUser.id === user?.uid ? 'var(--primary-green)' : 'var(--border-light)', 
                      color: lbUser.id === user?.uid ? 'var(--dark-green)' : 'var(--text-primary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '0.875rem', fontWeight: 600,
                      marginRight: '1rem' 
                    }}>
                      {lbUser.name ? lbUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ flex: 1, fontWeight: lbUser.id === user?.uid ? 700 : 500 }}>
                      {lbUser.name || 'Citizen'}
                      {lbUser.id === user?.uid && <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', marginLeft: '0.5rem' }}>(You)</span>}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {lbUser.xp.toLocaleString()} XP
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenProfile;
