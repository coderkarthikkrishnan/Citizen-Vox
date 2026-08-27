import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authorityService } from '../../services/authorityService';
import IssueStatus from '../../components/citizen/IssueStatus';
import PriorityCard from '../../components/priority/PriorityCard';
import CommunityConfidence from '../../components/community/CommunityConfidence';
import AssignmentPanel from '../../components/authority/AssignmentPanel';
import StatusControl from '../../components/authority/StatusControl';
import InternalNotes from '../../components/authority/InternalNotes';
import StatusTimeline from '../../components/authority/StatusTimeline';
import VerificationStatus from '../../components/resolution/VerificationStatus';
import BeforeAfterViewer from '../../components/resolution/BeforeAfterViewer';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const AuthorityIssueDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIssue = async () => {
    setLoading(true);
    try {
      const data = await authorityService.getIssueDetails(id);
      if (data) {
        setIssue(data);
      } else {
        setError("Issue not found in operations center");
      }
    } catch (err) {
      setError("Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading civic operations...</div>;
  if (error || !issue) return <div className="container" style={{ padding: '2rem' }}>{error || "Not found"}</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', background: 'var(--background)' }}>
      <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Context & Intelligence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="text-small text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {issue.category?.replace('_', ' ')} • {issue.assignedDepartment || 'Unassigned'}
                </span>
                <h1 className="text-h1" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>{issue.title || issue.primaryIssue || 'Untitled Issue'}</h1>
              </div>
              <IssueStatus status={issue.currentStatus || issue.status} />
            </div>
            <p className="text-body" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {issue.description || 'No description provided.'}
            </p>
          </div>

          {/* Intelligence Layer */}
          {issue.priority && (
            <PriorityCard priority={issue.priority} />
          )}

          {/* Resolution Verification UI */}
          {issue.resolutionConfidence && (
            <div style={{ marginBottom: '0.5rem' }}>
              <VerificationStatus confidence={issue.resolutionConfidence} />
            </div>
          )}

          {issue.currentStatus === 'Awaiting Verification' && (
            <div style={{ background: 'var(--warning-light)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--warning-dark)', fontWeight: '600' }}>
              Worker has completed this task. Awaiting citizen verification to close the issue.
            </div>
          )}

          {(issue.beforeEvidence || issue.afterEvidence) && (
            <div style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h3 className="text-h3" style={{ marginBottom: '1rem' }}>Worker Evidence</h3>
              <BeforeAfterViewer 
                beforeEvidence={issue.beforeEvidence}
                afterEvidence={issue.afterEvidence}
                workDescription={issue.workDescription}
              />
            </div>
          )}

          {/* Community Verification (Original) */}
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <h3 className="text-h3" style={{ marginBottom: '1rem' }}>Community Intelligence</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <CommunityConfidence score={issue.communityConfidence?.score || 0} level={issue.communityConfidence?.level} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{issue.reportCount || 1}</div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Reports</div>
                </div>
                <div style={{ background: 'var(--surface-soft)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{issue.evidenceCount || (issue.media?.length > 0 ? 1 : 0)}</div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Photos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Location */}
          {issue.latitude && issue.longitude && (
            <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <MapPin size={20} /> Incident Location
                  </h3>
                  {issue.address && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{issue.address}</p>}
                </div>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--primary-green)', color: 'white', textDecoration: 'none', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0 }}
                >
                  <Navigation size={16} /> Get Directions
                </a>
              </div>
              <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 1 }}>
                <MapContainer center={{ lat: issue.latitude, lng: issue.longitude }} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={{ lat: issue.latitude, lng: issue.longitude }} />
                </MapContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Operations Workflow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
          <StatusControl issue={issue} onUpdate={fetchIssue} />
          <AssignmentPanel issue={issue} onUpdate={fetchIssue} />
          <StatusTimeline issue={issue} />
          <InternalNotes clusterId={issue.id} />
        </div>

      </div>
    </div>
  );
};

export default AuthorityIssueDetails;
