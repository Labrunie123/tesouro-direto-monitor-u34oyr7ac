import { useMemo } from 'react'
import { RefreshCw, AlertCircle, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatVna, formatDate } from '@/lib/formatters'
import { findVnaForTitle } from '@/lib/vna-service'
import { cn } from '@/lib/utils'

export function VnaCard() {
  const { investments, vnaData, vnaDate, vnaLoading, vnaError, vnaLastSync, fetchVna } =
    usePortfolioStore()

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

  const formattedSyncTime = useMemo(() => {
    if (!vnaLastSync) return null
    try {
      const d = new Date(vnaLastSync)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return null
    }
  }, [vnaLastSync])

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow animate-fade-in-up',
        vnaError && 'border-amber-500/50',
      )}
      style={{ animationDelay: '500ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {vnaDate ? `VNA (Ref: ${formatDate(vnaDate)})` : 'VNA do dia'}
          </CardTitle>
          {vnaError ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-500/50 bg-amber-500/10"
            >
              Desatualizado
            </Badge>
          ) : hasData && !vnaLoading ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 text-emerald-600 border-emerald-500/50 bg-emerald-500/10"
            >
              Atualizado
            </Badge>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={fetchVna}
          disabled={vnaLoading}
        >
          {vnaLoading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
          )}
        </Button>
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
            {vnaError ? (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 flex-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Dados Desatualizados — ref: {formatDate(vnaDate)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 shrink-0"
                  onClick={fetchVna}
                  disabled={vnaLoading}
                >
                  <RefreshCw className={cn('h-3 w-3 mr-1', vnaLoading && 'animate-spin')} />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <p
                className={cn(
                  'text-xs mt-1 flex items-center gap-1',
                  isStale ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground',
                )}
              >
                {isStale ? (
                  <Clock className="h-3 w-3 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                )}
                {vnaDate
                  ? isStale
                    ? `Valor de referência: ${formatDate(vnaDate)} (ainda não publicado hoje)`
                    : `Atualizado em ${formatDate(vnaDate)} · ANBIMA · Selic 760199`
                  : 'Referência ANBIMA · Código Selic 760199'}
              </p>
            )}
            {formattedSyncTime && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Última sincronização: {formattedSyncTime}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-xl font-medium text-muted-foreground">Indisponível</div>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {vnaLoading ? 'Carregando...' : 'Fonte indisponível no momento'}
              </p>
              {!vnaLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 shrink-0"
                  onClick={fetchVna}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Tentar novamente
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
