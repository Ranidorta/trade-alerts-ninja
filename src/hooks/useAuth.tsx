import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Start session management for authenticated users
        if (session?.user) {
          securityService.startSessionTimeout();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Activity tracking for session management
    const trackActivity = () => {
      if (session?.user) {
        securityService.updateActivity();
      }
    };

    // Track user activity
    document.addEventListener('mousedown', trackActivity);
    document.addEventListener('keydown', trackActivity);
    document.addEventListener('scroll', trackActivity);
    document.addEventListener('touchstart', trackActivity);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', trackActivity);
      document.removeEventListener('keydown', trackActivity);
      document.removeEventListener('scroll', trackActivity);
      document.removeEventListener('touchstart', trackActivity);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (error) {
        console.error('SignUp error:', error);
        return { error };
      }
      
      // Check if user needs email confirmation
      if (data.user && !data.session) {
        console.log('User created, check email for confirmation');
        return { error: { message: 'Conta criada! Verifique seu email para confirmar o cadastro.' } };
      }
      
      return { error: null };
    } catch (err) {
      console.error('SignUp catch error:', err);
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('SignIn error:', error);
        return { error };
      }
      
      console.log('SignIn success:', data);
      return { error: null };
    } catch (err) {
      console.error('SignIn catch error:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const logout = signOut; // Alias for compatibility

  // For now, these are simplified - you can extend later
  const hasActiveSubscription = !!user; // True if user is authenticated
  const isAdmin = user?.email === 'admin@teste.com'; // Admin test account

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