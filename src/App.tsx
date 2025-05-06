
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'
import Index from '@/pages/Index'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import NotFound from '@/pages/NotFound'
import SignalsDashboard from '@/pages/SignalsDashboard'
import PerformanceDashboard from '@/pages/PerformanceDashboard'
import UserProfile from '@/pages/UserProfile'
import CryptoMarket from '@/pages/CryptoMarket'
import HistoryPage from '@/pages/HistoryPage'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/signals" element={<SignalsDashboard />} />
            <Route path="/performance" element={<PerformanceDashboard />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/market" element={<CryptoMarket />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
