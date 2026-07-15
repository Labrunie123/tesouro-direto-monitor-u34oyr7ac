import { VnaEntry, fetchVnaData, findVnaForTitle, DEFAULT_VNA_DATA } from '@/lib/vna-service'
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
  userId: string
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
  logo: string
}

export interface Dividend {
  id: string
  date: string
  amount: number
  title: string
  agent: string
}

export interface ConnectionLog {
  id: string
  brokerId: string
  brokerName: string
  action: 'connected' | 'disconnected'
  timestamp: string
}

export interface UserBroker {
  id: string
  userId: string
  name: string
}

interface PortfolioState {
  allInvestments: Investment[]
  investments: Investment[]
  currentUserId: string | null
  setCurrentUserId: (id: string | null) => void
  userBrokers: UserBroker[]
  addBroker: (name: string) => void
  settings: { lastSync: string; ipcaAverage24m: number }
  yieldPeriod: YieldPeriod
  brokers: BrokerConnection[]
  dividends: Dividend[]
  nextCoupon: { date: Date; amount: number } | null
  connectionLogs: ConnectionLog[]
  addConnectionLog: (log: Omit<ConnectionLog, 'id' | 'timestamp'>) => void
  addInvestment: (inv: Omit<Investment, 'id' | 'userId'>) => void
  updateInvestment: (id: string, inv: Partial<Investment>) => void
  deleteInvestment: (id: string) => void
  importInvestments: (invs: Omit<Investment, 'id' | 'userId'>[]) => void
  updateSettings: (settings: Partial<PortfolioState['settings']>) => void
  setYieldPeriod: (period: YieldPeriod) => void
  toggleBroker: (id: string) => void
  setBrokerStatus: (id: string, status: 'connected' | 'disconnected') => void
  totalInvested: number
  currentValue: number
  portfolioYield: number
  notifications: Notification[]
  calculateCurrentValue: (inv: Investment, targetDate?: Date) => number
  getYieldForPeriod: (inv: Investment, period: YieldPeriod) => number
  vnaData: VnaEntry[]
  vnaDate: string
  vnaLoading: boolean
  fetchVna: () => Promise<void>
}

const now = new Date()
const next15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const INITIAL_MOCK_DATA: Investment[] = [
  {
    id: '1-admin',
    userId: '1',
    title: 'Tesouro IPCA+ com Juros Semestrais 2045',
    agent: 'XP Investimentos',
    purchaseDate: '2022-01-15',
    maturityDate: '2045-05-15',
    quantity: 20,
    purchasePrice: 1100.5,
    rate: 5.8,
    type: 'IPCA+',
    hasSemiannualCoupon: true,
  },
  {
    id: '2-admin',
    userId: '1',
    title: 'Tesouro Selic 2029',
    agent: 'BTG Pactual',
    purchaseDate: '2024-01-10',
    maturityDate: '2029-03-01',
    quantity: 10,
    purchasePrice: 14000.0,
    rate: 0.15,
    type: 'Selic',
  },
  {
    id: '1',
    userId: '2',
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
    userId: '2',
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
    userId: '2',
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
    userId: '3',
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
    userId: '2',
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
    userId: '3',
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
    id: 'xp',
    name: 'XP Investimentos',
    logo: 'https://img.usecurling.com/i?q=finance&color=black',
    status: 'disconnected',
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    logo: 'https://img.usecurling.com/i?q=bank&color=blue',
    status: 'disconnected',
  },
  {
    id: 'nuinvest',
    name: 'NuInvest',
    logo: 'https://img.usecurling.com/i?q=wallet&color=purple',
    status: 'disconnected',
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    logo: 'https://img.usecurling.com/i?q=globe&color=orange',
    status: 'disconnected',
  },
]

const INITIAL_USER_BROKERS: UserBroker[] = [
  { id: 'ub-1-1', userId: '1', name: 'XP Investimentos' },
  { id: 'ub-1-2', userId: '1', name: 'BTG Pactual' },
  { id: 'ub-2-1', userId: '2', name: 'XP Investimentos' },
  { id: 'ub-2-2', userId: '2', name: 'NuInvest' },
  { id: 'ub-2-3', userId: '2', name: 'Órama' },
  { id: 'ub-3-1', userId: '3', name: 'BTG Pactual' },
  { id: 'ub-3-2', userId: '3', name: 'Itaú Corretora' },
]

const PortfolioContext = createContext<PortfolioState | undefined>(undefined)

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [allInvestments, setAllInvestments] = useState<Investment[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:investments-all')
      return saved ? JSON.parse(saved) : INITIAL_MOCK_DATA
    } catch {
      return INITIAL_MOCK_DATA
    }
  })

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:current-user')
      return saved || '2'
    } catch {
      return '2'
    }
  })

  const [allUserBrokers, setAllUserBrokers] = useState<UserBroker[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:user-brokers')
      return saved ? JSON.parse(saved) : INITIAL_USER_BROKERS
    } catch {
      return INITIAL_USER_BROKERS
    }
  })

  const investments = useMemo(() => {
    if (!currentUserId) return []
    return allInvestments.filter((i) => i.userId === currentUserId)
  }, [allInvestments, currentUserId])

  const userBrokers = useMemo(() => {
    if (!currentUserId) return []
    return allUserBrokers.filter((b) => b.userId === currentUserId)
  }, [allUserBrokers, currentUserId])

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:settings')
      return saved ? JSON.parse(saved) : { lastSync: new Date().toISOString(), ipcaAverage24m: 4.5 }
    } catch {
      return { lastSync: new Date().toISOString(), ipcaAverage24m: 4.5 }
    }
  })

  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:yieldPeriod')
      return saved ? JSON.parse(saved) : 'all'
    } catch {
      return 'all'
    }
  })

  const [brokers, setBrokers] = useState<BrokerConnection[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:brokers-v2')
      return saved ? JSON.parse(saved) : INITIAL_BROKERS
    } catch {
      return INITIAL_BROKERS
    }
  })

  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:connection-logs')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [vnaData, setVnaData] = useState<VnaEntry[]>(() => {
    try {
      const saved = localStorage.getItem('@tesouro-vision:vna-data')
      return saved ? JSON.parse(saved) : DEFAULT_VNA_DATA
    } catch {
      return DEFAULT_VNA_DATA
    }
  })

  const [vnaDate, setVnaDate] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('@tesouro-vision:vna-date') || new Date().toISOString().split('T')[0]
      )
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  })

  const [vnaLoading, setVnaLoading] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:investments-all', JSON.stringify(allInvestments))
    } catch (e) {
      console.warn('Failed to save investments to local storage', e)
    }
  }, [allInvestments])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:settings', JSON.stringify(settings))
    } catch {
      /* intentionally ignored */
    }
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:yieldPeriod', JSON.stringify(yieldPeriod))
    } catch {
      /* intentionally ignored */
    }
  }, [yieldPeriod])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:brokers-v2', JSON.stringify(brokers))
    } catch {
      /* intentionally ignored */
    }
  }, [brokers])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:connection-logs', JSON.stringify(connectionLogs))
    } catch {
      /* intentionally ignored */
    }
  }, [connectionLogs])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:vna-data', JSON.stringify(vnaData))
    } catch {
      /* intentionally ignored */
    }
  }, [vnaData])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:vna-date', vnaDate)
    } catch {
      /* intentionally ignored */
    }
  }, [vnaDate])

  useEffect(() => {
    try {
      localStorage.setItem('@tesouro-vision:user-brokers', JSON.stringify(allUserBrokers))
    } catch {
      /* intentionally ignored */
    }
  }, [allUserBrokers])

  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem('@tesouro-vision:current-user', currentUserId)
      }
    } catch {
      /* intentionally ignored */
    }
  }, [currentUserId])

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

  const addInvestment = (inv: Omit<Investment, 'id' | 'userId'>) => {
    if (!currentUserId) return
    setAllInvestments((p) => [...p, { ...inv, id: crypto.randomUUID(), userId: currentUserId }])
  }

  const updateInvestment = (id: string, inv: Partial<Investment>) =>
    setAllInvestments((p) => p.map((i) => (i.id === id ? { ...i, ...inv } : i)))

  const deleteInvestment = (id: string) => setAllInvestments((p) => p.filter((i) => i.id !== id))

  const importInvestments = (invs: Omit<Investment, 'id' | 'userId'>[]) => {
    if (!currentUserId) return
    setAllInvestments((p) => [
      ...p,
      ...invs.map((i) => ({ ...i, id: crypto.randomUUID(), userId: currentUserId })),
    ])
  }

  const updateSettings = (newSettings: Partial<PortfolioState['settings']>) =>
    setSettings((p) => ({ ...p, ...newSettings }))

  const addConnectionLog = (log: Omit<ConnectionLog, 'id' | 'timestamp'>) => {
    setConnectionLogs((p) => [
      { ...log, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ...p,
    ])
  }

  const addBroker = (name: string) => {
    if (!currentUserId || !name.trim()) return
    setAllUserBrokers((p) => {
      const exists = p.some(
        (b) => b.userId === currentUserId && b.name.toLowerCase() === name.trim().toLowerCase(),
      )
      if (exists) return p
      return [...p, { id: crypto.randomUUID(), userId: currentUserId, name: name.trim() }]
    })
  }

  const fetchVna = useCallback(async () => {
    setVnaLoading(true)
    try {
      const result = await fetchVnaData()
      setVnaData(result.entries)
      setVnaDate(result.date)
      try {
        localStorage.setItem('@tesouro-vision:vna-date', result.date)
      } catch {
        /* intentionally ignored */
      }
    } catch (e) {
      console.warn('Failed to fetch VNA data', e)
    } finally {
      setVnaLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVna()
  }, [fetchVna])

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

  const setBrokerStatus = (id: string, status: 'connected' | 'disconnected') =>
    setBrokers((p) =>
      p.map((b) =>
        b.id === id
          ? {
              ...b,
              status,
              lastSync: status === 'connected' ? new Date().toISOString() : undefined,
            }
          : b,
      ),
    )

  const calculateCurrentValue = useCallback(
    (inv: Investment, targetDate?: Date) => {
      if (inv.type === 'IPCA+') {
        const vna = findVnaForTitle(vnaData, inv.title)
        if (vna !== null && vna > 0) return vna
      }
      const date = targetDate || new Date()
      const yearsElapsed = Math.max(
        0,
        (date.getTime() - new Date(inv.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      )
      const mockYieldRate =
        inv.type === 'Prefixado' ? inv.rate / 100 : (inv.rate + settings.ipcaAverage24m) / 100
      return inv.purchasePrice * Math.pow(1 + mockYieldRate, yearsElapsed)
    },
    [settings.ipcaAverage24m, vnaData],
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

    const getNextDate = (maturityDateStr?: string) => {
      if (!maturityDateStr) return null
      const [mYear, mMonth, mDay] = maturityDateStr.split('T')[0].split('-').map(Number)
      const month1 = mMonth - 1
      const month2 = (mMonth - 1 + 6) % 12
      const d1 = new Date(today.getFullYear(), month1, mDay)
      const d2 = new Date(today.getFullYear(), month2, mDay)
      if (d1 < today) d1.setFullYear(d1.getFullYear() + 1)
      if (d2 < today) d2.setFullYear(d2.getFullYear() + 1)
      const pDate = d1 < d2 ? d1 : d2
      const matDate = new Date(mYear, mMonth - 1, mDay)
      if (pDate > matDate) return null
      return pDate
    }

    eligibleInvestments.forEach((inv) => {
      const pDate = getNextDate(inv.maturityDate || inv.purchaseDate)
      if (pDate && (!nextDate || pDate < nextDate)) nextDate = new Date(pDate)
    })

    if (!nextDate) return null

    eligibleInvestments.forEach((inv) => {
      const pDate = getNextDate(inv.maturityDate || inv.purchaseDate)
      if (pDate && pDate.getTime() === nextDate!.getTime()) {
        let grossAmount = 0
        if (inv.type === 'Prefixado') {
          grossAmount = 1000 * inv.quantity * 0.0488088
        } else {
          const baseDate = new Date('2024-01-01')
          const baseVNA = 4200
          const yearsToCoupon =
            (pDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          const projectedVna =
            baseVNA * Math.pow(1 + settings.ipcaAverage24m / 100, Math.max(0, yearsToCoupon))
          grossAmount = projectedVna * inv.quantity * 0.02956
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
  }, [investments, settings.ipcaAverage24m])

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
        allInvestments,
        investments,
        currentUserId,
        setCurrentUserId,
        userBrokers,
        addBroker,
        settings,
        yieldPeriod,
        brokers,
        dividends,
        nextCoupon,
        connectionLogs,
        addConnectionLog,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        importInvestments,
        updateSettings,
        setYieldPeriod,
        toggleBroker,
        setBrokerStatus,
        totalInvested,
        currentValue,
        portfolioYield,
        notifications,
        calculateCurrentValue,
        getYieldForPeriod,
        vnaData,
        vnaDate,
        vnaLoading,
        fetchVna,
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
