import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Index from './pages/Index'
import Portfolio from './pages/Portfolio'
import Projections from './pages/Projections'
import Benchmarks from './pages/Benchmarks'
import Import from './pages/Import'
import Simulator from './pages/Simulator'
import Report from './pages/Report'
import Dividends from './pages/Dividends'
import Users from './pages/Users'
import Login from './pages/Login'
import AdminComparison from './pages/AdminComparison'
import AdminSettings from './pages/AdminSettings'
import AdminUserPortfolio from './pages/AdminUserPortfolio'
import NotFound from './pages/NotFound'
import { PortfolioProvider } from './stores/usePortfolioStore'
import { UserProvider } from './stores/useUserStore'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <UserProvider>
      <PortfolioProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/dividends" element={<Dividends />} />
              <Route path="/projections" element={<Projections />} />
              <Route path="/benchmarks" element={<Benchmarks />} />
              <Route path="/simulator" element={<Simulator />} />
              <Route path="/users" element={<Users />} />
              <Route path="/import" element={<Import />} />
              <Route path="/admin/comparison" element={<AdminComparison />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/users/:userId/portfolio" element={<AdminUserPortfolio />} />
            </Route>
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PortfolioProvider>
    </UserProvider>
  </BrowserRouter>
)

export default App
