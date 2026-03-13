import React, { useMemo } from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency } from '@/lib/formatters'

export function MtmAnalysisDialog({
  analyzingId,
  onClose,
}: {
  analyzingId: string | null
  onClose: () => void
}) {
  const { investments } = usePortfolioStore()

  const analyzingInv = useMemo(
    () => investments.find((i) => i.id === analyzingId),
    [analyzingId, investments],
  )

  const mtmData = useMemo(() => {
    if (!analyzingInv) return []
    const data = []
    const start = new Date(analyzingInv.purchaseDate)
    const end = new Date()
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    let curCurve = analyzingInv.purchasePrice
    let curMarket = analyzingInv.purchasePrice

    for (let i = 0; i <= Math.max(months, 1); i++) {
      const d = new Date(start)
      d.setMonth(d.getMonth() + i)
      const curveRate = analyzingInv.rate / 12 / 100
      curCurve *= 1 + curveRate
      const vol = Math.sin(i) * 0.02 + 1
      curMarket = curCurve * vol

      data.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        Curva: parseFloat(curCurve.toFixed(2)),
        Mercado: parseFloat(curMarket.toFixed(2)),
      })
    }
    return data
  }, [analyzingInv])

  return (
    <Dialog open={!!analyzingId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Análise de Marcação a Mercado</DialogTitle>
          <DialogDescription>
            {analyzingInv?.title} • {analyzingInv?.agent} (Lote: {analyzingInv?.purchaseDate})
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={mtmData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `R$ ${v}`}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="Mercado"
                  name="Valor de Mercado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Curva"
                  name="Valor na Curva (Teórico)"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          {mtmData.length > 0 && (
            <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg mt-4 border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground">Valor na Curva Atual</p>
                <p className="font-semibold">{formatCurrency(mtmData[mtmData.length - 1].Curva)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor de Mercado Atual</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(mtmData[mtmData.length - 1].Mercado)}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
