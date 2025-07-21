
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import SignalsDashboard from "./pages/SignalsDashboard";
import SignalsHistory from "./pages/SignalsHistory";
import ClassicSignalsHistory from "./pages/ClassicSignalsHistory";
import CryptoMarket from "./pages/CryptoMarket";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import UserProfile from "./pages/UserProfile";
import Checkout from "./pages/Checkout";
import { ThemeProvider } from "./components/ThemeProvider";
import { useAuth } from "./hooks/useAuth";

import ProtectedPremiumRoute from "./components/ProtectedPremiumRoute";
import "./App.css";

// Import gamer theme styles
import "./styles/gamer-theme.css";
import { useState } from "react";

// Protected route component for basic authentication
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
      
      {/* Protected routes - require authentication only */}
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
      <Route path="/classic-history" element={
        <ProtectedRoute>
          <ClassicSignalsHistory />
        </ProtectedRoute>
      } />
      <Route path="/market" element={
        <ProtectedRoute>
          <CryptoMarket />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <UserProfile />
        </ProtectedRoute>
      } />
      <Route path="/checkout" element={
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      } />
      
      {/* Premium routes - require active subscription */}
      <Route path="/performance" element={
        <ProtectedPremiumRoute>
          <PerformanceDashboard />
        </ProtectedPremiumRoute>
      } />
      
      {/* Admin routes - require admin role */}
      <Route path="/admin" element={
        <ProtectedPremiumRoute requireAdmin={true}>
          <Admin />
        </ProtectedPremiumRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [queryClient] = useState(() => new QueryClient());
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="gamer-theme font-rajdhani">
            <Navbar />
            <div className="pt-16 min-h-screen gamer-background overflow-x-hidden">
              <AppRoutes />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
