import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a real production app, we would log this to an error reporting service like Sentry
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-dark, #121212)',
          color: 'var(--text-primary, #ffffff)'
        }}>
          <div style={{
            background: 'var(--surface, #1e1e1e)',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ color: 'var(--error, #ef4444)', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={64} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '16px', fontWeight: 600 }}>Oops! Something went wrong.</h1>
            <p style={{ color: 'var(--text-secondary, #a1a1aa)', marginBottom: '32px' }}>
              We've encountered an unexpected error. Please try refreshing the page or come back later.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--primary-green, #8FEA63)',
                color: 'var(--dark-green, #1e3a10)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <RefreshCcw size={20} />
              Refresh Page
            </button>
            
            {/* Optional: Show error message in development mode only */}
            {import.meta.env.DEV && this.state.error && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', textAlign: 'left', overflowX: 'auto' }}>
                <code style={{ fontSize: '0.8rem', color: '#ff8a8a' }}>{this.state.error.toString()}</code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
