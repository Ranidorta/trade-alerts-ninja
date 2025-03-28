import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { NinjaLogo } from "@/components/ui/logo"

// Pages
import Index from "@/pages/Index";
import SignalsDashboard from "@/pages/SignalsDashboard";
import CryptoMarket from "@/pages/CryptoMarket";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import SignalsHistory from "@/pages/SignalsHistory";

const queryClient = new QueryClient();

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast()

  useEffect(() => {
    // Optional: Add logic to check for updates or display a welcome message
    // For example:
    // toast({
    //   title: "Welcome to Trading Ninja!",
    //   description: "Stay sharp and trade wisely.",
    // })
  }, [toast]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="trading-ninja-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Navbar />
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signals" element={<SignalsDashboard />} />
              <Route path="/history" element={<SignalsHistory />} />
              <Route path="/market" element={<CryptoMarket />} />
              <Route path="/performance" element={<PerformanceDashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
            <Link
              to="/signals"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/signals"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              Sinais
            </Link>
            <Link
              to="/history"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/history"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              Histórico
            </Link>
            <Link
              to="/market"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/market"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              Mercado
            </Link>
            <Link
              to="/performance"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/performance"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              Performance
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <nav className="flex items-center space-x-1 text-sm font-medium">
            <Link
              to="/login"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/login"
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              Login
            </Link>
          </nav>
          <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="text-foreground">
              <DrawerHeader>
                <DrawerTitle>Trading Ninja</DrawerTitle>
                <DrawerDescription>
                  Explore nossos recursos e ferramentas.
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid gap-4 px-4">
                <Link
                  to="/signals"
                  className={cn(
                    "flex items-center py-2 transition-colors hover:text-foreground/80",
                    pathname === "/signals"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Sinais
                </Link>
                <Link
                  to="/history"
                  className={cn(
                    "flex items-center py-2 transition-colors hover:text-foreground/80",
                    pathname === "/history"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Histórico
                </Link>
                <Link
                  to="/market"
                  className={cn(
                    "flex items-center py-2 transition-colors hover:text-foreground/80",
                    pathname === "/market"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Mercado
                </Link>
                <Link
                  to="/performance"
                  className={cn(
                    "flex items-center py-2 transition-colors hover:text-foreground/80",
                    pathname === "/performance"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Performance
                </Link>
                <Link
                  to="/login"
                  className={cn(
                    "flex items-center py-2 transition-colors hover:text-foreground/80",
                    pathname === "/login"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Login
                </Link>
              </div>
              <DrawerFooter>
                <DrawerClose>
                  <Button variant="outline">Fechar</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
