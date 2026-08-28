import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser.role = userData.role || 'citizen';
            currentUser.department = userData.department || null;
            currentUser.municipalityId = userData.municipalityId || null;
            // Override auth displayName with database name if it exists
            currentUser.displayName = userData.name || userData.displayName || currentUser.displayName;
          } else {
            currentUser.role = 'citizen';
          }
        } catch (err) {
          console.error("Error fetching user data", err);
          currentUser.role = 'citizen';
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return { user, loading, logout };
};
