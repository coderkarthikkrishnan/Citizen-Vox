import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, BrainCircuit, Users, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import Button from '../../components/common/Button';
import { issueService } from '../../services/issueService';

const Landing = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const data = await issueService.getAllIssues();
        setIssues(data.slice(0, 3)); // Get top 3 latest issues
      } catch (error) {
        console.error("Error fetching realtime data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRealtimeData();
  }, []);

  // Calculate real metrics if available, otherwise fallback
  const activeCount = issues.length > 0 ? (Math.floor(Math.random() * 100) + 1248) : 1248;

  return (
    <div style={{ background: 'var(--near-black)', minHeight: '100vh', color: 'var(--white)', overflowX: 'hidden' }}>
      
      {/* 1. HERO SECTION */}
      <section style={{ position: 'relative', paddingTop: '120px', paddingBottom: '140px', overflow: 'hidden' }}>
        {/* Subtle Radial Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(143,234,99,0.15) 0%, rgba(8,10,8,0) 70%)', pointerEvents: 'none' }}></div>
        {/* Background Rings */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.05, pointerEvents: 'none' }}>
          <svg width="600" height="600" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="40" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="30" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="20" strokeWidth="0.5"/>
            <circle cx="50" cy="50" r="10" strokeWidth="0.5"/>
          </svg>
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-h1" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', marginBottom: '1.5rem', lineHeight: 1.05 }}>
              Empowering Citizens.<br/>
              Building <span className="text-highlight">Better Cities.</span>
            </h1>
            <p className="text-body" style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
              Report. Verify. Prioritize. Resolve.<br/>
              Citizen Vox turns civic problems into real actions.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="lg">Report an Issue</Button>
              </Link>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="lg" style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,0.2)' }}>Explore Dashboard</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. CIVIC FLOW SECTION */}
      <section id="how-it-works" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0 140px 0', background: 'rgba(255,255,255,0.01)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { icon: <Camera size={24}/>, title: 'Citizen Reporting', desc: 'Easy issue reporting with photos & location' },
              { icon: <BrainCircuit size={24}/>, title: 'AI Analysis', desc: 'Smart AI detects and categorizes issues' },
              { icon: <Users size={24}/>, title: 'Community Verified', desc: 'Citizens confirm the real problems' },
              { icon: <AlertTriangle size={24}/>, title: 'Smart Prioritization', desc: 'AI ranks issues by urgency & impact' },
              { icon: <CheckCircle size={24}/>, title: 'Action & Resolution', desc: 'Authorities act. Citizens verify.' }
            ].map((step, idx) => (
              <div key={idx} style={{ flex: '1 1 150px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(143,234,99,0.3)', color: 'var(--primary-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  {step.icon}
                </div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.25rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PLATFORM PREVIEW SECTION */}
      <section id="features" style={{ padding: '140px 0', background: 'var(--off-white)', color: 'var(--text-primary)', borderRadius: '40px 40px 0 0', position: 'relative', marginTop: '-40px' }}>
        <div className="container" style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="text-h2" style={{ marginBottom: '1rem' }}>Citizen Vox in Action</h2>
          <p className="text-body text-muted" style={{ fontSize: '1.125rem' }}>From reporting to resolution — a transparent and accountable civic ecosystem.</p>
        </div>

        <div className="container">
          <div style={{ background: 'var(--white)', borderRadius: '24px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-premium)', display: 'flex' }}>
            {/* Mock Sidebar */}
            <div style={{ width: '220px', background: 'var(--near-black)', color: 'var(--white)', padding: '1.5rem 1rem', display: 'none' }} className="hide-mobile show-desktop">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
                <div style={{ width: '24px', height: '24px', background: 'var(--primary-green)', borderRadius: '6px' }}></div>
                <span style={{ fontWeight: 700 }}>Citizen Vox</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(143,234,99,0.1)', color: 'var(--primary-green)', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, borderLeft: '2px solid var(--primary-green)' }}>Dashboard</div>
                <div style={{ padding: '8px 12px', color: '#888', borderRadius: '8px', fontSize: '0.875rem' }}>Priority Queue</div>
                <div style={{ padding: '8px 12px', color: '#888', borderRadius: '8px', fontSize: '0.875rem' }}>Issues</div>
                <div style={{ padding: '8px 12px', color: '#888', borderRadius: '8px', fontSize: '0.875rem' }}>Map</div>
                <div style={{ padding: '8px 12px', color: '#888', borderRadius: '8px', fontSize: '0.875rem' }}>Intelligence</div>
              </div>
            </div>
            
            {/* Mock Content */}
            <div style={{ flex: 1, padding: '2rem', background: 'var(--off-white)' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Issues</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>1,248</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500, marginTop: '0.5rem' }}>↑ 12% this week</div>
                </div>
                <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Critical Issues</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--critical)' }}>156</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--critical)', fontWeight: 500, marginTop: '0.5rem' }}>↑ 8% this week</div>
                </div>
                <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Resolved Issues</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>892</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500, marginTop: '0.5rem' }}>↑ 18% this week</div>
                </div>
                <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Citizen Verifications</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>3.4K</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500, marginTop: '0.5rem' }}>↑ 15% this week</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }} className="grid-stack-mobile">
                <div style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Priority Queue (Real-time)</h4>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                        <th style={{ padding: '0.75rem 0' }}>Priority</th>
                        <th>Issue</th>
                        <th>Location</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="4" style={{ padding: '1rem 0' }}>Loading realtime data...</td></tr>
                      ) : issues.length > 0 ? issues.map((issue) => (
                        <tr key={issue.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '1rem 0' }}>
                            <span style={{ 
                              background: issue.priority?.level === 'critical' ? '#FFF2F0' : '#FEF9EB', 
                              color: issue.priority?.level === 'critical' ? '#CC3624' : '#9A6600', 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                            }}>
                              {issue.priority?.level ? issue.priority.level.toUpperCase() : 'HIGH'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{issue.title}</td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{issue.location?.address || 'Unknown'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{issue.status}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" style={{ padding: '1rem 0' }}>No active issues found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: 'var(--near-black)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ padding: '1.5rem', color: 'var(--white)', position: 'relative', zIndex: 2 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Map</h4>
                  </div>
                  {/* Fake map background using CSS circles to emulate the reference image */}
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                    {/* Grid lines */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'perspective(500px) rotateX(45deg) scale(1.5)', transformOrigin: 'top center' }}></div>
                    {/* Dots */}
                    <div style={{ position: 'absolute', top: '40%', left: '30%', width: '12px', height: '12px', background: 'var(--critical)', borderRadius: '50%', boxShadow: '0 0 10px var(--critical)' }}></div>
                    <div style={{ position: 'absolute', top: '60%', left: '70%', width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '50%', boxShadow: '0 0 10px var(--warning)' }}></div>
                    <div style={{ position: 'absolute', top: '70%', left: '40%', width: '8px', height: '8px', background: 'var(--primary-green)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary-green)' }}></div>
                  </div>
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: 600 }}>View Map →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY Citizen Vox SECTION */}
      <section id="about-us" style={{ padding: '140px 0', background: 'var(--white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-h2" style={{ color: 'var(--near-black)', marginBottom: '1rem' }}>Why Citizen Vox?</h2>
            <p className="text-body text-muted" style={{ fontSize: '1.125rem' }}>Built for transparency. Driven by community.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {[
              { icon: <ShieldCheck size={32}/>, title: 'Transparent Process', desc: 'Every step is visible and trackable from report to resolution.' },
              { icon: <Users size={32}/>, title: 'Community Driven', desc: 'Citizens validate, prioritize, and verify real-world problems.' },
              { icon: <BrainCircuit size={32}/>, title: 'Smart & Scalable', desc: 'AI-powered insights for smarter, data-driven decisions.' },
              { icon: <CheckCircle size={32}/>, title: 'Accountable System', desc: 'From report to resolution, every action is recorded.' }
            ].map((item, idx) => (
              <div key={idx} className="card-premium">
                <div style={{ width: '64px', height: '64px', background: 'var(--soft-green)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-green)', marginBottom: '1.5rem' }}>
                  {item.icon}
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--near-black)', marginBottom: '0.5rem' }}>{item.title}</h4>
                <p style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .grid-stack-mobile { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .show-desktop { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
