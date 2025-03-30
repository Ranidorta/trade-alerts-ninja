import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  BarChart4,
  Presentation,
  Clock,
  LineChart,
  Menu,
  X,
  Home,
  BarChart,
  ClipboardList,
  TrendingUp,
  Globe
} from "lucide-react";
import NinjaLogo from "@/components/NinjaLogo";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuItems = [
    { name: "Home", path: "/", icon: <Home className="h-4 w-4 mr-2" /> },
    { name: "Sinais", path: "/signals", icon: <BarChart className="h-4 w-4 mr-2" /> },
    { name: "Histórico", path: "/history", icon: <ClipboardList className="h-4 w-4 mr-2" /> },
    { name: "Performance", path: "/performance", icon: <TrendingUp className="h-4 w-4 mr-2" /> },
    { name: "Backtest", path: "/backtest", icon: <LineChart className="h-4 w-4 mr-2" /> },
    { name: "Mercado", path: "/market", icon: <Globe className="h-4 w-4 mr-2" /> },
  ];

  const visibleNavLinks = user ? menuItems : [];

  return (
    <nav className="fixed top-0 left-0 w-full bg-background/95 backdrop-blur z-50 border-b border-border transition-all duration-200">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2 text-primary text-xl font-bold"
            >
              <NinjaLogo className="w-8 h-8" />
              <span>Trading Ninja</span>
            </Link>
          </div>

          {isMobile ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={toggleMenu}
              >
                {isMenuOpen ? <X /> : <Menu />}
              </Button>

              {isMenuOpen && (
                <div className="absolute top-16 left-0 w-full bg-background border-b border-border z-50">
                  <div className="container py-4 space-y-2">
                    {visibleNavLinks.map(({ path, name, icon }) => (
                      <Link
                        key={path}
                        to={path}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors",
                          location.pathname === path
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {icon}
                        <span>{name}</span>
                      </Link>
                    ))}
                    <div className="pt-2 flex justify-between items-center border-t border-border">
                      <AuthButton />
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="hidden md:flex items-center space-x-1">
              {visibleNavLinks.map(({ path, name, icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors",
                    location.pathname === path
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {icon}
                  <span>{name}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="hidden md:flex items-center space-x-2">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};
