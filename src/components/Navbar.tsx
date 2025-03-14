
import { useEffect, useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { Menu, X, BarChart3, History, Activity, Lock, LineChart, LogIn, Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount and route change
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(authStatus);
    setIsMobileOpen(false);
  }, [location.pathname]);

  const publicLinks = [
    {
      name: "Home",
      path: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      name: "Planos",
      path: "/plans",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      name: "Login",
      path: "/login",
      icon: <LogIn className="h-4 w-4 mr-2" />,
    },
  ];

  const authenticatedLinks = [
    {
      name: "Home",
      path: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <User className="h-4 w-4 mr-2" />,
    },
    {
      name: "Sinais",
      path: "/signals",
      icon: <Activity className="h-4 w-4 mr-2" />,
    },
    {
      name: "Mercado",
      path: "/market",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      name: "Histórico",
      path: "/history",
      icon: <History className="h-4 w-4 mr-2" />,
    },
    {
      name: "Performance",
      path: "/performance",
      icon: <LineChart className="h-4 w-4 mr-2" />,
    },
  ];

  // Only show admin link if authenticated
  if (isAuthenticated) {
    authenticatedLinks.push({
      name: "Admin",
      path: "/admin",
      icon: <Lock className="h-4 w-4 mr-2" />,
    });
  }

  const navLinks = isAuthenticated ? authenticatedLinks : publicLinks;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background border-b">
      <div className="container flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link
            to="/"
            className="text-xl font-bold text-primary flex items-center"
          >
            <span className="hidden sm:inline">CryptoSignals</span>
            <span className="sm:hidden">CS</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {isMobile ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle menu"
              >
                {isMobileOpen ? <X /> : <Menu />}
              </Button>

              {isMobileOpen && (
                <div className="fixed inset-0 top-16 bg-background z-40 p-4">
                  <div className="flex flex-col space-y-2">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                          `px-4 py-3 rounded-md transition-colors flex items-center ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-accent hover:text-accent-foreground"
                          }`
                        }
                      >
                        {link.icon}
                        {link.name}
                      </NavLink>
                    ))}
                    
                    {isAuthenticated && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          localStorage.removeItem("isAuthenticated");
                          localStorage.removeItem("userEmail");
                          localStorage.removeItem("userName");
                          window.location.href = "/login";
                        }}
                      >
                        Sair
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <nav className="flex space-x-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                >
                  <span className="flex items-center">
                    {link.icon}
                    {link.name}
                  </span>
                </NavLink>
              ))}
              
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => {
                    localStorage.removeItem("isAuthenticated");
                    localStorage.removeItem("userEmail");
                    localStorage.removeItem("userName");
                    window.location.href = "/login";
                  }}
                >
                  Sair
                </Button>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
