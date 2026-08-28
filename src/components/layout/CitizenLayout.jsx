import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusCircle, Map, User, Bell, LogOut, MapPin, List, Plus, FileText } from 'lucide-react';
import LanguageSelector from '../i18n/LanguageSelector';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import './Layout.css';

const CitizenLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navItems = [
    { icon: <MapPin size={20} />, label: t('nav.map'), path: '/citizen' },
    { icon: <PlusCircle size={24} />, label: t('nav.report'), path: '/citizen/report', primary: true },
    { icon: <List size={20} />, label: t('nav.activity'), path: '/citizen/issues' },
    { icon: <Bell size={20} />, label: 'Updates', path: '/citizen/notifications' },
    { icon: <User size={20} />, label: t('nav.profile'), path: '/citizen/profile' }
  ];

  const NavItemDesktop = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (to !== '/citizen' && location.pathname.startsWith(to));
    return (
      <Link 
        to={to} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
          background: isActive ? 'var(--surface-soft)' : 'transparent',
          fontWeight: isActive ? '600' : '500',
          transition: 'all 0.2s ease',
          fontSize: '0.875rem'
        }}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="app-layout citizen-layout">
      {/* Topbar for mobile/desktop */}
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="logo-brand">
          <Link to="/citizen" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              CV
            </div>
            <span className="logo-text hide-mobile" style={{ color: 'var(--text-primary)' }}>Citizen Vox</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="desktop-nav" style={{ display: 'none', gap: '4px', flex: 1, justifyContent: 'center' }}>
          <NavItemDesktop to="/citizen" icon={MapPin} label={t('nav.map')} />
          <NavItemDesktop to="/citizen/report" icon={PlusCircle} label={t('nav.report')} />
          <NavItemDesktop to="/citizen/issues" icon={List} label={t('nav.activity')} />
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSelector />
          <div className="avatar-placeholder" onClick={handleLogout} style={{ cursor: 'pointer' }} title="Logout">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'C'}
          </div>
        </div>
      </header>

      <main 
        className={`app-main citizen-main ${location.pathname === '/citizen/map' ? '' : 'container'}`}
        style={location.pathname === '/citizen/map' ? { padding: 0, height: 'calc(100vh - 64px)' } : {}}
      >
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      {(location.pathname !== '/citizen/report' && !location.pathname.match(/^\/citizen\/issues\/./)) && (
        <nav className="mobile-nav">
          <Link to="/citizen" className={`mobile-nav-item ${location.pathname === '/citizen' ? 'active' : ''}`}>
            <Home size={24} />
            <span className="nav-label">{t('nav.home')}</span>
          </Link>
          <Link to="/citizen/map" className={`mobile-nav-item ${location.pathname === '/citizen/map' ? 'active' : ''}`}>
            <Map size={24} />
            <span className="nav-label">{t('nav.map')}</span>
          </Link>
          
          <Link to="/citizen/report" className="mobile-nav-item primary-item">
            <Plus size={32} strokeWidth={2.5} />
            <span className="nav-label">{t('nav.report')}</span>
          </Link>
          
          <Link to="/citizen/issues" className={`mobile-nav-item ${location.pathname === '/citizen/issues' ? 'active' : ''}`}>
            <FileText size={24} />
            <span className="nav-label">{t('nav.activity')}</span>
          </Link>
          
          <Link to="/citizen/profile" className={`mobile-nav-item ${location.pathname === '/citizen/profile' ? 'active' : ''}`}>
            <User size={24} />
            <span className="nav-label">{t('nav.profile')}</span>
          </Link>
        </nav>
      )}

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav {
            display: flex !important;
          }
        }
        .hide-mobile {
          display: none;
        }
        @media (min-width: 769px) {
          .hide-mobile {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default CitizenLayout;
