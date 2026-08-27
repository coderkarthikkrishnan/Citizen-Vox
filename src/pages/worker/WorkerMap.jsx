import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import CivicMapView from '../../components/map/CivicMapView';
import { useUserLocation } from '../../hooks/useUserLocation';

const WorkerMap = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userLocation, requestLocation } = useUserLocation();
  const navigate = useNavigate();

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'issues'),
          where('assignedWorkerId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const activeTasks = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          // Show only active tasks on the map
          if (data.status !== 'Resolved' && data.status !== 'closed' && data.latitude && data.longitude) {
            activeTasks.push({ id: doc.id, ...data });
          }
        });
        setTasks(activeTasks);
      } catch (err) {
        console.error("Failed to load worker tasks for map:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  const handleIssueClick = (id) => {
    navigate(`/worker/tasks/${id}`);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading map...</div>;
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', width: '100%', position: 'relative' }}>
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', background: 'rgba(255,255,255,0.9)', zIndex: 1000, backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-h2">My Assigned Tasks</h1>
        <p className="text-small text-muted">Showing {tasks.length} active locations</p>
      </header>
      
      <div style={{ height: '100%', paddingTop: '80px' }}>
        <CivicMapView 
          issues={tasks}
          userLocation={userLocation}
          onLocateMe={requestLocation}
          activeIssueId={null}
          onIssueClick={handleIssueClick}
        />
      </div>
    </div>
  );
};

export default WorkerMap;
