import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CalendarDays, ArrowRightLeft, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency } from '@/lib/formatters'

export default function Projections() {
  const { investments, settings } = usePortfolioStore()
  const [viewMode, setViewMode] = useState('anual')

  const projectionsData = useMemo(() => {
    // Generate mock cashflows for the next 10 years based on portfolio
    const data = []
    const currentYear = new Date().getFullYear()

    for (let i = 0; i < 10; i++) {
      const year = currentYear + i
      let coupons = 0
      let principal = 0

      investments.forEach((inv) => {
        const val = inv.purchasePrice * inv.quantity
        // Mock coupon logic: IPCA+ with semiannual coupons typically pays ~6% a year
        if (inv.title.toLowerCase().includes('juros semestrais')) {
          coupons += val * (inv.rate / 100)
        } else {
          // If it's standard, maybe assume some maturity payouts in random years for demo
          if (inv.title.includes(year.toString())) {
            principal +=
              val *
              Math.pow(
                1 + (inv.rate + settings.ipcaAverage24m) / 100,
                year - parseInt(inv.purchaseDate.substring(0, 4)),
              )
          } else {
            // small pseudo interest accrual visualization
            coupons += val * 0.02
          }
        }
      })

      data.push({
        ano: year.toString(),
        Cupons: parseFloat(coupons.toFixed(2)),
        Vencimentos: parseFloat(principal.toFixed(2)),
        Total: parseFloat((coupons + principal).toFixed(2)),
      })
    }
    return data
  }, [investments, settings.ipcaAverage24m])

  const rendaMaisData = useMemo(() => {
    const rMais = investments.filter((i) => i.type === 'Renda+' || i.type === 'Educa+')
    if (rMais.length === 0) return []

    const data = []
    let baseVal = rMais.reduce((acc, i) => acc + i.purchasePrice * i.quantity, 0)

    for (let i = 1; i <= 12; i++) {
      data.push({
        mes: `Mês ${i}`,
        Renda: parseFloat((baseVal * 0.008).toFixed(2)), // mock monthly receipt
      })
    }
    return data
  }, [investments])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Projeções de Fluxo de Caixa</h2>
        <p className="text-muted-foreground">Antecipe seus recebimentos de cupons e vencimentos.</p>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="anual">Visão Anual</TabsTrigger>
            <TabsTrigger value="renda">Renda+ / Educa+</TabsTrigger>
          </TabsList>
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border border-border/50">
            <Info className="h-4 w-4 mr-2 text-primary" />
            IPCA Projetado:{' '}
            <strong className="ml-1 text-foreground">{settings.ipcaAverage24m}%</strong>
          </div>
        </div>

        <TabsContent value="anual" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Recebimentos Futuros (10 anos)</CardTitle>
              <CardDescription>
                Valores estimados baseados nas taxas atuais de mercado e inflação projetada.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectionsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${val / 1000}k`}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar
                    dataKey="Cupons"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="Vencimentos"
                    stackId="a"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tabela de Projeção</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="text-right">Cupons Semestrais</TableHead>
                    <TableHead className="text-right">Vencimentos (Principal)</TableHead>
                    <TableHead className="text-right font-bold">Total Projetado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectionsData.map((row) => (
                    <TableRow key={row.ano}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {row.ano}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatCurrency(row.Cupons)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(row.Vencimentos)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(row.Total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renda" className="space-y-6 mt-0">
          {rendaMaisData.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Simulação de Renda Mensal</CardTitle>
                    <CardDescription>
                      Fase de conversão dos seus títulos Renda+ e Educa+
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rendaMaisData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} dy={10} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        formatter={(val: number) => formatCurrency(val)}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar
                        dataKey="Renda"
                        fill="hsl(var(--chart-4))"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-muted p-4 rounded-lg flex justify-between items-center border border-border/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Renda Média Mensal Projetada</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(rendaMaisData[0].Renda)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ajuste anual de</p>
                    <p className="text-lg font-semibold">IPCA + Spread</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum título Renda+ ou Educa+ encontrado.</p>
                <p className="text-sm mt-1">
                  Adicione esses títulos na sua carteira para ver as projeções de aposentadoria.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
