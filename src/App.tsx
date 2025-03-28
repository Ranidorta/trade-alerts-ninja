
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar"; // Import the Navbar component

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
  const { toast } = useToast();

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
