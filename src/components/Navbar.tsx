
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X, BarChart3, History, Activity, Lock, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./ThemeToggle";

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
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
      name: "Performance",
      path: "/performance",
      icon: <LineChart className="h-4 w-4 mr-2" />,
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
            <div className="w-8 h-8 mr-2 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path 
                  d="M50,10 C60,10 70,20 75,30 C80,40 75,60 65,70 C55,80 45,75 35,65 C25,55 20,45 25,35 C30,25 40,10 50,10 Z" 
                  fill="currentColor" 
                  className="text-primary"
                />
                <path 
                  d="M45,35 C48,32 52,32 55,35 M40,50 C45,55 55,55 60,50 M35,45 L42,38 M58,38 L65,45" 
                  stroke="black" 
                  strokeWidth="2" 
                  fill="none"
                  className="dark:stroke-white" 
                />
                <path 
                  d="M45,30 L55,30 L50,20 Z" 
                  fill="black" 
                  className="dark:fill-white" 
                />
                <circle cx="40" cy="40" r="3" fill="black" className="dark:fill-white" />
                <circle cx="60" cy="40" r="3" fill="black" className="dark:fill-white" />
                <path 
                  d="M40,65 L50,75 L60,65" 
                  stroke="black" 
                  strokeWidth="2" 
                  fill="none" 
                  className="dark:stroke-white"
                />
              </svg>
            </div>
            <span className="hidden sm:inline">Trade Ninja</span>
            <span className="sm:hidden">TN</span>
          </NavLink>
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
      </div>
    </header>
  );
};

export default Navbar;
