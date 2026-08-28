import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analyticsService';
import { workerService } from '../../services/workerService';
import { auditService } from '../../services/auditService';
import { Plus, Edit2, UserX, Activity, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Workers = () => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getWorkerMetrics(user?.municipalityId);
      setWorkers(data);
    } catch (error) {
      console.error("Failed to load workers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchWorkers();
  }, [user]);

  const handleDeactivate = async (worker) => {
    if (!window.confirm(`Are you sure you want to deactivate ${worker.name}? They will not receive new tasks.`)) return;
    try {
      await workerService.deactivateWorker(worker.id);
      await auditService.logAction(user.uid, user.role, 'DEACTIVATE_WORKER', 'user', worker.id);
      fetchWorkers();
    } catch (err) {
      alert("Failed to deactivate worker.");
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-h1">Worker Management</h1>
          <p className="text-muted">Manage field workers and view workload metrics.</p>
        </div>
        <button 
          onClick={() => { setEditingWorker(null); setIsModalOpen(true); }}
          style={{ background: 'var(--primary-green)', color: 'var(--near-black)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} /> Add Worker
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading workers...</div>
      ) : workers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-muted">No workers found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {workers.map((w, index) => (
            <motion.div 
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
              style={{ 
                background: 'var(--surface)', 
                border: '1px solid var(--border)', 
                borderRadius: '16px', 
                padding: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Premium Accent Glow */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: w.status === 'inactive' ? 'var(--danger)' : 'var(--primary-green)',
                opacity: 0.1,
                filter: 'blur(40px)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '14px', 
                    flexShrink: 0,
                    background: w.status === 'inactive' ? 'var(--bg-main)' : 'linear-gradient(135deg, var(--primary-green), var(--accent))', 
                    color: w.status === 'inactive' ? 'var(--text-secondary)' : 'var(--near-black)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '700',
                    fontSize: '1.25rem',
                    border: w.status === 'inactive' ? '1px solid var(--border)' : 'none',
                    boxShadow: w.status === 'inactive' ? 'none' : '0 4px 12px rgba(0,255,157, 0.25)'
                  }}>
                    {w.name?.charAt(0).toUpperCase() || 'W'}
                  </div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.email}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button 
                    onClick={() => { setEditingWorker(w); setIsModalOpen(true); }} 
                    style={{ padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--primary)'; }} 
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    title="Edit Worker"
                  >
                    <Edit2 size={16} />
                  </button>
                  {w.status !== 'inactive' && (
                    <button 
                      onClick={() => handleDeactivate(w)} 
                      style={{ padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--danger)', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,85,85,0.1)'; e.currentTarget.style.borderColor = 'var(--danger)'; }} 
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      title="Deactivate Worker"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ 
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '20px', 
                  background: w.status === 'inactive' ? 'rgba(255,85,85,0.1)' : 'rgba(0,255,157,0.1)', 
                  color: w.status === 'inactive' ? 'var(--danger)' : 'var(--primary-green)', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  border: `1px solid ${w.status === 'inactive' ? 'rgba(255,85,85,0.2)' : 'rgba(0,255,157,0.2)'}`,
                  display: 'inline-block'
                }}>
                  {w.status === 'inactive' ? 'INACTIVE' : 'AVAILABLE'}
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '0.75rem', 
                position: 'relative', 
                zIndex: 1 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.75rem', 
                  padding: '1rem', 
                  background: 'var(--bg-main)', 
                  border: '1px solid var(--border)',
                  borderRadius: '12px' 
                }}>
                  <div style={{ background: 'rgba(20,20,20,0.05)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary)', display: 'flex' }}>
                    <Activity size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                      {w.activeTasks || 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Active Tasks
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.75rem', 
                  padding: '1rem', 
                  background: 'var(--bg-main)', 
                  border: '1px solid var(--border)',
                  borderRadius: '12px' 
                }}>
                  <div style={{ background: 'rgba(0,255,157,0.1)', padding: '0.5rem', borderRadius: '8px', color: 'var(--primary-green)', display: 'flex' }}>
                    <CheckCircle size={18} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                      {w.completedTasks || 0}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <WorkerModal 
            worker={editingWorker} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => { setIsModalOpen(false); fetchWorkers(); }} 
            adminUser={user} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const WorkerModal = ({ worker, onClose, onSuccess, adminUser }) => {
  const [formData, setFormData] = useState(worker || { name: '', email: '', phone: '', departmentId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (worker) {
        await workerService.updateWorker(worker.id, {
          name: formData.name,
          phone: formData.phone,
          departmentId: formData.departmentId
        });
        await auditService.logAction(adminUser.uid, adminUser.role, 'UPDATE_WORKER', 'user', worker.id);
        onSuccess();
      } else {
        const result = await workerService.createWorker({ ...formData, municipalityId: adminUser.municipalityId });
        await auditService.logAction(adminUser.uid, adminUser.role, 'CREATE_WORKER', 'user', result.uid);
        setGeneratedPassword(result.tempPassword);
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use' || err.message.includes('email-already-in-use')) {
        setError("This email address is already registered to another user. Please use a different email.");
      } else if (err.code === 'auth/invalid-email' || err.message.includes('invalid-email')) {
        setError("The email address is invalid.");
      } else {
        setError(err.message || "An error occurred while saving the worker.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (generatedPassword) {
    return (
      <ModalOverlay>
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }}>
          <h2 className="text-h2" style={{ color: 'var(--success)', marginBottom: '1rem' }}>Worker Created Successfully</h2>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>Please share this temporary password with the worker securely. They can log in immediately.</p>
          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '1.25rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            {generatedPassword}
          </div>
          <button onClick={onSuccess} style={{ width: '100%', padding: '0.75rem', background: 'var(--primary-green)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay>
      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '500px' }}>
        <h2 className="text-h2" style={{ marginBottom: '1.5rem' }}>{worker ? 'Edit Worker' : 'Add New Worker'}</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Full Name *</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address * {worker && '(Cannot be changed)'}</label>
            <input required type="email" disabled={!!worker} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Phone Number</label>
            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Department ID *</label>
            <input required type="text" placeholder="e.g., roads, water" value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', background: 'var(--near-black)', color: 'var(--primary-green)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Saving...' : 'Save Worker'}</button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};

const ModalOverlay = ({ children }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      {children}
    </motion.div>
  </div>
);

export default Workers;
