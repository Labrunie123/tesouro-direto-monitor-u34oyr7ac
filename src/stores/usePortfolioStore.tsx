import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'

export type BondType = 'IPCA+' | 'Selic' | 'Prefixado' | 'Renda+' | 'Educa+'

export interface Investment {
  id: string
  title: string
  agent: string
  purchaseDate: string
  maturityDate?: string
  quantity: number
  purchasePrice: number
  rate: number
  type: BondType
  hasSemiannualCoupon?: boolean
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'maturity' | 'coupon'
  date: string
}

interface PortfolioState {
  investments: Investment[]
  settings: {
    lastSync: string
    ipcaAverage24m: number
  }
  addInvestment: (inv: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, inv: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  importInvestments: (invs: Omit<Investment, 'id'>[]) => void
  updateSettings: (settings: Partial<PortfolioState['settings']>) => void
  totalInvested: number
  currentValue: number
  projectedInterestYear: number
  portfolioYield: number
  notifications: Notification[]
  calculateCurrentValue: (inv: Investment) => number
}

const now = new Date()
const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')
const next15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const INITIAL_MOCK_DATA: Investment[] = [
  {
    id: '1',
    title: 'Tesouro IPCA+ 2045',
    agent: 'XP Investimentos',
    purchaseDate: '2023-01-15',
    maturityDate: '2045-05-15',
    quantity: 15,
    purchasePrice: 1200.5,
    rate: 5.5,
    type: 'IPCA+',
  },
  {
    id: '2',
    title: 'Tesouro Selic 2029',
    agent: 'NuInvest',
    purchaseDate: '2023-06-20',
    maturityDate: '2029-03-01',
    quantity: 5,
    purchasePrice: 13500.0,
    rate: 0.1,
    type: 'Selic',
  },
  {
    id: '3',
    title: 'Tesouro Renda+ 2030',
    agent: 'BTG Pactual',
    purchaseDate: '2024-02-10',
    maturityDate: '2030-01-15',
    quantity: 100,
    purchasePrice: 500.0,
    rate: 6.0,
    type: 'Renda+',
  },
  {
    id: '6',
    title: 'Tesouro Prefixado Curto',
    agent: 'Órama',
    purchaseDate: '2021-05-10',
    maturityDate: next15Days,
    quantity: 10,
    purchasePrice: 950.0,
    rate: 11.5,
    type: 'Prefixado',
  },
  {
    id: '7',
    title: 'Tesouro IPCA+ Juros Semestrais',
    agent: 'BTG Pactual',
    purchaseDate: '2022-03-15',
    maturityDate: `2055-${currentMonth}-15`,
    quantity: 20,
    purchasePrice: 4000.0,
    rate: 5.8,
    type: 'IPCA+',
    hasSemiannualCoupon: true,
  },
]

const PortfolioContext = createContext<PortfolioState | undefined>(undefined)

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem('@tesouro-vision:investments')
    return saved ? JSON.parse(saved) : INITIAL_MOCK_DATA
  })

  const [settings, setSettings] = useState({
    lastSync: new Date().toISOString(),
    ipcaAverage24m: 4.5,
  })

  useEffect(() => {
    localStorage.setItem('@tesouro-vision:investments', JSON.stringify(investments))
  }, [investments])

  useEffect(() => {
    let mounted = true
    const autoSyncVNA = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (mounted) {
        setSettings((prev) => ({
          ...prev,
          lastSync: new Date().toISOString(),
          ipcaAverage24m: 4.62,
        }))
      }
    }
    autoSyncVNA()
    return () => {
      mounted = false
    }
  }, [])

  const notifications = useMemo(() => {
    const notifs: Notification[] = []
    const today = new Date()
    investments.forEach((inv) => {
      if (inv.maturityDate) {
        const matDate = new Date(inv.maturityDate)
        const diffTime = matDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays >= 0 && diffDays <= 30) {
          notifs.push({
            id: `mat-${inv.id}`,
            title: 'Vencimento Próximo',
            message: `${inv.title} (${inv.agent}) vence em ${diffDays} dias.`,
            type: 'maturity',
            date: inv.maturityDate,
          })
        }
      }
      if (inv.hasSemiannualCoupon && inv.maturityDate) {
        const matDate = new Date(inv.maturityDate)
        const m1 = matDate.getMonth()
        const m2 = (m1 + 6) % 12
        if (today.getMonth() === m1 || today.getMonth() === m2) {
          notifs.push({
            id: `coup-${inv.id}`,
            title: 'Pagamento de Cupom',
            message: `${inv.title} (${inv.agent}) pagará juros este mês.`,
            type: 'coupon',
            date: today.toISOString(),
          })
        }
      }
    })
    return notifs
  }, [investments])

  const addInvestment = (inv: Omit<Investment, 'id'>) => {
    setInvestments((prev) => [...prev, { ...inv, id: crypto.randomUUID() }])
  }

  const updateInvestment = (id: string, inv: Partial<Investment>) => {
    setInvestments((prev) => prev.map((i) => (i.id === id ? { ...i, ...inv } : i)))
  }

  const deleteInvestment = (id: string) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id))
  }

  const importInvestments = (invs: Omit<Investment, 'id'>[]) => {
    const newInvs = invs.map((i) => ({ ...i, id: crypto.randomUUID() }))
    setInvestments((prev) => [...prev, ...newInvs])
  }

  const updateSettings = (newSettings: Partial<PortfolioState['settings']>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const calculateCurrentValue = (inv: Investment) => {
    const purchaseDate = new Date(inv.purchaseDate)
    const today = new Date()
    const yearsElapsed = Math.max(
      0,
      (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
    )
    const mockYieldRate =
      inv.type === 'Prefixado' ? inv.rate / 100 : (inv.rate + settings.ipcaAverage24m) / 100
    return inv.purchasePrice * Math.pow(1 + mockYieldRate, yearsElapsed)
  }

  const totalInvested = useMemo(() => {
    return investments.reduce((acc, inv) => acc + inv.purchasePrice * inv.quantity, 0)
  }, [investments])

  const currentValue = useMemo(() => {
    return investments.reduce((acc, inv) => acc + calculateCurrentValue(inv) * inv.quantity, 0)
  }, [investments, settings.ipcaAverage24m])

  const portfolioYield =
    totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const projectedInterestYear = currentValue * 0.085

  return React.createElement(
    PortfolioContext.Provider,
    {
      value: {
        investments,
        settings,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        importInvestments,
        updateSettings,
        totalInvested,
        currentValue,
        projectedInterestYear,
        portfolioYield,
        notifications,
        calculateCurrentValue,
      },
    },
    children,
  )
}

export default function usePortfolioStore() {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolioStore must be used within a PortfolioProvider')
  }
  return context
}
