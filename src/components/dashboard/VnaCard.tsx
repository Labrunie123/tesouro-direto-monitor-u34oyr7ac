import { useMemo } from 'react'
import { RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

  const isStale = useMemo(() => {
    if (!vnaDate) return false
    const today = new Date().toISOString().split('T')[0]
    return vnaDate !== today
  }, [vnaDate])

  const hasData = vnaValue > 0
  const showSkeleton = vnaLoading && !hasData

  return (
    <Card
      className="hover:shadow-md transition-shadow animate-fade-in-up"
      style={{ animationDelay: '500ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {vnaDate ? `VNA (Ref: ${formatDate(vnaDate)})` : 'VNA do dia'}
        </CardTitle>
        <RefreshCw
          className={cn(
            'h-4 w-4 text-muted-foreground cursor-pointer transition-colors hover:text-primary',
            vnaLoading && 'animate-spin',
          )}
          onClick={fetchVna}
        />
      </CardHeader>
      <CardContent>
        {showSkeleton ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ) : hasData ? (
          <>
            <div className="text-2xl font-bold tabular-nums">{formatVna(vnaValue)}</div>
            <p
              className={cn(
                'text-xs mt-1 flex items-center gap-1',
                isStale ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground',
              )}
            >
              {isStale ? (
                <Clock className="h-3 w-3 shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 shrink-0 opacity-50" />
              )}
              {vnaDate
                ? isStale
                  ? `Valor de referência: ${formatDate(vnaDate)} (ainda não publicado hoje)`
                  : `Atualizado em ${formatDate(vnaDate)} · ANBIMA · Selic 760199`
                : 'Referência ANBIMA · Código Selic 760199'}
            </p>
          </>
        ) : (
          <>
            <div className="text-xl font-medium text-muted-foreground">Indisponível</div>
            <p className="text-xs text-muted-foreground mt-1">
              {vnaLoading ? 'Carregando...' : 'Fonte indisponível no momento'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
