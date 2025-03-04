
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X, BarChart3, History, Activity, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const location = useLocation();
  const isMobile = useMobile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    {
      name: "Home",
      path: "/",
      icon: <Activity className="h-4 w-4 mr-2" />,
    },
    {
      name: "Signals",
      path: "/signals",
      icon: <Activity className="h-4 w-4 mr-2" />,
    },
    {
      name: "Market",
      path: "/market",
      icon: <BarChart3 className="h-4 w-4 mr-2" />,
    },
    {
      name: "History",
      path: "/history",
      icon: <History className="h-4 w-4 mr-2" />,
    },
    {
      name: "Admin",
      path: "/admin",
      icon: <Lock className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background border-b">
      <div className="container flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <NavLink
            to="/"
            className="text-xl font-bold text-primary flex items-center"
          >
            <span className="hidden sm:inline">CryptoSignals</span>
            <span className="sm:hidden">CS</span>
          </NavLink>
        </div>

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
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
