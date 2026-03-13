import React, { useMemo, useState } from 'react'
import { Wallet, Activity, ArrowUpRight, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import usePortfolioStore, { YieldPeriod } from '@/stores/usePortfolioStore'
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters'

export function DashboardCards() {
  const {
    investments,
    totalInvested,
    currentValue,
    portfolioYield,
    yieldPeriod,
    setYieldPeriod,
    calculateCurrentValue,
  } = usePortfolioStore()

  const [projectionPeriod, setProjectionPeriod] = useState('12m')

  const projectedInterest = useMemo(() => {
    let months = 12
    if (projectionPeriod === '6m') months = 6
    if (projectionPeriod === '12m') months = 12
    if (projectionPeriod === '24m') months = 24
    if (projectionPeriod === '60m') months = 60

    let totalProjected = 0
    investments.forEach((inv) => {
      const currentVal = calculateCurrentValue(inv) * inv.quantity
      const mockYieldRate = inv.type === 'Prefixado' ? inv.rate / 100 : (inv.rate + 4.5) / 100
      const futureVal = currentVal * Math.pow(1 + mockYieldRate, months / 12)
      totalProjected += futureVal - currentVal
    })
    return totalProjected
  }, [investments, projectionPeriod, calculateCurrentValue])

  const nextCoupon = useMemo(() => {
    let nextDate: Date | null = null
    let netAmount = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // First pass: identify the closest chronological date
    investments.forEach((inv) => {
      if (inv.hasSemiannualCoupon) {
        let pDate = new Date(inv.purchaseDate)
        pDate.setHours(0, 0, 0, 0)
        while (pDate < today) {
          pDate.setMonth(pDate.getMonth() + 6)
        }
        if (!nextDate || pDate < nextDate) {
          nextDate = new Date(pDate)
        }
      }
    })

    if (!nextDate) return null

    // Second pass: sum the net amounts for all titles paying on that date
    investments.forEach((inv) => {
      if (inv.hasSemiannualCoupon) {
        let pDate = new Date(inv.purchaseDate)
        pDate.setHours(0, 0, 0, 0)
        while (pDate < today) {
          pDate.setMonth(pDate.getMonth() + 6)
        }

        if (pDate.getTime() === nextDate!.getTime()) {
          const grossAmount = inv.purchasePrice * inv.quantity * (inv.rate / 200)
          const purchaseTime = new Date(inv.purchaseDate).getTime()
          const daysElapsed = Math.floor((pDate.getTime() - purchaseTime) / 86400000)

          let taxRate = 0.15
          if (daysElapsed <= 180) taxRate = 0.225
          else if (daysElapsed <= 360) taxRate = 0.2
          else if (daysElapsed <= 720) taxRate = 0.175

          netAmount += grossAmount * (1 - taxRate)
        }
      }
    })

    return nextDate ? { date: nextDate, amount: netAmount } : null
  }, [investments])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card
        className="hover:shadow-md transition-shadow animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          <p className="text-xs text-muted-foreground mt-1">Soma das compras originais</p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Bruto Atual</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(currentValue)}</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            {formatCurrency(currentValue - totalInvested)} de lucro
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow animate-fade-in-up border-primary/20 bg-primary/5"
        style={{ animationDelay: '200ms' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
          <Select value={yieldPeriod} onValueChange={(v) => setYieldPeriod(v as YieldPeriod)}>
            <SelectTrigger className="w-[85px] h-6 text-[10px] border-primary/30 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Total</SelectItem>
              <SelectItem value="24m">24m</SelectItem>
              <SelectItem value="12m">12m</SelectItem>
              <SelectItem value="6m">6m</SelectItem>
              <SelectItem value="3m">3m</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(portfolioYield)}</div>
          <p className="text-xs text-muted-foreground mt-1 text-emerald-600 font-medium">
            Variação no período
          </p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projeção Juros</CardTitle>
          <Select value={projectionPeriod} onValueChange={setProjectionPeriod}>
            <SelectTrigger className="w-[80px] h-6 text-[10px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
              <SelectItem value="24m">24 meses</SelectItem>
              <SelectItem value="60m">5 anos</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projectedInterest)}</div>
          <p className="text-xs text-muted-foreground mt-1">Estimativa de valorização</p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Próximo Cupom (Líquido)</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {nextCoupon ? (
            <>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(nextCoupon.amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Previsto p/ {formatDate(nextCoupon.date)}
              </p>
            </>
          ) : (
            <>
              <div className="text-xl font-medium text-muted-foreground mt-1">-</div>
              <p className="text-xs text-muted-foreground mt-1">Sem títulos c/ cupom</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
