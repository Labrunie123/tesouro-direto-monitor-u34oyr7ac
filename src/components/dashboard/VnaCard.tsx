import { useMemo, useState, useEffect, useRef } from 'react'
import {
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  CloudOff,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatVnaCurrency, formatDate, formatDateTime, formatCurrency } from '@/lib/formatters'
import { findVnaForTitle, getManualVna, saveManualVna, clearManualVna } from '@/lib/vna-service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export function VnaCard() {
  const {
    investments,
    vnaData,
    vnaDate,
    vnaLoading,
    vnaError,
    vnaErrorType,
    vnaLastSync,
    vnaSource,
    vnaFallbackLoading,
    fetchVna,
  } = usePortfolioStore()

  const [manualVna, setManualVna] = useState(() => getManualVna())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const prevErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (vnaError && vnaError !== prevErrorRef.current && !vnaLoading) {
      const hasManual = getManualVna() !== null
      const errorPrefix = vnaErrorType ? `[${vnaErrorType}] ` : ''
      const detailMsg = vnaError
        ? `${errorPrefix}${vnaError}`
        : `${errorPrefix}Não foi possível obter o VNA automaticamente.`
      toast({
        title: 'Erro ao buscar VNA',
        description: hasManual
          ? `${detailMsg} Usando valor manual salvo.`
          : `${detailMsg} Use a entrada manual para manter seus cálculos.`,
        variant: hasManual ? 'default' : 'destructive',
      })
      prevErrorRef.current = vnaError
    } else if (!vnaError) {
      prevErrorRef.current = null
    }
  }, [vnaError, vnaErrorType, vnaLoading])

  const fetchedVnaValue = useMemo(() => {
    const ipcaInv = investments.find((inv) => inv.type === 'IPCA+')
    if (ipcaInv) {
      const vna = findVnaForTitle(vnaData, ipcaInv.title)
      if (vna !== null && vna > 0) return vna
    }
    const fallback = vnaData.find((e) => e.vna > 0)
    return fallback?.vna ?? 0
  }, [investments, vnaData])

  const isManual = manualVna !== null
  const vnaValue = isManual ? manualVna.vna : fetchedVnaValue
  const isCached = !isManual && vnaError !== null && fetchedVnaValue > 0
  const effectiveSource = isManual ? 'manual' : vnaSource

  const isStale = useMemo(() => {
    if (!vnaDate) return false
    const today = new Date().toISOString().split('T')[0]
    return vnaDate !== today
  }, [vnaDate])

  const hasData = vnaValue > 0
  const showSkeleton = vnaLoading && !hasData
  const isTimeout = vnaErrorType === 'TIMEOUT_ERROR'
  const isAuthError = vnaErrorType === 'AUTH_ERROR'

  const formattedSyncTime = useMemo(() => {
    if (isManual && manualVna) return formatDateTime(manualVna.date)
    if (!vnaLastSync) return null
    try {
      return formatDateTime(vnaLastSync)
    } catch {
      return null
    }
  }, [vnaLastSync, isManual, manualVna])

  const handleSaveManual = () => {
    const cleaned = inputValue
      .replace(/R\$\s*/g, '')
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')
    const parsed = parseFloat(cleaned)
    if (isNaN(parsed) || parsed <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor numérico válido (ex: 4743,21).',
        variant: 'destructive',
      })
      return
    }
    saveManualVna(parsed)
    setManualVna({ vna: parsed, date: new Date().toISOString() })
    setDialogOpen(false)
    setInputValue('')
    toast({
      title: 'VNA manual salvo',
      description: `Valor ${formatVnaCurrency(parsed)} definido manualmente.`,
    })
  }

  const handleClearManual = () => {
    clearManualVna()
    setManualVna(null)
    toast({
      title: 'VNA manual removido',
      description: 'Voltando a usar dados automáticos.',
    })
  }

  const renderBadge = () => {
    if (isManual) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-purple-600 border-purple-500/50 bg-purple-500/10"
        >
          Manual
        </Badge>
      )
    }
    if (vnaFallbackLoading) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-500/50 bg-amber-500/10"
        >
          Buscando fonte alternativa...
        </Badge>
      )
    }
    if (vnaLoading) {
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-blue-600 border-blue-500/50 bg-blue-500/10"
        >
          Sincronizando...
        </Badge>
      )
    }
    if (vnaError) {
      if (isCached) {
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-500/50 bg-amber-500/10"
          >
            Em Cache
          </Badge>
        )
      }
      if (isAuthError) {
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-red-600 border-red-500/50 bg-red-500/10"
          >
            Credenciais Inválidas
          </Badge>
        )
      }
      if (isTimeout) {
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-orange-600 border-orange-500/50 bg-orange-500/10"
          >
            Tempo Esgotado
          </Badge>
        )
      }
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-red-600 border-red-500/50 bg-red-500/10"
        >
          Erro de Conexão
        </Badge>
      )
    }
    if (hasData) {
      if (effectiveSource === 'BrasilIndicadores') {
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 text-blue-600 border-blue-500/50 bg-blue-500/10"
          >
            Fonte Secundária
          </Badge>
        )
      }
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 text-emerald-600 border-emerald-500/50 bg-emerald-500/10"
        >
          Ao Vivo
        </Badge>
      )
    }
    return null
  }

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow animate-fade-in-up',
        vnaError && !vnaLoading && !isManual && 'border-amber-500/50',
      )}
      style={{ animationDelay: '500ms' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {isManual
              ? 'VNA (Manual)'
              : vnaDate
                ? `VNA (Ref: ${formatDate(vnaDate)})`
                : 'VNA do dia'}
          </CardTitle>
          {renderBadge()}
        </div>
        <div className="flex items-center gap-1">
          {isManual && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClearManual}
              aria-label="Remover VNA manual"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-red-500" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setInputValue(manualVna ? String(manualVna.vna).replace('.', ',') : '')
              setDialogOpen(true)
            }}
            aria-label="Editar VNA manualmente"
          >
            <Pencil className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchVna}
            disabled={vnaLoading}
            aria-label="Atualizar VNA"
          >
            {vnaLoading ? (
              <Loader2
                className={cn(
                  'h-4 w-4 animate-spin',
                  vnaFallbackLoading ? 'text-amber-500' : 'text-muted-foreground',
                )}
              />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showSkeleton ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ) : hasData ? (
          <>
            <div className="text-2xl font-bold tabular-nums">{formatVnaCurrency(vnaValue)}</div>
            {isManual ? (
              <p className="text-xs mt-1 flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <Pencil className="h-3 w-3 shrink-0" />
                Valor definido manualmente
              </p>
            ) : vnaError ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                  <CloudOff className="h-3 w-3 shrink-0" />
                  <span className="font-medium">Dados Offline</span>
                  <span className="text-muted-foreground">— ref: {formatDate(vnaDate)}</span>
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {isTimeout
                    ? 'Tempo limite excedido ao conectar com a ANBIMA. O servidor pode estar indisponível.'
                    : isAuthError
                      ? 'Credenciais da ANBIMA inválidas ou não autorizadas. Verifique a configuração dos secrets.'
                      : vnaError
                        ? vnaError
                        : 'API da ANBIMA indisponível. Exibindo último valor conhecido.'}
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
            ) : vnaError ? (
              <p
                className={cn(
                  'text-xs mt-1 flex items-center gap-1 text-red-600 dark:text-red-400',
                )}
              >
                {isAuthError ? (
                  <>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{vnaError}</span>
                  </>
                ) : isTimeout ? (
                  <>
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">
                      Tempo limite excedido ao conectar com a ANBIMA.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{vnaError}</span>
                  </>
                )}
              </p>
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
                  : 'Referência ANBIMA · Código Selic 760199'}{' '}
              </p>
            )}
            {formattedSyncTime && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Última atualização: {formattedSyncTime}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-xl font-medium text-muted-foreground">Indisponível</div>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1 flex-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {vnaLoading
                  ? 'Sincronizando...'
                  : isAuthError
                    ? 'Credenciais inválidas'
                    : isTimeout
                      ? 'Tempo limite excedido'
                      : vnaError
                        ? vnaError
                        : 'API indisponível no momento'}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Entrada Manual de VNA</DialogTitle>
            <DialogDescription>
              Digite o valor do VNA para o título Selic 760199. Este valor substituirá a busca
              automática.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="vna-input">Valor do VNA (R$)</Label>
            <Input
              id="vna-input"
              type="text"
              placeholder="Ex: 4743,21"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveManual()
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Use vírgula como separador decimal (ex: 4743,21).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveManual}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
