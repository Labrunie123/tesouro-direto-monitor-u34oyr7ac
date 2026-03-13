import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from 'react'

export type BondType = 'IPCA+' | 'Selic' | 'Prefixado' | 'Renda+' | 'Educa+'
export type YieldPeriod = '1m' | '3m' | '6m' | '12m' | '24m' | 'all'

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

export interface BrokerConnection {
  id: string
  name: string
  status: 'connected' | 'disconnected'
  lastSync?: string
  logo?: string
}

export interface Dividend {
  id: string
  date: string
  amount: number
  title: string
  agent: string
}

interface PortfolioState {
  investments: Investment[]
  settings: { lastSync: string; ipcaAverage24m: number }
  yieldPeriod: YieldPeriod
  brokers: BrokerConnection[]
  dividends: Dividend[]
  nextCoupon: { date: Date; amount: number } | null
  addInvestment: (inv: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, inv: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  importInvestments: (invs: Omit<Investment, 'id'>[]) => void
  updateSettings: (settings: Partial<PortfolioState['settings']>) => void
  setYieldPeriod: (period: YieldPeriod) => void
  toggleBroker: (id: string) => void
  totalInvested: number
  currentValue: number
  portfolioYield: number
  notifications: Notification[]
  calculateCurrentValue: (inv: Investment) => number
  getYieldForPeriod: (inv: Investment, period: YieldPeriod) => number
}

const now = new Date()
const next15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const INITIAL_MOCK_DATA: Investment[] = [
  {
    id: '1',
    title: 'Tesouro IPCA+ com Juros Semestrais 2045',
    agent: 'XP Investimentos',
    purchaseDate: '2023-01-15',
    maturityDate: '2045-05-15',
    quantity: 15,
    purchasePrice: 1200.5,
    rate: 5.5,
    type: 'IPCA+',
    hasSemiannualCoupon: true,
  },
  {
    id: '1-lot2',
    title: 'Tesouro IPCA+ com Juros Semestrais 2045',
    agent: 'XP Investimentos',
    purchaseDate: '2024-05-10',
    maturityDate: '2045-05-15',
    quantity: 5,
    purchasePrice: 1250.0,
    rate: 6.1,
    type: 'IPCA+',
    hasSemiannualCoupon: true,
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
    title: 'Tesouro Prefixado com Juros Semestrais 2033',
    agent: 'Itaú Corretora',
    purchaseDate: '2023-01-01',
    maturityDate: '2033-01-01',
    quantity: 20,
    purchasePrice: 980.0,
    rate: 10.5,
    type: 'Prefixado',
    hasSemiannualCoupon: true,
  },
]

const INITIAL_BROKERS: BrokerConnection[] = [
  {
    id: 'b1',
    name: 'XP',
    status: 'disconnected',
    logo: 'https://img.usecurling.com/i?q=investment&color=black&shape=fill',
  },
  {
    id: 'b2',
    name: 'BTG',
    status: 'connected',
    lastSync: new Date().toISOString(),
    logo: 'https://img.usecurling.com/i?q=bank&color=blue&shape=fill',
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
  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>('all')
  const [brokers, setBrokers] = useState<BrokerConnection[]>(INITIAL_BROKERS)

  const dividends = useMemo(() => {
    const data: Dividend[] = []
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    investments.forEach((inv) => {
      if (inv.hasSemiannualCoupon) {
        let paymentDate = new Date(inv.purchaseDate)
        paymentDate.setHours(0, 0, 0, 0)
        paymentDate.setMonth(paymentDate.getMonth() + 6)
        while (paymentDate <= currentDate) {
          data.push({
            id: crypto.randomUUID(),
            date: paymentDate.toISOString().split('T')[0],
            amount: inv.purchasePrice * inv.quantity * (inv.rate / 200),
            title: inv.title,
            agent: inv.agent,
          })
          paymentDate.setMonth(paymentDate.getMonth() + 6)
        }
      }
    })
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [investments])

  useEffect(
    () => localStorage.setItem('@tesouro-vision:investments', JSON.stringify(investments)),
    [investments],
  )

  const notifications = useMemo(() => {
    const notifs: Notification[] = []
    const today = new Date()
    investments.forEach((inv) => {
      if (inv.maturityDate) {
        const matDate = new Date(inv.maturityDate)
        const diffDays = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays >= 0 && diffDays <= 30) {
          notifs.push({
            id: `mat-${inv.id}`,
            title: 'Vencimento Próximo',
            message: `${inv.title} vence em ${diffDays} dias.`,
            type: 'maturity',
            date: inv.maturityDate,
          })
        }
      }
    })
    return notifs
  }, [investments])

  const addInvestment = (inv: Omit<Investment, 'id'>) =>
    setInvestments((p) => [...p, { ...inv, id: crypto.randomUUID() }])
  const updateInvestment = (id: string, inv: Partial<Investment>) =>
    setInvestments((p) => p.map((i) => (i.id === id ? { ...i, ...inv } : i)))
  const deleteInvestment = (id: string) => setInvestments((p) => p.filter((i) => i.id !== id))
  const importInvestments = (invs: Omit<Investment, 'id'>[]) =>
    setInvestments((p) => [...p, ...invs.map((i) => ({ ...i, id: crypto.randomUUID() }))])
  const updateSettings = (newSettings: Partial<PortfolioState['settings']>) =>
    setSettings((p) => ({ ...p, ...newSettings }))
  const toggleBroker = (id: string) =>
    setBrokers((p) =>
      p.map((b) =>
        b.id === id
          ? {
              ...b,
              status: b.status === 'connected' ? 'disconnected' : 'connected',
              lastSync: b.status === 'disconnected' ? new Date().toISOString() : undefined,
            }
          : b,
      ),
    )

  const calculateCurrentValue = useCallback(
    (inv: Investment) => {
      const yearsElapsed = Math.max(
        0,
        (new Date().getTime() - new Date(inv.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365),
      )
      const mockYieldRate =
        inv.type === 'Prefixado' ? inv.rate / 100 : (inv.rate + settings.ipcaAverage24m) / 100
      return inv.purchasePrice * Math.pow(1 + mockYieldRate, yearsElapsed)
    },
    [settings.ipcaAverage24m],
  )

  const getYieldForPeriod = useCallback(
    (inv: Investment, period: YieldPeriod) => {
      const totalYield = calculateCurrentValue(inv) / inv.purchasePrice - 1
      const purchaseDate = new Date(inv.purchaseDate)
      const today = new Date()
      const monthsElapsed =
        (today.getFullYear() - purchaseDate.getFullYear()) * 12 +
        today.getMonth() -
        purchaseDate.getMonth()
      if (monthsElapsed === 0) return totalYield * 100
      const monthlyYield = totalYield / Math.max(1, monthsElapsed)

      switch (period) {
        case '1m':
          return monthlyYield * 1 * 100
        case '3m':
          return monthlyYield * Math.min(3, monthsElapsed) * 100
        case '6m':
          return monthlyYield * Math.min(6, monthsElapsed) * 100
        case '12m':
          return monthlyYield * Math.min(12, monthsElapsed) * 100
        case '24m':
          return monthlyYield * Math.min(24, monthsElapsed) * 100
        default:
          return totalYield * 100
      }
    },
    [calculateCurrentValue],
  )

  const nextCoupon = useMemo(() => {
    let nextDate: Date | null = null
    let netAmount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const eligibleInvestments = investments.filter(
      (inv) => (inv.type === 'IPCA+' || inv.type === 'Prefixado') && inv.hasSemiannualCoupon,
    )

    if (eligibleInvestments.length === 0) return null

    const getNextDate = (refDateStr: string, maturityDateStr?: string) => {
      const [, month, day] = refDateStr.split('T')[0].split('-').map(Number)
      const d1 = new Date(today.getFullYear(), month - 1, day)
      const d2 = new Date(today.getFullYear(), (month - 1 + 6) % 12, day)

      if (d1 < today) d1.setFullYear(d1.getFullYear() + 1)
      if (d2 < today) d2.setFullYear(d2.getFullYear() + 1)

      const pDate = d1 < d2 ? d1 : d2

      if (maturityDateStr) {
        const [mYear, mMonth, mDay] = maturityDateStr.split('T')[0].split('-').map(Number)
        const matDate = new Date(mYear, mMonth - 1, mDay)
        if (pDate > matDate) return null
      }

      return pDate
    }

    eligibleInvestments.forEach((inv) => {
      const pDate = getNextDate(inv.maturityDate || inv.purchaseDate, inv.maturityDate)
      if (pDate) {
        if (!nextDate || pDate < nextDate) {
          nextDate = new Date(pDate)
        }
      }
    })

    if (!nextDate) return null

    eligibleInvestments.forEach((inv) => {
      const pDate = getNextDate(inv.maturityDate || inv.purchaseDate, inv.maturityDate)
      if (pDate && pDate.getTime() === nextDate!.getTime()) {
        let grossAmount = 0
        if (inv.type === 'Prefixado') {
          grossAmount = 1000 * inv.quantity * 0.0488088
        } else {
          const vna = calculateCurrentValue(inv)
          grossAmount = vna * inv.quantity * 0.029563
        }

        const [pYear, pMonth, pDay] = inv.purchaseDate.split('T')[0].split('-').map(Number)
        const purchaseTime = new Date(pYear, pMonth - 1, pDay).getTime()
        const daysElapsed = Math.round((pDate.getTime() - purchaseTime) / 86400000)

        let taxRate = 0.15
        if (daysElapsed <= 180) taxRate = 0.225
        else if (daysElapsed <= 360) taxRate = 0.2
        else if (daysElapsed <= 720) taxRate = 0.175

        netAmount += grossAmount * (1 - taxRate)
      }
    })

    return { date: nextDate, amount: netAmount }
  }, [investments, calculateCurrentValue])

  const totalInvested = useMemo(
    () => investments.reduce((acc, inv) => acc + inv.purchasePrice * inv.quantity, 0),
    [investments],
  )
  const currentValue = useMemo(
    () => investments.reduce((acc, inv) => acc + calculateCurrentValue(inv) * inv.quantity, 0),
    [investments, calculateCurrentValue],
  )
  const portfolioYield = useMemo(() => {
    if (totalInvested === 0) return 0
    let totalWeightedYield = 0
    investments.forEach((inv) => {
      const invWeight = (inv.purchasePrice * inv.quantity) / totalInvested
      totalWeightedYield += getYieldForPeriod(inv, yieldPeriod) * invWeight
    })
    return totalWeightedYield
  }, [investments, totalInvested, yieldPeriod, getYieldForPeriod])

  return React.createElement(
    PortfolioContext.Provider,
    {
      value: {
        investments,
        settings,
        yieldPeriod,
        brokers,
        dividends,
        nextCoupon,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        importInvestments,
        updateSettings,
        setYieldPeriod,
        toggleBroker,
        totalInvested,
        currentValue,
        portfolioYield,
        notifications,
        calculateCurrentValue,
        getYieldForPeriod,
      },
    },
    children,
  )
}

export default function usePortfolioStore() {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error('usePortfolioStore must be used within a PortfolioProvider')
  return context
}
