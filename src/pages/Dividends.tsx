import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ArrowUpRight, HandCoins, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate } from '@/lib/formatters'

export default function Dividends() {
  const { dividends } = usePortfolioStore()

  const { chartData, totalReceived } = useMemo(() => {
    const monthlyMap: Record<string, number> = {}
    let total = 0

    dividends.forEach((div) => {
      const d = new Date(div.date)
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      monthlyMap[key] = (monthlyMap[key] || 0) + div.amount
      total += div.amount
    })

    const data = Object.entries(monthlyMap)
      .map(([mes, valor]) => ({
        mes,
        valor: parseFloat(valor.toFixed(2)),
        label: new Date(`${mes}-01T00:00:00`).toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))

    return { chartData: data, totalReceived: total }
  }, [dividends])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dividendos Acumulados</h2>
        <p className="text-muted-foreground">Histórico de cupons recebidos da sua carteira.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-600">
              <HandCoins className="h-4 w-4" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              Valores já creditados em conta
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Histórico por Mês</CardTitle>
            <CardDescription>Evolução dos pagamentos de juros semestrais</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `R$ ${val}`}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip
                    formatter={(val: number) => formatCurrency(val)}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <HandCoins className="h-10 w-10 mb-2 opacity-20" />
                <p>Nenhum dividendo recebido ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Detalhamento de Pagamentos</CardTitle>
            <CardDescription>Lista completa de todos os cupons depositados.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Corretora</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  dividends.map((div) => (
                    <TableRow key={div.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {formatDate(div.date)}
                      </TableCell>
                      <TableCell>{div.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {div.agent}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatCurrency(div.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
