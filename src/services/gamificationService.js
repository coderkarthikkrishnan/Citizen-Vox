import { db } from '../firebase/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  where,
  arrayUnion
} from 'firebase/firestore';

export const gamificationService = {
  /**
   * Subscribe to a user's real-time gamification profile
   */
  subscribeToProfile: (userId, callback) => {
    if (!db || !userId) return () => {};
    
    const docRef = doc(db, 'gamificationProfiles', userId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        // Initialize default profile if it doesn't exist
        const defaultProfile = { xp: 0, badges: [] };
        setDoc(docRef, defaultProfile);
        callback(defaultProfile);
      }
    });
  },

  /**
   * Award XP to a user
   */
  addXp: async (userId, amount) => {
    if (!db || !userId) return;
    
    const docRef = doc(db, 'gamificationProfiles', userId);
    
    try {
      await setDoc(docRef, {
        xp: increment(amount)
      }, { merge: true });
    } catch (error) {
      console.error("Error adding XP:", error);
    }
  },

  /**
   * Award a badge to a user
   */
  awardBadge: async (userId, badgeId) => {
    if (!db || !userId) return;
    
    const docRef = doc(db, 'gamificationProfiles', userId);
    
    try {
      await setDoc(docRef, {
        badges: arrayUnion(badgeId)
      }, { merge: true });
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  },

  /**
   * Fetch the leaderboard (top users by XP)
   */
  getLeaderboard: async (limitCount = 10) => {
    if (!db) return [];
    
    try {
      const profilesRef = collection(db, 'gamificationProfiles');
      const q = query(profilesRef, orderBy('xp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      
      const leaderboard = [];
      let currentRank = 1;
      let actualPosition = 1;
      let previousXp = null;
      
      for (const document of querySnapshot.docs) {
        const data = document.data();
        const xp = data.xp || 0;
        let name = "Citizen";
        let avatar = "C";
        
        if (previousXp !== null && xp < previousXp) {
          currentRank = actualPosition;
        }
        previousXp = xp;
        
        // Fetch user data for name
        try {
          const userDoc = await getDoc(doc(db, 'users', document.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            name = userData.name || userData.displayName || name;
            avatar = name.charAt(0).toUpperCase();
          }
        } catch (e) {
          console.error("Error fetching user data for leaderboard:", e);
        }
        
        leaderboard.push({
          id: document.id,
          rank: currentRank,
          name,
          avatar,
          xp
        });
        
        actualPosition++;
      }
      
      return leaderboard;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  },

  /**
   * Get actual global rank based on XP
   */
  getUserRank: async (userXp) => {
    if (!db) return 0;
    try {
      const profilesRef = collection(db, 'gamificationProfiles');
      const q = query(profilesRef, where('xp', '>', userXp || 0));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count + 1;
    } catch (error) {
      console.error("Error fetching rank:", error);
      return 0;
    }
  }
};
