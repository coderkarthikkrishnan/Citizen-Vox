import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Truck, Trash2, Droplet, Waves, Zap, Users, Clock, AlertCircle, X, CheckCircle, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CORE_DEPARTMENTS = [
  { 
    id: 'roads', 
    name: 'Roads & Transport', 
    desc: 'Potholes, damaged roads, sidewalks, bridges',
    icon: Truck,
    sla: '72h Resolution Target',
    color: 'var(--primary-green)'
  },
  { 
    id: 'sanitation', 
    name: 'Sanitation', 
    desc: 'Garbage dumping, overflowing bins, unhygienic spots',
    icon: Trash2,
    sla: '24h Resolution Target',
    color: 'var(--accent)'
  },
  { 
    id: 'water', 
    name: 'Water Supply', 
    desc: 'Pipeline leaks, drinking water supply issues',
    icon: Droplet,
    sla: '24h Resolution Target',
    color: '#00d2ff'
  },
  { 
    id: 'drainage', 
    name: 'Drainage', 
    desc: 'Sewage overflow, stormwater blockages, waterlogging',
    icon: Waves,
    sla: '48h Resolution Target',
    color: '#6366f1'
  },
  { 
    id: 'electrical', 
    name: 'Electrical', 
    desc: 'Broken streetlights, exposed wiring, power hazards',
    icon: Zap,
    sla: '48h Resolution Target',
    color: '#f59e0b'
  }
];

const Departments = () => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    setLoading(true);
    try {
      const legacyIds = {
        'roads': ['roads', 'road', 'road_damage', 'Roads & Transport'],
        'sanitation': ['sanitation', 'garbage', 'Sanitation'],
        'water': ['water', 'water_leakage', 'Water Supply'],
        'drainage': ['drainage', 'Drainage'],
        'electrical': ['electrical', 'streetlight', 'Electrical / Streetlights', 'Electrical']
      };
      const searchIds = legacyIds[dept.id] || [dept.id];

      const q = query(
        collection(db, 'users'),
        where('role', '==', 'worker'),
        where('departmentId', 'in', searchIds)
      );
      const snapshot = await getDocs(q);
      const fetchedWorkers = [];
      snapshot.forEach(doc => {
        fetchedWorkers.push({ id: doc.id, ...doc.data() });
      });
      setWorkers(fetchedWorkers);
    } catch (err) {
      console.error("Failed to fetch department workers:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-h1">Department Management</h1>
        <p className="text-muted">Oversee operational taxonomy and field worker deployments.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDept ? '1fr 400px' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
        
        {/* Departments Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignContent: 'start' }}>
          {CORE_DEPARTMENTS.map((dept, index) => {
            const Icon = dept.icon;
            const isSelected = selectedDept?.id === dept.id;
            
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, boxShadow: `0 10px 30px ${dept.color}20` }}
                onClick={() => handleSelectDept(dept)}
                style={{
                  background: isSelected ? 'linear-gradient(145deg, var(--surface) 0%, rgba(20,20,20,0.8) 100%)' : 'var(--surface)',
                  border: isSelected ? `1px solid ${dept.color}` : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${dept.color}15`, color: dept.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-h3" style={{ marginBottom: '0.25rem' }}>{dept.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      <Clock size={12} /> {dept.sla}
                    </div>
                  </div>
                </div>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  {dept.desc}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="var(--text-muted)" /> View Personnel
                  </span>
                  {isSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dept.color }} />}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Department Panel */}
        <AnimatePresence>
          {selectedDept && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 120px)',
                position: 'sticky',
                top: '2rem'
              }}
            >
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <selectedDept.icon size={24} color={selectedDept.color} />
                    {selectedDept.name} Personnel
                  </h2>
                  <p className="text-small text-muted">{workers.length} registered field workers</p>
                </div>
                <button 
                  onClick={() => setSelectedDept(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading workforce data...</div>
                ) : workers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                    <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                    <p className="text-muted">No field workers registered for {selectedDept.name}.</p>
                  </div>
                ) : (
                  workers.map((worker, index) => (
                    <motion.div 
                      key={worker.id}
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
                        background: worker.status === 'inactive' ? 'var(--danger)' : 'var(--primary-green)',
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
                            background: worker.status === 'inactive' ? 'var(--bg-main)' : 'linear-gradient(135deg, var(--primary-green), var(--accent))', 
                            color: worker.status === 'inactive' ? 'var(--text-secondary)' : 'var(--near-black)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: '700',
                            fontSize: '1.25rem',
                            border: worker.status === 'inactive' ? '1px solid var(--border)' : 'none',
                            boxShadow: worker.status === 'inactive' ? 'none' : '0 4px 12px rgba(0,255,157, 0.25)'
                          }}>
                            {worker.name?.charAt(0).toUpperCase() || 'W'}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {worker.name}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {worker.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <div style={{ 
                          padding: '0.35rem 0.85rem', 
                          borderRadius: '20px', 
                          background: worker.status === 'inactive' ? 'rgba(255,85,85,0.1)' : 'rgba(0,255,157,0.1)', 
                          color: worker.status === 'inactive' ? 'var(--danger)' : 'var(--primary-green)', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          border: `1px solid ${worker.status === 'inactive' ? 'rgba(255,85,85,0.2)' : 'rgba(0,255,157,0.2)'}`,
                          display: 'inline-block'
                        }}>
                          {worker.status === 'inactive' ? 'INACTIVE' : 'AVAILABLE'}
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
                            <Briefcase size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                              {worker.activeTasks || 0}
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
                              {worker.completedTasks || 0}
                            </div>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.5px', fontWeight: 600 }}>
                              Completed
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Departments;
