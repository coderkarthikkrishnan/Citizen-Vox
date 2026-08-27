import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, ArrowLeft, Send, Mic, Activity, Droplet, Trash2, Zap, AlertTriangle, MessageSquare, AudioLines, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { issueService } from '../../services/issueService';
import { CloudinaryService } from '../../services/cloudinary';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useUserLocation } from '../../hooks/useUserLocation';

const CATEGORIES = [
  { id: 'road_damage', tKey: 'cat.road_damage', label: 'Road Damage', icon: <Activity size={24} /> },
  { id: 'garbage', tKey: 'cat.garbage', label: 'Garbage', icon: <Trash2 size={24} /> },
  { id: 'water_leakage', tKey: 'cat.water_leakage', label: 'Water Leakage', icon: <Droplet size={24} /> },
  { id: 'drainage', tKey: 'cat.drainage', label: 'Drainage', icon: <AlertTriangle size={24} /> },
  { id: 'street_light', tKey: 'cat.streetlight', label: 'Street Light', icon: <Zap size={24} /> },
  { id: 'other', tKey: 'cat.other', label: 'Other', icon: <MessageSquare size={24} /> },
];

const ReportIssue = () => {
  const { user } = useAuth();
  const { t, langCode } = useLanguage();
  const { userLocation, isLocating, requestLocation } = useUserLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [localImagePreview, setLocalImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    images: [],
    manualAddress: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [locationMode, setLocationMode] = useState('gps');
  
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  useEffect(() => {
    if (userLocation && locationMode === 'gps') {
      const fetchAddress = async () => {
        setResolvingAddress(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            // Take first 3-4 parts of the address for readability
            const parts = data.display_name.split(', ');
            setResolvedAddress(parts.slice(0, 4).join(', '));
          }
        } catch (err) {
          console.error("Geocoding failed", err);
        } finally {
          setResolvingAddress(false);
        }
      };
      fetchAddress();
    }
  }, [userLocation, locationMode]);

  useEffect(() => {
    if (locationMode === 'gps' && !userLocation && !isLocating) {
      requestLocation();
    }
  }, [locationMode, userLocation, isLocating, requestLocation]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (!finalTranscript) return;

        const text = finalTranscript.toLowerCase();
        
        setFormData(prev => {
          let newCategory = prev.category;
          if (!newCategory) {
            if (text.includes('garbage') || text.includes('trash') || text.includes('குப்பை') || text.includes('kuppa')) newCategory = 'garbage';
            else if (text.includes('road') || text.includes('pothole') || text.includes('பள்ளம்') || text.includes('சாலை')) newCategory = 'road_damage';
            else if (text.includes('water') || text.includes('leak') || text.includes('தண்ணீர்') || text.includes('கசிவு')) newCategory = 'water_leakage';
            else if (text.includes('drain') || text.includes('sewer') || text.includes('சாக்கடை') || text.includes('வடிகால்')) newCategory = 'drainage';
            else if (text.includes('light') || text.includes('dark') || text.includes('விளக்கு') || text.includes('தெருவிளக்கு')) newCategory = 'street_light';
          }
          
          const words = finalTranscript.split(' ');
          let newTitle = prev.title;
          let newDesc = prev.description;
          
          if (!newTitle) {
            newTitle = words.length > 4 ? words.slice(0, 4).join(' ') + '...' : finalTranscript;
          }
          if (!newDesc) {
            newDesc = finalTranscript;
          } else {
            if (!newDesc.endsWith(finalTranscript.trim())) {
              newDesc += ' ' + finalTranscript;
            }
          }
          
          return { ...prev, category: newCategory, title: newTitle, description: newDesc.trim() };
        });
      };
      
      rec.onerror = (e) => {
        console.error(e);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      
      setRecognition(rec);
    }
  }, []);

  useEffect(() => {
    if (recognition) {
        recognition.lang = langCode === 'ta' ? 'ta-IN' : 'en-US';
    }
  }, [langCode, recognition]);

  const toggleListening = () => {
    if (!recognition) {
      alert(t('voice.unsupported') || "Voice not supported");
      return;
    }
    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
      setListening(true);
    }
  };

  const handleCategorySelect = (id) => {
    setFormData(prev => ({ ...prev, category: id }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show immediate local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreview(previewUrl);
    setUploadingImage(true);

    try {
      const result = await CloudinaryService.uploadImage(file);
      setFormData(prev => ({ ...prev, images: [result.secure_url] }));
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image. Please try again.");
      setLocalImagePreview(null); // Revert on failure
    } finally {
      setUploadingImage(false);
    }
  };

  const submitReport = async () => {
    setLoading(true);
    try {
      let finalLocation;
      if (locationMode === 'gps' && userLocation) {
        finalLocation = { 
          lat: userLocation.lat, 
          lng: userLocation.lng, 
          address: resolvedAddress || `GPS Location (${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)})` 
        };
      } else if (locationMode === 'manual' && formData.manualAddress) {
        finalLocation = { lat: null, lng: null, address: formData.manualAddress };
      } else {
        finalLocation = { lat: 11.1271, lng: 78.6569, address: 'Unknown Location' };
      }

      await issueService.createIssue({
        ...formData,
        location: finalLocation,
        userName: user?.displayName || 'Citizen'
      }, user?.uid || 'anonymous');
      navigate('/citizen/issues');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const isFormValid = formData.category !== '' && (locationMode === 'manual' ? formData.manualAddress.length > 3 : true);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* Voice Mode Full-Screen Overlay */}
      <AnimatePresence>
        {voiceMode && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
              background: 'linear-gradient(180deg, var(--near-black) 0%, #0a1f10 100%)', 
              color: 'var(--white)', padding: '24px', display: 'flex', flexDirection: 'column' 
            }}>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', paddingTop: 'env(safe-area-inset-top)' }}>
              <button onClick={() => setVoiceMode(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--white)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                <ArrowLeft size={20} />
              </button>
              <span style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: '1rem' }}>AI Voice Assistant</span>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div 
                animate={{ 
                  scale: listening ? [1, 1.1, 1] : 1,
                  boxShadow: listening ? ['0 0 0px rgba(143,234,99,0)', '0 0 60px rgba(143,234,99,0.4)', '0 0 0px rgba(143,234,99,0)'] : 'none'
                }}
                transition={{ repeat: listening ? Infinity : 0, duration: 1.5 }}
                style={{ 
                width: '140px', height: '140px', borderRadius: '50%', 
                background: listening ? 'var(--primary-green)' : 'rgba(143,234,99,0.05)', 
                border: `2px solid ${listening ? 'var(--primary-green)' : 'rgba(143,234,99,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: listening ? 'var(--near-black)' : 'var(--primary-green)',
                cursor: 'pointer'
              }} onClick={toggleListening}>
                {listening ? <AudioLines size={64} /> : <Mic size={64} />}
              </motion.div>
              
              <p style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 600, color: listening ? 'var(--white)' : 'var(--text-secondary)' }}>
                {listening ? (t('voice.listening') || 'Listening...') : (t('voice.tapToSpeak') || 'Tap to speak')}
              </p>
              
              <div style={{ padding: '24px', textAlign: 'center', width: '100%', minHeight: '160px', marginTop: '1rem' }}>
                 {formData.title && (
                   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                       <Activity size={16} color="var(--primary-green)" />
                       <span style={{ fontSize: '0.75rem', color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Detected Context</span>
                     </div>
                     <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--white)' }}>{formData.title}</p>
                     <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{formData.description}</p>
                     
                     {formData.category && (
                       <div style={{ marginTop: '16px' }}>
                         <span style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(143,234,99,0.15)', color: 'var(--primary-green)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                           {CATEGORIES.find(c => c.id === formData.category)?.label || formData.category}
                         </span>
                       </div>
                     )}
                   </motion.div>
                 )}
              </div>
            </div>
            
            <div style={{ padding: '24px 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <button 
                onClick={() => setVoiceMode(false)}
                style={{ width: '100%', padding: '18px', fontSize: '1.125rem', borderRadius: '16px', background: 'var(--primary-green)', color: 'var(--near-black)', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Use This Description
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Single-Page Form */}
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--white)', minHeight: '100vh', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
        
        {/* Minimal Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <button onClick={() => navigate('/citizen')} style={{ background: '#f1f5f9', border: 'none', color: 'var(--near-black)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, marginRight: '40px' }}>{t('report.title')}</span>
        </div>

        <div style={{ padding: '24px' }}>
          
          {/* Section 1: Category (Required) */}
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--near-black)' }}>1. What's the issue?</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)' }}>*Required</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {CATEGORIES.map(cat => {
                const isSelected = formData.category === cat.id;
                const catLabel = t(cat.tKey) !== cat.tKey ? t(cat.tKey) : cat.label;
                return (
                  <motion.div key={cat.id} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCategorySelect(cat.id)}
                    style={{ 
                      background: isSelected ? 'var(--primary-green)' : '#f8fafc',
                      border: `1px solid ${isSelected ? 'var(--primary-green)' : '#e2e8f0'}`,
                      borderRadius: '16px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer',
                      boxShadow: isSelected ? '0 8px 20px rgba(143,234,99,0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ color: isSelected ? 'var(--near-black)' : 'var(--text-secondary)' }}>
                      {React.cloneElement(cat.icon, { size: 20 })}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', color: isSelected ? 'var(--near-black)' : 'var(--text-primary)' }}>{catLabel}</span>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* Section 2: Details */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--near-black)', marginBottom: '16px' }}>2. Details & Photo</h2>
            
            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0' }}>
              
              {/* Photo Area */}
              {(localImagePreview || formData.images.length > 0) ? (
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <img src={localImagePreview || formData.images[0]} alt="Issue" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }} />
                  {uploadingImage && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={32} style={{ color: 'var(--primary-green)', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>Uploading...</span>
                    </div>
                  )}
                  {!uploadingImage && (
                    <button onClick={() => { setFormData(prev => ({...prev, images: []})); setLocalImagePreview(null); }} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', border: '2px dashed #cbd5e1', borderRadius: '16px', cursor: 'pointer', background: 'var(--white)', transition: 'all 0.2s' }}>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <Camera size={24} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--near-black)' }}>Camera</span>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', border: '2px dashed #cbd5e1', borderRadius: '16px', cursor: 'pointer', background: 'var(--white)', transition: 'all 0.2s' }}>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--near-black)' }}>Gallery</span>
                  </label>
                </div>
              )}

              {/* Text / Voice Inputs */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input 
                  type="text" 
                  placeholder="Short Title (e.g. Large pothole)" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9375rem', background: 'var(--white)', outline: 'none' }}
                />
                <Activity size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '16px' }} />
              </div>
              
              <div style={{ position: 'relative' }}>
                <textarea 
                  placeholder="Describe what happened..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9375rem', background: 'var(--white)', minHeight: '100px', resize: 'vertical', outline: 'none' }}
                />
                
                {/* Voice Floating Button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setVoiceMode(true)}
                  style={{ 
                    position: 'absolute', bottom: '16px', right: '16px',
                    background: 'var(--primary-green)', color: 'var(--near-black)', border: 'none', 
                    borderRadius: '50%', width: '48px', height: '48px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(143,234,99,0.4)' 
                  }}>
                  <Mic size={24} />
                </motion.button>
              </div>

            </div>
          </section>

          {/* Section 3: Location */}
          <section style={{ marginBottom: '80px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--near-black)', marginBottom: '16px' }}>3. Location</h2>
            
            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '6px', display: 'flex', gap: '4px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <button 
                onClick={() => setLocationMode('gps')}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: locationMode === 'gps' ? 'var(--white)' : 'transparent', color: locationMode === 'gps' ? 'var(--near-black)' : 'var(--text-secondary)', fontWeight: 600, boxShadow: locationMode === 'gps' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <MapPin size={18} /> GPS
              </button>
              <button 
                onClick={() => setLocationMode('manual')}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: locationMode === 'manual' ? 'var(--white)' : 'transparent', color: locationMode === 'manual' ? 'var(--near-black)' : 'var(--text-secondary)', fontWeight: 600, boxShadow: locationMode === 'manual' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                Manual Entry
              </button>
            </div>

            {locationMode === 'gps' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--white)', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: userLocation ? 'rgba(143,234,99,0.1)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: userLocation ? 'var(--primary-green)' : 'var(--text-secondary)' }}>
                  <MapPin size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  {isLocating ? (
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Locating you...</p>
                  ) : userLocation ? (
                    <>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--near-black)' }}>Current Location Locked</p>
                      {resolvingAddress ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Resolving address...</p>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {resolvedAddress ? resolvedAddress : `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Location required</p>
                      <button onClick={requestLocation} style={{ background: 'none', border: 'none', color: 'var(--primary-green)', fontWeight: 600, padding: '4px 0', cursor: 'pointer', fontSize: '0.875rem' }}>Tap to locate</button>
                    </>
                  )}
                </div>
                {userLocation && <CheckCircle size={20} color="var(--primary-green)" />}
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="Enter street address or landmark" 
                value={formData.manualAddress}
                onChange={(e) => setFormData({...formData, manualAddress: e.target.value})}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.9375rem', background: 'var(--white)', outline: 'none' }}
              />
            )}
          </section>

        </div>
      </div>

      {/* Floating Submit Action */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px 24px', background: 'linear-gradient(0deg, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 100%)', zIndex: 100 }}>
        <div style={{ maxWidth: '552px', margin: '0 auto' }}>
          <motion.button 
            whileTap={{ scale: isFormValid ? 0.98 : 1 }}
            onClick={submitReport}
            disabled={loading || !isFormValid}
            style={{ 
              width: '100%', padding: '18px', fontSize: '1.125rem', borderRadius: '20px', 
              background: isFormValid ? 'var(--near-black)' : '#cbd5e1', 
              color: isFormValid ? 'var(--primary-green)' : '#94a3b8', 
              border: 'none', fontWeight: 700, cursor: isFormValid ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: isFormValid ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.3s'
            }}
          >
            {loading ? (
              <Activity size={24} style={{ animation: 'pulse 1.5s infinite' }} />
            ) : (
              <>
                <Send size={20} /> {t('action.submit') || 'Submit Report'}
              </>
            )}
          </motion.button>
        </div>
      </div>

    </div>
  );
};

export default ReportIssue;
