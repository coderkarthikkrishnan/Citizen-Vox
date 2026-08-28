import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Button from '../common/Button';
import './Layout.css';

const PublicLayout = () => {
  return (
    <div className="app-layout public-layout">
      <header className="public-header">
        <Link to="/" style={{ textDecoration: 'none' }} className="logo-brand">
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-green)', color: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="logo-text">Citizen Vox</span>
        </Link>
        
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="hide-mobile">
          <Link to="/" style={{ color: 'var(--white)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>Home</Link>
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>How It Works</a>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>Features</a>
          <a href="#dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>Dashboard</a>
          <a href="#about-us" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500 }}>About Us</a>
        </nav>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'var(--white)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 600 }} className="hide-mobile">Login</Link>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="md">Report an Issue</Button>
          </Link>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ textAlign: 'left', maxWidth: '300px' }}>
            <div className="logo-brand" style={{ marginBottom: '1rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--primary-green)', color: 'var(--near-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span className="logo-text" style={{ fontSize: '1rem' }}>Citizen Vox</span>
            </div>
            <p className="text-small text-muted" style={{ color: 'var(--text-secondary)' }}>A smarter way to build cleaner, safer and better cities together.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '4rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--white)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Platform</h4>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Home</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>How It Works</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Features</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ color: 'var(--white)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Resources</h4>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Help Center</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Guidelines</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Privacy Policy</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default PublicLayout;
