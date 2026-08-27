import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { User, Mail, Briefcase, CheckCircle, Clock, MapPin, Award, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const WorkerProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [workerInfo, setWorkerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!user) return;
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setWorkerInfo(userDoc.data());
        }

        const q = query(
          collection(db, 'issues'), 
          where('assignedWorkerId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        let active = 0;
        let completed = 0;
        const tasks = [];

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.status === 'Resolved' || data.status === 'closed') {
            completed++;
          } else {
            active++;
          }
          tasks.push({ id: docSnap.id, ...data });
        });

        tasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setStats({ active, completed });
        setRecentTasks(tasks.slice(0, 5));
      } catch (err) {
        console.error("Failed to load worker profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading profile...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, var(--surface) 0%, rgba(20,20,20,0.8) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '2rem',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          position: 'relative'
        }}
      >
        <button 
          onClick={handleLogout}
          style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,85,85,0.1)', color: 'var(--danger)', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
        >
          <LogOut size={16} /> Log Out
        </button>

        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'var(--primary-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--near-black)',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          {(workerInfo?.name || user?.displayName || 'W').charAt(0).toUpperCase()}
        </div>
        
        <div style={{ flex: 1 }}>
          <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>{workerInfo?.name || user?.displayName || 'Worker'}</h1>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> {user?.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={16} /> {workerInfo?.departmentId || user?.departmentId || 'General Department'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={16} /> Field Staff</span>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}
        >
          <Clock size={32} color="var(--accent)" style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.active}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Tasks</div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', textAlign: 'center' }}
        >
          <CheckCircle size={32} color="var(--primary-green)" style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.completed}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks Resolved</div>
        </motion.div>
      </div>

      <h2 className="text-h2" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MapPin size={24} color="var(--primary-green)" /> Recent Assignments
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recentTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
            <p className="text-muted">No recent tasks assigned.</p>
          </div>
        ) : (
          recentTasks.map((task, index) => (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (index * 0.1) }}
              style={{
                background: 'var(--surface)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 className="text-h3" style={{ marginBottom: '0.25rem' }}>{task.title}</h3>
                <p className="text-small text-muted">{task.address || 'Location provided'}</p>
              </div>
              <div style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '2rem', 
                background: task.status === 'Resolved' || task.status === 'closed' ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: task.status === 'Resolved' || task.status === 'closed' ? 'var(--primary-green)' : 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {task.status?.replace('_', ' ').toUpperCase()}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkerProfile;
