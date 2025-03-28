
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { setAuthToken, clearAuthToken } from '@/lib/signalsApi';
import { useToast } from '@/components/ui/use-toast';

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

  // Convert Firebase user to UserProfile
  const formatUser = (firebaseUser: User): UserProfile => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || '',
      isAuthenticated: true,
      token: '',
      photoURL: firebaseUser.photoURL
    };
  };

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      try {
        if (firebaseUser) {
          // User is signed in
          const token = await firebaseUser.getIdToken();
          const formattedUser = formatUser(firebaseUser);
          formattedUser.token = token;
          
          setUser(formattedUser);
          setAuthToken(token);
          
          // Store in localStorage for persistence
          localStorage.setItem('trading-ninja-user', JSON.stringify(formattedUser));
        } else {
          // User is signed out
          setUser(null);
          clearAuthToken();
          localStorage.removeItem('trading-ninja-user');
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
        clearAuthToken();
        localStorage.removeItem('trading-ninja-user');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: error.message || 'Erro ao fazer login. Tente novamente.',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      toast({
        title: "Login com Google realizado",
        description: "Você foi autenticado com sucesso!",
      });
    } catch (error: any) {
      console.error('Google login error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: error.message || "Não foi possível fazer login com o Google. Tente novamente.",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message || "Ocorreu um erro ao fazer logout. Tente novamente.",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      if (password.length < 6) {
        throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      }
      
      // Create new user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
      
      toast({
        title: "Registro realizado com sucesso",
        description: `Bem-vindo, ${name}!`,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro no registro",
        description: error.message || 'Erro ao criar conta. Tente novamente.',
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
