import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const routeBasedOnRole = async (user) => {
    try {
      const userDoc = await getDoc(doc(auth.app.firestore || (await import('../../firebase/config')).db, 'users', user.uid));
      if (userDoc.exists()) {
        let role = userDoc.data().role;
        
        // On-the-fly migration
        const adminRoles = ['super_admin', 'municipal_admin', 'department_officer', 'authority', 'authority_admin', 'admin_user'];
        if (adminRoles.includes(role)) {
          role = 'admin';
          await setDoc(doc(auth.app.firestore || (await import('../../firebase/config')).db, 'users', user.uid), { role: 'admin' }, { merge: true });
        } else if (role === 'field_worker') {
          role = 'worker';
          await setDoc(doc(auth.app.firestore || (await import('../../firebase/config')).db, 'users', user.uid), { role: 'worker' }, { merge: true });
        }

        if (role === 'worker') navigate('/worker');
        else if (role === 'admin') navigate('/admin');
        else if (role === 'citizen') navigate('/citizen');
        else {
          setError("Account configuration requires administrator attention.");
          await signOut(auth);
        }
      } else {
        // First time Google/Phone sign in -> auto create citizen
        await setDoc(doc(auth.app.firestore || (await import('../../firebase/config')).db, 'users', user.uid), {
          email: user.email || '',
          phone: user.phoneNumber || '',
          name: user.displayName || 'Citizen',
          role: 'citizen',
          createdAt: serverTimestamp()
        });
        navigate('/citizen');
      }
    } catch (e) {
      navigate('/citizen'); // fallback
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase Auth not initialized.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await routeBasedOnRole(cred.user);
    } catch (err) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      await routeBasedOnRole(cred.user);
    } catch (err) {
      setError(err.message || "Failed to sign in with Google.");
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '440px',
        color: 'white'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', margin: '0 auto 1rem' }}>
            CV
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Welcome Back</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Sign in to continue to Citizen Vox</p>
        </div>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              required
              style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', transition: 'all 0.2s', fontSize: '1rem' }} 
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-green)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary-green)', textDecoration: 'none', fontWeight: '500' }}>Forgot password?</Link>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              style={{ padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', transition: 'all 0.2s', fontSize: '1rem' }} 
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-green)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '1rem', 
              marginTop: '0.5rem', 
              background: 'var(--primary-green)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: '600', 
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px 0 rgba(143, 234, 99, 0.39)'
            }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0', gap: '1rem' }}>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', fontWeight: '500' }}>OR</span>
          <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.1)' }}></div>
        </div>
            
        <button 
          type="button" 
          onClick={handleGoogleLogin}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.05)', 
            color: 'white', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            fontWeight: '500', 
            fontSize: '1rem',
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary-green)', fontWeight: '600', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
