import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
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
import {
  ArrowUpRight,
  Wallet,
  Percent,
  PieChart as PieChartIcon,
  Activity,
  FileText,
  Calculator,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import usePortfolioStore, { YieldPeriod } from '@/stores/usePortfolioStore'
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters'

export default function Index() {
  const {
    investments,
    totalInvested,
    currentValue,
    projectedInterestYear,
    portfolioYield,
    yieldPeriod,
    setYieldPeriod,
  } = usePortfolioStore()

  const allocationData = useMemo(() => {
    const agents: Record<string, number> = {}
    investments.forEach((inv) => {
      const val = inv.purchasePrice * inv.quantity
      agents[inv.agent] = (agents[inv.agent] || 0) + val
    })
    return Object.entries(agents)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [investments])

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Acompanhamento consolidado da sua carteira.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/simulator">
              <Calculator className="h-4 w-4" />
              Simulador
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/report" target="_blank">
              <FileText className="h-4 w-4" />
              Gerar Relatório PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          className="hover:shadow-md transition-shadow animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Juros (12m)</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(projectedInterestYear)}</div>
            <p className="text-xs text-muted-foreground mt-1">Estimativa de cupons e valorização</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow animate-fade-in-up border-primary/20 bg-primary/5"
          style={{ animationDelay: '300ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
            <Select value={yieldPeriod} onValueChange={(v) => setYieldPeriod(v as YieldPeriod)}>
              <SelectTrigger className="w-[100px] h-6 text-[10px] border-primary/30 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Total</SelectItem>
                <SelectItem value="24m">Últimos 24m</SelectItem>
                <SelectItem value="12m">Últimos 12m</SelectItem>
                <SelectItem value="6m">Últimos 6m</SelectItem>
                <SelectItem value="3m">Últimos 3m</SelectItem>
                <SelectItem value="1m">Último Mês</SelectItem>
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
      </div>

      <div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <Card className="lg:col-span-4 flex flex-col">
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

        <Card className="lg:col-span-3 flex flex-col">
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
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
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
    </div>
  )
}
