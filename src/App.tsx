
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import SignalsDashboard from "./pages/SignalsDashboard";
import SignalsHistory from "./pages/SignalsHistory";
import CryptoMarket from "./pages/CryptoMarket";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import { ThemeProvider } from "./components/ThemeProvider";
import "./App.css";

// Import gamer theme styles
import "./styles/gamer-theme.css";

// Create a client
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="gamer-theme">
            <Navbar />
            <div className="pt-16 min-h-screen gamer-background overflow-x-hidden">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signals" element={<SignalsDashboard />} />
                <Route path="/history" element={<SignalsHistory />} />
                <Route path="/market" element={<CryptoMarket />} />
                <Route path="/performance" element={<PerformanceDashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
