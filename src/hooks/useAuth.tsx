
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { UserProfile } from '@/lib/types';
import { fetchUserProfile, setAuthToken, clearAuthToken } from '@/lib/signalsApi';
import { useToast } from '@/components/ui/use-toast';

// Declare global Firebase interface to avoid TypeScript errors
declare global {
  interface Window {
    firebase: any;
  }
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isInitialized: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  register: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Initialize Firebase Auth if available
  const initializeFirebase = async () => {
    try {
      // Check if Firebase is available in the window object (from CDN)
      if (!window.firebase) {
        console.log('Firebase not available, loading from CDN');
        
        // Load Firebase from CDN if not already loaded
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
        script.async = true;
        document.head.appendChild(script);
        
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
        authScript.async = true;
        document.head.appendChild(authScript);
        
        // Wait for scripts to load
        await new Promise((resolve) => {
          authScript.onload = resolve;
        });
      }

      // Initialize Firebase if not already initialized
      if (window.firebase && !window.firebase.apps?.length) {
        // Replace with your Firebase config
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          appId: "YOUR_APP_ID"
        };

        window.firebase.initializeApp(firebaseConfig);
      }
      
      // Set up auth state listener
      if (window.firebase && window.firebase.auth) {
        window.firebase.auth().onAuthStateChanged(async (firebaseUser: any) => {
          setIsLoading(true);
          
          if (firebaseUser) {
            // User is signed in
            const token = await firebaseUser.getIdToken();
            setAuthToken(token);
            
            // Fetch user profile from our API
            const userProfile = await fetchUserProfile();
            setUser(userProfile || {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              isAuthenticated: true
            });
          } else {
            // User is signed out
            clearAuthToken();
            setUser(null);
          }
          
          setIsLoading(false);
        });
      } else {
        // Firebase Auth not available, try API with stored token
        const userProfile = await fetchUserProfile();
        if (userProfile) {
          setUser(userProfile);
        }
        setIsLoading(false);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    initializeFirebase();
  }, []);

  // Auth methods
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (!window.firebase || !window.firebase.auth) {
        throw new Error('Firebase Auth não está disponível');
      }
      
      await window.firebase.auth().signInWithEmailAndPassword(email, password);
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo de volta, ${email}!`,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = 'Email ou senha incorretos.';
      }
      
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: errorMessage,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      if (!window.firebase || !window.firebase.auth) {
        throw new Error('Firebase Auth não está disponível');
      }
      
      const provider = new window.firebase.auth.GoogleAuthProvider();
      await window.firebase.auth().signInWithPopup(provider);
      
      toast({
        title: "Login com Google realizado",
        description: "Você foi autenticado com sucesso!",
      });
    } catch (error) {
      console.error('Google login error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Não foi possível fazer login com o Google. Tente novamente.",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      if (window.firebase && window.firebase.auth) {
        await window.firebase.auth().signOut();
      }
      
      clearAuthToken();
      setUser(null);
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Ocorreu um erro ao fazer logout. Tente novamente.",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      if (!window.firebase || !window.firebase.auth) {
        throw new Error('Firebase Auth não está disponível');
      }
      
      // Create user with email and password
      const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(email, password);
      
      // Update profile with name
      if (userCredential.user) {
        await userCredential.user.updateProfile({
          displayName: name
        });
      }
      
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo, ${name}!`,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha precisa ter pelo menos 6 caracteres.';
      }
      
      toast({
        variant: "destructive",
        title: "Erro no registro",
        description: errorMessage,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitialized,
        login,
        loginWithGoogle,
        logout,
        register
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default useAuth;
