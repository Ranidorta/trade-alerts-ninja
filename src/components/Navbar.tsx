import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  BarChart4,
  Presentation,
  Clock,
  LineChart,
  Menu,
  X
} from "lucide-react";
import NinjaLogo from "@/components/NinjaLogo";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import AuthButton from "@/components/AuthButton";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navLinks = [
    { path: "/signals", name: "Sinais", icon: <BarChart4 size={18} /> },
    { path: "/history", name: "Histórico", icon: <Clock size={18} /> },
    { 
      path: "/performance", 
      name: "Performance", 
      icon: <LineChart size={18} /> 
    },
    { 
      path: "/market", 
      name: "Mercado", 
      icon: <Presentation size={18} /> 
    },
  ];

  const visibleNavLinks = user ? navLinks : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center gap-2">
            <NinjaLogo className="h-8 w-8" />
            <span className="hidden font-bold sm:inline-block">
              Trading Ninja
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {visibleNavLinks.map(({ path, name, icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  location.pathname === path
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {icon}
                <span>{name}</span>
              </Link>
            ))}
          </nav>
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
    </header>
  );
}
