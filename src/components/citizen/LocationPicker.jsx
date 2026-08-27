import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import Button from '../common/Button';

// Fix Leaflet default marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapLocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position ? <Marker position={position} /> : null;
}

export const LocationPicker = ({ location, setLocation }) => {
  const { location: geoLoc, error: geoErr, loading: geoLoad, requestLocation } = useGeolocation();
  const mapRef = useRef(null);

  const defaultCenter = { lat: 11.1271, lng: 78.6569 }; // Tamil Nadu, India fallback

  useEffect(() => {
    if (geoLoc && !location) {
      setLocation(geoLoc);
    }
  }, [geoLoc, location, setLocation]);

  const handleUseCurrentLocation = () => {
    requestLocation();
  };

  const center = location || geoLoc || defaultCenter;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-small text-muted">Tap on the map to set location manually.</span>
        <Button 
          type="button" 
          variant="secondary" 
          size="sm" 
          onClick={handleUseCurrentLocation}
          disabled={geoLoad}
        >
          <LocateFixed size={16} />
          {geoLoad ? 'Locating...' : 'Use Current Location'}
        </Button>
      </div>

      {geoErr && <p className="text-small" style={{ color: 'var(--danger)' }}>{geoErr}. Please select manually.</p>}

      <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 1 }}>
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapLocationPicker position={location} setPosition={setLocation} />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
