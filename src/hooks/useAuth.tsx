
import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
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

// Mock user store for demo purposes - in a real app, this would be in a database
const mockUsers: Record<string, UserProfile> = {};

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const storedUser = localStorage.getItem('trading-ninja-user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Set auth token for API calls
          if (parsedUser.token) {
            setAuthToken(parsedUser.token);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('trading-ninja-user');
        clearAuthToken();
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // In a real app, you would make an API call to validate credentials
      const normalizedEmail = email.toLowerCase().trim();
      const mockUser = Object.values(mockUsers).find(
        u => u.email.toLowerCase() === normalizedEmail
      );
      
      if (!mockUser || mockUser.password !== password) {
        throw new Error('Email ou senha incorretos.');
      }
      
      // Create auth session
      const userProfile: UserProfile = {
        uid: mockUser.uid,
        email: mockUser.email,
        name: mockUser.name,
        isAuthenticated: true,
        token: `mock-token-${Date.now()}`
      };
      
      // Store in localStorage
      localStorage.setItem('trading-ninja-user', JSON.stringify(userProfile));
      setAuthToken(userProfile.token);
      setUser(userProfile);
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo de volta, ${mockUser.name || mockUser.email}!`,
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
      
      // Create a mock Google user
      const timestamp = Date.now();
      const userProfile: UserProfile = {
        uid: `google-user-${timestamp}`,
        email: `google-user-${timestamp}@example.com`,
        name: `Google User ${timestamp}`,
        isAuthenticated: true,
        token: `mock-google-token-${timestamp}`
      };
      
      // Store in localStorage
      localStorage.setItem('trading-ninja-user', JSON.stringify(userProfile));
      setAuthToken(userProfile.token);
      setUser(userProfile);
      
      toast({
        title: "Login com Google realizado",
        description: "Você foi autenticado com sucesso!",
      });
    } catch (error: any) {
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
      
      // Clear local storage and state
      localStorage.removeItem('trading-ninja-user');
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
      
      // In a real app, you would make an API call to create a user
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already registered
      const emailExists = Object.values(mockUsers).some(
        u => u.email.toLowerCase() === normalizedEmail
      );
      
      if (emailExists) {
        throw new Error('Este email já está em uso.');
      }
      
      if (password.length < 6) {
        throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      }
      
      // Create new user
      const uid = `user-${Date.now()}`;
      const newUser: UserProfile = {
        uid,
        email: normalizedEmail,
        name,
        password, // In a real app, NEVER store plain text passwords
        isAuthenticated: true,
        token: `mock-token-${Date.now()}`
      };
      
      // Add to mock store
      mockUsers[uid] = newUser;
      
      // Create auth session
      const userProfile: UserProfile = {
        uid: newUser.uid,
        email: newUser.email,
        name: newUser.name,
        isAuthenticated: true,
        token: newUser.token
      };
      
      // Store in localStorage
      localStorage.setItem('trading-ninja-user', JSON.stringify(userProfile));
      setAuthToken(userProfile.token);
      setUser(userProfile);
      
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
