
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import SignalsDashboard from "./pages/SignalsDashboard";
import SignalsHistory from "./pages/SignalsHistory";
import CryptoMarket from "./pages/CryptoMarket";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import "./App.css";

// Import gamer theme styles
import "./styles/gamer-theme.css";

// Create a client
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  // If authentication is still loading, return null or a loading indicator
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  
  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If user is authenticated, render the children
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Protected routes */}
      <Route path="/signals" element={
        <ProtectedRoute>
          <SignalsDashboard />
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <SignalsHistory />
        </ProtectedRoute>
      } />
      <Route path="/market" element={
        <ProtectedRoute>
          <CryptoMarket />
        </ProtectedRoute>
      } />
      <Route path="/performance" element={
        <ProtectedRoute>
          <PerformanceDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="gamer-theme font-rajdhani">
              <Navbar />
              <div className="pt-16 min-h-screen gamer-background overflow-x-hidden">
                <AppRoutes />
              </div>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
