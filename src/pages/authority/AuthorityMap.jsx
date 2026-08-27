import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authorityService } from '../../services/authorityService';
import IssueStatus from '../../components/citizen/IssueStatus';
import PriorityBadge from '../../components/priority/PriorityBadge';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers based on Priority
const createIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const icons = {
  Critical: createIcon('#ef4444'),
  High: createIcon('#f97316'),
  Medium: createIcon('#f59e0b'),
  Low: createIcon('#10b981'),
  Default: createIcon('#3b82f6')
};

const AuthorityMap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Focus on a default city center, in a real app this would be dynamically set to the authority's jurisdiction
  const center = { lat: 11.1271, lng: 78.6569 }; // Tamil Nadu, India

  useEffect(() => {
    const fetchMapData = async () => {
      if (!user) return;
      try {
        // Fetch up to 200 recent active issues for the map
        const result = await authorityService.getPriorityQueue(user, { status: 'All' }, 200);
        
        // Filter out those without valid coordinates
        const validIssues = result.issues.filter(i => i.latitude && i.longitude);
        setIssues(validIssues);
      } catch (err) {
        console.error("Map fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMapData();
  }, [user]);

  // Dynamically set map center based on issues if possible
  const mapCenter = issues.length > 0 
    ? { lat: issues[0].latitude, lng: issues[0].longitude } 
    : center;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h2">Territory Map</h1>
          <p className="text-muted">Geographic overview of civic operations.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div> Critical
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316' }}></div> High
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div> Medium
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '500' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div> Low
          </div>
        </div>
      </div>

      <div style={{ height: 'calc(100vh - 200px)', minHeight: '600px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 1 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map data...</div>
        ) : (
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {issues.map(issue => {
              const level = issue.priority?.level || 'Default';
              const icon = icons[level] || icons.Default;
              
              return (
                <Marker 
                  key={issue.id} 
                  position={{ lat: issue.latitude, lng: issue.longitude }}
                  icon={icon}
                >
                  <Popup className="authority-map-popup">
                    <div style={{ padding: '0.5rem', minWidth: '200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <IssueStatus status={issue.currentStatus || issue.status} />
                        {issue.priority && <PriorityBadge level={issue.priority.level} score={issue.priority.finalScore} />}
                      </div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9375rem' }}>{issue.title}</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {issue.assignedDepartment ? `Dept: ${issue.assignedDepartment}` : 'Unassigned'}
                      </p>
                      <button 
                        onClick={() => navigate(`/authority/issues/${issue.id}`)}
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        Open Operations Center
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default AuthorityMap;
