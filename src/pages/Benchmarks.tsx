import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Target,
  TrendingUp,
  AlertTriangle,
  LineChart as LineIcon,
  BarChart as BarIcon,
  AreaChart as AreaIcon,
  Table2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatPercent, formatCurrency } from '@/lib/formatters'

export default function Benchmarks() {
  const { portfolioYield } = usePortfolioStore()
  const [chartType, setChartType] = useState('area')
  const [period, setPeriod] = useState('5Y')
  const [viewAsTable, setViewAsTable] = useState(false)

  const comparisonData = useMemo(() => {
    const data = []
    let port = 1000
    let cdi = 1000
    let ipca = 1000
    let ipca6 = 1000

    const currentYear = new Date().getFullYear()
    const yearsToShow = period === '1Y' ? 1 : period === '3Y' ? 3 : period === '5Y' ? 5 : 10
    const startYear = currentYear - yearsToShow

    for (let i = startYear; i <= currentYear; i++) {
      data.push({
        ano: i.toString(),
        Carteira: parseFloat(port.toFixed(2)),
        CDI: parseFloat(cdi.toFixed(2)),
        IPCA: parseFloat(ipca.toFixed(2)),
        'IPCA+6%': parseFloat(ipca6.toFixed(2)),
      })
      port *= 1 + (0.08 + Math.random() * 0.04)
      cdi *= 1 + 0.09
      ipca *= 1 + 0.05
      ipca6 *= 1 + 0.11
    }
    return data
  }, [period])

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
              <TrendingUp className="h-4 w-4" /> Alpha (Carteira vs CDI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">+1.2%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sua carteira rendeu mais que o CDI no acumulado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" /> Prêmio Real (vs IPCA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPercent(portfolioYield - 4.5)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho real acima da inflação média.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" /> Volatilidade Estimada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Baixa</div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado na forte alocação em Tesouro Selic.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Crescimento Histórico (Base 1000)</CardTitle>
            <CardDescription>Evolução de R$ 1.000 investidos.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v)}
              size="sm"
            >
              <ToggleGroupItem value="1Y">1A</ToggleGroupItem>
              <ToggleGroupItem value="3Y">3A</ToggleGroupItem>
              <ToggleGroupItem value="5Y">5A</ToggleGroupItem>
              <ToggleGroupItem value="Max">Max</ToggleGroupItem>
            </ToggleGroup>

            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(v) => v && setChartType(v)}
              size="sm"
              disabled={viewAsTable}
            >
              <ToggleGroupItem value="line" aria-label="Linha">
                <LineIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="bar" aria-label="Barras">
                <BarIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area" aria-label="Área">
                <AreaIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Toggle
              pressed={viewAsTable}
              onPressedChange={setViewAsTable}
              size="sm"
              variant="outline"
              className="ml-1"
            >
              <Table2 className="h-4 w-4" />
            </Toggle>
          </div>
        </CardHeader>
        <CardContent className={viewAsTable ? '' : 'h-[450px]'}>
          {viewAsTable ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead className="text-right">Carteira</TableHead>
                  <TableHead className="text-right">CDI</TableHead>
                  <TableHead className="text-right">IPCA+6%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((row) => (
                  <TableRow key={row.ano}>
                    <TableCell className="font-medium">{row.ano}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {formatCurrency(row.Carteira)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.CDI)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row['IPCA+6%'])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCarteira" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
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
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Carteira" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CDI" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="IPCA+6%" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="Carteira"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="IPCA+6%"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="CDI"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
