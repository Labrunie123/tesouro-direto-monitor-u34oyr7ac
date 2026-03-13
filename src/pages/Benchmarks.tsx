import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { Target, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatPercent } from '@/lib/formatters'

export default function Benchmarks() {
  const { portfolioYield } = usePortfolioStore()

  const comparisonData = useMemo(() => {
    const data = []
    let port = 1000
    let cdi = 1000
    let ipca = 1000
    let ipca6 = 1000

    for (let i = 2020; i <= 2024; i++) {
      data.push({
        ano: i.toString(),
        Carteira: parseFloat(port.toFixed(2)),
        CDI: parseFloat(cdi.toFixed(2)),
        IPCA: parseFloat(ipca.toFixed(2)),
        'IPCA+6%': parseFloat(ipca6.toFixed(2)),
      })
      // simulate realistic historic jumps
      port *= 1 + (0.08 + Math.random() * 0.04)
      cdi *= 1 + 0.09
      ipca *= 1 + 0.05
      ipca6 *= 1 + 0.11
    }
    return data
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Análise de Performance</h2>
        <p className="text-muted-foreground">
          Compare sua carteira com os principais indexadores do mercado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              Alpha (Carteira vs CDI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">+1.2%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sua carteira está rendendo mais que o CDI no acumulado do ano.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              Prêmio Real (vs IPCA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPercent(portfolioYield - 4.5)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho real acima da inflação média (4.5%).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Volatilidade Estimada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Baixa</div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado na forte alocação em Tesouro Selic e Pós-fixados curtos.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crescimento Histórico (Base 1000)</CardTitle>
          <CardDescription>Evolução de R$ 1.000 investidos nos últimos 5 anos.</CardDescription>
        </CardHeader>
        <CardContent className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCarteira" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))',
                }}
                itemStyle={{ fontWeight: 500 }}
              />
              <Legend verticalAlign="top" height={36} iconType="plainline" />
              <Area
                type="monotone"
                dataKey="Carteira"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCarteira)"
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="IPCA+6%"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="CDI"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="IPCA"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
