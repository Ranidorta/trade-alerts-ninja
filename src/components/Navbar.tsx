import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X, BarChart3, History, Activity, Lock, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./ThemeToggle";
import NinjaLogo from "./NinjaLogo";

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
    <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-background/80 border-b border-[#333344]">
      <div className="container flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <NavLink
            to="/"
            className="text-xl font-bold text-primary flex items-center"
          >
            <div className="w-8 h-8 mr-2 flex-shrink-0">
              <NinjaLogo className="w-full h-full" />
            </div>
            <span className="hidden sm:inline font-['Russo_One'] bg-clip-text text-transparent bg-gradient-to-r from-[#00ffff] to-[#0077ff] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">Trade Ninja</span>
            <span className="sm:hidden font-['Russo_One'] bg-clip-text text-transparent bg-gradient-to-r from-[#00ffff] to-[#0077ff] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">TN</span>
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
                className="gamer-button"
              >
                {isMobileOpen ? <X /> : <Menu />}
              </Button>

              {isMobileOpen && (
                <div className="fixed inset-0 top-16 backdrop-blur-xl bg-background/90 z-40 p-4">
                  <div className="flex flex-col space-y-2">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                          `px-4 py-3 rounded-md transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-[#0077ff]/30 to-[#00ffff]/30 text-[#00ffff] border border-[#00ffff]/30 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
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
                    `px-3 py-2 rounded-md text-sm transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#0077ff]/30 to-[#00ffff]/30 text-[#00ffff] border border-[#00ffff]/30 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground hover:border hover:border-[#00ffff]/20"
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
