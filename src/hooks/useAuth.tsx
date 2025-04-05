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
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { setAuthToken, clearAuthToken } from '@/lib/signalsApi';
import { useToast } from '@/components/ui/use-toast';

interface UserRole {
  role: 'user' | 'admin' | 'premium';
  assinaturaAtiva: boolean;
}

interface AuthContextType {
  user: (UserProfile & Partial<UserRole>) | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  hasActiveSubscription: () => boolean;
  isAdmin: () => boolean;
  updateUserSubscription: (isActive: boolean) => Promise<void>;
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
  hasActiveSubscription: () => false,
  isAdmin: () => false,
  updateUserSubscription: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<(UserProfile & Partial<UserRole>) | null>(null);
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

  // Fetch user role and subscription data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnapshot = await getDoc(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as UserRole;
        
        // Special case for testing
        if (user?.email === "ranier.dorta@gmail.com") {
          userData.assinaturaAtiva = true;
        }
        
        return userData;
      } else {
        // If user document doesn't exist, create it with default values
        const defaultUserRole: UserRole = {
          role: 'user',
          assinaturaAtiva: false
        };
        
        await setDoc(userRef, defaultUserRole);
        return defaultUserRole;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return { role: 'user', assinaturaAtiva: false };
    }
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
          
          // Fetch additional user data from Firestore
          const userData = await fetchUserData(firebaseUser.uid);
          
          // Validate role to ensure it's one of the allowed values
          const validRole = validateRole(userData.role);
          
          // Combine auth user with Firestore data
          const enrichedUser: UserProfile & Partial<UserRole> = {
            ...formattedUser,
            role: validRole,
            assinaturaAtiva: userData.assinaturaAtiva
          };
          
          setUser(enrichedUser);
          setAuthToken(token);
          
          // Store in localStorage for persistence
          localStorage.setItem('trading-ninja-user', JSON.stringify(enrichedUser));
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

  // Helper function to validate role
  const validateRole = (role: any): 'user' | 'admin' | 'premium' => {
    if (role === 'admin' || role === 'premium' || role === 'user') {
      return role;
    }
    return 'user'; // Default role if invalid
  };

  // Helper function to update user subscription status
  const updateUserSubscription = async (isActive: boolean) => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      const userRef = doc(db, "users", user.uid);
      
      await updateDoc(userRef, {
        assinaturaAtiva: isActive
      });
      
      // Update local user state
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          assinaturaAtiva: isActive
        };
      });
      
      // Update localStorage
      const storedUser = localStorage.getItem('trading-ninja-user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.assinaturaAtiva = isActive;
        localStorage.setItem('trading-ninja-user', JSON.stringify(parsedUser));
      }
      
      toast({
        title: isActive ? "Assinatura ativada" : "Assinatura desativada",
        description: isActive 
          ? "Sua assinatura premium foi ativada com sucesso!" 
          : "Sua assinatura premium foi cancelada.",
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da assinatura.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
  
  // Helper function to check if user has an active subscription
  const hasActiveSubscription = () => {
    return user?.assinaturaAtiva === true || user?.role === 'admin';
  };
  
  // Helper function to check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
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
        register,
        hasActiveSubscription,
        isAdmin,
        updateUserSubscription
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default useAuth;
