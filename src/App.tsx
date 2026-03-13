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
import NotFound from './pages/NotFound'
import { PortfolioProvider } from './stores/usePortfolioStore'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <PortfolioProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/projections" element={<Projections />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/import" element={<Import />} />
          </Route>
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </PortfolioProvider>
  </BrowserRouter>
)

export default App
