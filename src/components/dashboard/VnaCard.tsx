import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatVna, formatDate } from '@/lib/formatters'
import { findVnaForTitle } from '@/lib/vna-service'
import { cn } from '@/lib/utils'

export function VnaCard() {
  const { investments, vnaData, vnaDate, vnaLoading, fetchVna } = usePortfolioStore()

  const vnaValue = useMemo(() => {
    const ipcaInv = investments.find((inv) => inv.type === 'IPCA+')
    if (ipcaInv) {
      const vna = findVnaForTitle(vnaData, ipcaInv.title)
      if (vna !== null && vna > 0) return vna
    }
    const fallback = vnaData.find((e) => e.vna > 0)
    return fallback?.vna ?? 0
  }, [investments, vnaData])

  return (
    <Card
      className="hover:shadow-md transition-shadow animate-fade-in-up"
      style={{ animationDelay: '500ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">VNA do dia</CardTitle>
        <RefreshCw
          className={cn(
            'h-4 w-4 text-muted-foreground cursor-pointer',
            vnaLoading && 'animate-spin',
          )}
          onClick={fetchVna}
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatVna(vnaValue)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {vnaDate ? `Atualizado em ${formatDate(vnaDate)}` : 'Referência ANBIMA'}
        </p>
      </CardContent>
    </Card>
  )
}
