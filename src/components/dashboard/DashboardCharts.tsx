import React, { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency } from '@/lib/formatters'

export function DashboardCharts() {
  const { investments, calculateCurrentValue } = usePortfolioStore()

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))',
    'hsl(var(--muted-foreground))',
  ]

  const allocationData = useMemo(() => {
    const agents: Record<string, number> = {}
    investments.forEach((inv) => {
      const val = calculateCurrentValue(inv) * inv.quantity
      agents[inv.agent] = (agents[inv.agent] || 0) + val
    })
    return Object.entries(agents)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [investments, calculateCurrentValue])

  const allocationByTypeData = useMemo(() => {
    const groups: Record<string, number> = {
      'Pós-fixados': 0,
      'Pré-fixados': 0,
      'Pré-fixados c/ Juros Semestrais': 0,
      'IPCA+': 0,
      'IPCA+ c/ Juros Semestrais': 0,
      'Renda+': 0,
      'Educa+': 0,
    }

    investments.forEach((inv) => {
      const val = calculateCurrentValue(inv) * inv.quantity
      if (inv.type === 'Selic') {
        groups['Pós-fixados'] += val
      } else if (inv.type === 'Prefixado') {
        if (inv.hasSemiannualCoupon) groups['Pré-fixados c/ Juros Semestrais'] += val
        else groups['Pré-fixados'] += val
      } else if (inv.type === 'IPCA+') {
        if (inv.hasSemiannualCoupon) groups['IPCA+ c/ Juros Semestrais'] += val
        else groups['IPCA+'] += val
      } else if (inv.type === 'Renda+') {
        groups['Renda+'] += val
      } else if (inv.type === 'Educa+') {
        groups['Educa+'] += val
      }
    })

    return Object.entries(groups)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [investments, calculateCurrentValue])

  const mockBenchmarkData = useMemo(() => {
    const data = []
    let portVal = 100
    let cdiVal = 100
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      data.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short' }),
        Carteira: parseFloat(portVal.toFixed(2)),
        CDI: parseFloat(cdiVal.toFixed(2)),
      })
      portVal *= 1 + (0.008 + Math.random() * 0.005)
      cdiVal *= 1 + 0.009
    }
    return data
  }, [])

  return (
    <div className="space-y-6">
      <div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 animate-fade-in-up"
        style={{ animationDelay: '500ms' }}
      >
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Alocação por Tipo de Título</CardTitle>
            <CardDescription>Distribuição do patrimônio por categoria</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {allocationByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationByTypeData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationByTypeData.map((e, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                <PieChartIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Alocação por Custódia</CardTitle>
            <CardDescription>Distribuição do patrimônio por corretora</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {allocationData.map((e, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                <PieChartIcon className="h-12 w-12 mb-2 opacity-20" />
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Crescimento vs CDI (12m)</CardTitle>
            <CardDescription>Comparativo de rentabilidade base 100</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ChartContainer
              config={{
                Carteira: { label: 'Minha Carteira', color: 'hsl(var(--primary))' },
                CDI: { label: 'CDI 100%', color: 'hsl(var(--muted-foreground))' },
              }}
            >
              <LineChart
                data={mockBenchmarkData}
                margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="Carteira"
                  stroke="var(--color-Carteira)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="CDI"
                  stroke="var(--color-CDI)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
