import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../src/firebase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import NetInfo from '@react-native-community/netinfo';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferences?: any;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check network connectivity
  const checkNetworkStatus = async () => {
    const state = await NetInfo.fetch();
    console.log('Network status:', state.isConnected);
    return state.isConnected;
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      // Check network first
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        console.log('No network connection, skipping Firestore fetch');
        return;
      }

      // Add timeout to prevent long waits
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 3000)
      );
      
      const fetchPromise = getDoc(doc(db, 'users', uid));
      const userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error) {
      // Only log in development, don't show to user
      if (__DEV__) {
        console.log('Background profile fetch failed (this is normal):', error);
      }
      // Don't throw error, just continue with basic profile
      // This prevents the app from crashing if Firestore is temporarily unavailable
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Create a basic user profile immediately to avoid long loading
        const basicProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
          preferences: {
            dietaryRestrictions: [],
            cuisinePreferences: [],
            skillLevel: 'Beginner',
            allergies: []
          }
        };
        setUserProfile(basicProfile);
        setLoading(false);
        
        // Try to fetch from Firestore in the background (silently)
        fetchUserProfile(user.uid).catch(() => {
          // Silently fail - we already have a basic profile working
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Sign up function
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // No delay - immediate feedback
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName || user.email?.split('@')[0] || 'User',
        createdAt: new Date(),
        lastLogin: new Date(),
        preferences: {
          dietaryRestrictions: [],
          cuisinePreferences: [],
          skillLevel: 'Beginner',
          allergies: []
        }
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      setUserProfile(userProfile);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      // No delay - immediate feedback
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date()
      }, { merge: true });
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  // Google Sign In function
  const signInWithGoogle = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'miso70'
      });

      const request = new AuthSession.AuthRequest({
        clientId: '273265478454-4248d4ff48d57375af8197.apps.googleusercontent.com', // We'll update this with your real client ID
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
      });

      if (result.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        // Create or update user profile
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL,
          createdAt: new Date(),
          lastLogin: new Date(),
          preferences: {
            dietaryRestrictions: [],
            cuisinePreferences: [],
            skillLevel: 'Beginner',
            allergies: []
          }
        };

        await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
        setUserProfile(userProfile);
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw new Error(error.message);
    }
  };

  // Sign out function
  const signOutUser = async () => {
    try {
      // Clear all local state before signing out
      setUserProfile(null);
      setLoading(true);
      
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: signOutUser,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 