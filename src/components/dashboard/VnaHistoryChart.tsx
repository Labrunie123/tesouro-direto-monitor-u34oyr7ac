import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts'
import { TrendingUp, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchVnaHistory, VnaHistoryRow } from '@/services/vna'
import { formatVnaCurrency, formatDate } from '@/lib/formatters'
import usePortfolioStore from '@/stores/usePortfolioStore'

export function VnaHistoryChart() {
  const [history, setHistory] = useState<VnaHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { vnaLastSync } = usePortfolioStore()

  const loadHistory = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await fetchVnaHistory()
      setHistory(data)
    } catch (e) {
      console.error('Failed to load VNA history:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory, vnaLastSync])

  const chartData = history.map((row) => ({
    date: formatDate(row.reference_date),
    vna: Number(row.vna_value),
  }))

  return (
    <Card className="flex flex-col animate-fade-in-up" style={{ animationDelay: '700ms' }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Histórico do VNA — NTN-B 15/07/2026</CardTitle>
          <CardDescription>Evolução do Valor Nominal Atualizado — NTN-B 2026-07-15</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={loadHistory}
          disabled={refreshing}
          aria-label="Atualizar histórico"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length > 0 ? (
          <ChartContainer
            className="h-[280px] w-full"
            config={{ vna: { label: 'VNA', color: 'hsl(var(--primary))' } }}
          >
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={['dataMin', 'dataMax']}
              />
              <RechartsTooltip
                formatter={(val: number) => [formatVnaCurrency(val), 'VNA']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))',
                }}
              />
              <Line
                type="monotone"
                dataKey="vna"
                stroke="var(--color-vna)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground h-[280px]">
            <TrendingUp className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">Nenhum histórico disponível ainda</p>
            <p className="text-xs mt-1">Clique em atualizar no card VNA para buscar dados</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
