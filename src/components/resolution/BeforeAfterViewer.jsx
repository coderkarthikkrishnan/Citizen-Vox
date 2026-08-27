import React, { useState } from 'react';

const BeforeAfterViewer = ({ beforeEvidence, afterEvidence, workDescription }) => {
  const [view, setView] = useState('split'); // split, before, after

  if (!beforeEvidence && !afterEvidence) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* Mobile/Compact controls */}
      <div style={{ display: 'flex', background: 'var(--surface-soft)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
        <button 
          onClick={() => setView('split')}
          style={{ flex: 1, padding: '8px', border: 'none', background: view === 'split' ? 'white' : 'transparent', borderRadius: '4px', fontWeight: view === 'split' ? '600' : '500', color: view === 'split' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: view === 'split' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer' }}
        >
          Compare
        </button>
        <button 
          onClick={() => setView('before')}
          style={{ flex: 1, padding: '8px', border: 'none', background: view === 'before' ? 'white' : 'transparent', borderRadius: '4px', fontWeight: view === 'before' ? '600' : '500', color: view === 'before' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: view === 'before' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer' }}
        >
          Before
        </button>
        <button 
          onClick={() => setView('after')}
          style={{ flex: 1, padding: '8px', border: 'none', background: view === 'after' ? 'white' : 'transparent', borderRadius: '4px', fontWeight: view === 'after' ? '600' : '500', color: view === 'after' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: view === 'after' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer' }}
        >
          After
        </button>
      </div>

      {/* Viewer Area */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: view === 'split' ? '1fr 1fr' : '1fr', 
        gap: '0.5rem',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        minHeight: '200px'
      }}>
        {(view === 'split' || view === 'before') && beforeEvidence && (
          <div style={{ position: 'relative', width: '100%', height: view === 'split' ? '200px' : '300px' }}>
            <img src={typeof beforeEvidence === 'string' ? beforeEvidence : beforeEvidence.url} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Before
            </div>
          </div>
        )}
        
        {(view === 'split' || view === 'after') && afterEvidence && (
          <div style={{ position: 'relative', width: '100%', height: view === 'split' ? '200px' : '300px' }}>
            <img src={typeof afterEvidence === 'string' ? afterEvidence : afterEvidence.url} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'var(--success)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              After
            </div>
          </div>
        )}
      </div>

      {/* Worker Notes */}
      {workDescription && (
        <div style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent)' }}>
          <h4 className="text-small" style={{ fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Worker Notes:</h4>
          <p className="text-body" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem', fontStyle: 'italic' }}>"{workDescription}"</p>
        </div>
      )}

    </div>
  );
};

export default BeforeAfterViewer;
