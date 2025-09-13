
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface ProtectedPremiumRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

// Protected route that requires an active subscription or admin role
const ProtectedPremiumRoute = ({ 
  children, 
  requireAdmin = false 
}: ProtectedPremiumRouteProps) => {
  const { user, isLoading, hasActiveSubscription, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // If authentication is still loading, return loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to login
  if (!user) {
    toast({
      variant: "destructive",
      title: "Acesso negado",
      description: "Você precisa estar logado para acessar esta página.",
    });
    return <Navigate to="/login" replace />;
  }
  
  // Check permission based on requirements
  let hasPermission = false;
  
  if (requireAdmin) {
    // Admin-only route
    hasPermission = isAdmin();
    if (!hasPermission) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não possui permissão de administrador para acessar esta página.",
      });
    }
  } else {
    // Premium route - requires either admin role or active subscription
    hasPermission = hasActiveSubscription();
    if (!hasPermission) {
      toast({
        variant: "destructive",
        title: "Acesso Premium Necessário",
        description: "Esta área requer uma assinatura ativa. Atualize seu plano para continuar.",
      });
    }
  }
  
  // If no permission, redirect to dashboard
  if (!hasPermission) {
    return <Navigate to="/checkout" replace />;
  }
  
  // If user has permission, render the children
  return <>{children}</>;
};

export default ProtectedPremiumRoute;
