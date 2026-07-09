import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency, formatPercent } from '@/lib/formatters'

export function VnaCard() {
  const { settings } = usePortfolioStore()

  const baseVNA = 4200
  const baseDate = new Date('2024-01-01')
  const today = new Date()
  const yearsElapsed = (today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const ipcaRate = settings?.ipcaAverage24m || 0
  const currentVNA = baseVNA * Math.pow(1 + ipcaRate / 100, Math.max(0, yearsElapsed))

  return (
    <Card
      className="hover:shadow-md transition-shadow animate-fade-in-up"
      style={{ animationDelay: '500ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">VNA do dia</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(currentVNA)}</div>
        <p className="text-xs text-muted-foreground mt-1">IPCA 24m: {formatPercent(ipcaRate)}</p>
      </CardContent>
    </Card>
  )
}
