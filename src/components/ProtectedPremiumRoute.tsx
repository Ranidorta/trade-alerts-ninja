import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedPremiumRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedPremiumRoute = ({ children, requireAdmin = false }: ProtectedPremiumRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For now, allow all authenticated users access to premium features
  // You can extend this later with actual subscription logic

  return <>{children}</>;
};

export default ProtectedPremiumRoute;