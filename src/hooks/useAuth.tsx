import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { securityService } from '@/lib/securityService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  hasActiveSubscription: boolean;
  isAdmin: boolean;
  updateUserSubscription?: (active: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  logout: async () => {},
  hasActiveSubscription: false,
  isAdmin: false,
  updateUserSubscription: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Start session management for authenticated users
      if (user) {
        securityService.startSessionTimeout();
      }
    });

    // Activity tracking for session management
    const trackActivity = () => {
      if (auth.currentUser) {
        securityService.updateActivity();
      }
    };

    // Track user activity
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keydown', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', trackActivity);
      document.removeEventListener('keydown', trackActivity);
      document.removeEventListener('scroll', trackActivity);
      document.removeEventListener('touchstart', trackActivity);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const logout = signOut; // Alias for compatibility

  // For now, these are simplified - you can extend later
  const hasActiveSubscription = !!user; // True if user is authenticated
  const isAdmin = false; // Simplified for now

  const value = {
    user,
    loading,
    isLoading: loading,
    signUp,
    signIn,
    signOut,
    logout,
    hasActiveSubscription,
    isAdmin,
    updateUserSubscription: () => {}, // Placeholder
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};