import React, { useState } from 'react'
import { Plus, Download, Building2, TrendingUp, Wallet, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { calculateMetrics } from '@/lib/investment-utils'
import usePortfolioStore, { Investment, YieldPeriod } from '@/stores/usePortfolioStore'
import { PortfolioTable } from '@/components/portfolio/PortfolioTable'
import { PortfolioFormDialog } from '@/components/portfolio/PortfolioFormDialog'
import { MtmAnalysisDialog } from '@/components/portfolio/MtmAnalysisDialog'
import { NextCouponWidget } from '@/components/portfolio/NextCouponWidget'
import { BrokerAddDialog } from '@/components/portfolio/BrokerAddDialog'

export default function Portfolio() {
  const {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    calculateCurrentValue,
    getYieldForPeriod,
    yieldPeriod,
    setYieldPeriod,
    totalInvested,
    currentValue,
    portfolioYield,
  } = usePortfolioStore()
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<Investment | null>(null)
  const [prefillTitle, setPrefillTitle] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isBrokerDialogOpen, setIsBrokerDialogOpen] = useState(false)

  const handleOpenAddLot = (title: string) => {
    setEditingLot(null)
    setPrefillTitle(title)
    setIsFormOpen(true)
  }
  const handleOpenEdit = (inv: Investment) => {
    setEditingLot(inv)
    setPrefillTitle(null)
    setIsFormOpen(true)
  }

  const onSubmitForm = (values: any) => {
    if (editingLot) {
      updateInvestment(editingLot.id, values)
      toast({ title: 'Lote atualizado com sucesso!' })
    } else {
      addInvestment(values)
      toast({ title: 'Novo lote adicionado!' })
    }
    setIsFormOpen(false)
  }

  const exportCSV = () => {
    const headers = [
      'Título,Corretora,Data Compra,Qtd,Preço Compra,Taxa(%),Valor Inicial,VNA Bruto,Alíquota IR(%),Valor Líquido,Yield(%)',
    ]
    const rows = investments.map((lot) => {
      const m = calculateMetrics(lot, calculateCurrentValue)
      return `${lot.title},${lot.agent || 'Sem Corretora'},${lot.purchaseDate},${lot.quantity},${lot.purchasePrice},${lot.rate},${m.iv.toFixed(2)},${m.gv.toFixed(2)},${(m.tr * 100).toFixed(2)},${m.nv.toFixed(2)},${getYieldForPeriod(lot, yieldPeriod).toFixed(2)}`
    })
    const link = document.createElement('a')
    link.href = encodeURI('data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n'))
    link.download = 'minha_carteira.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Minha Carteira</h2>
          <p className="text-muted-foreground">Gerencie seus títulos e lotes do Tesouro Direto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yieldPeriod} onValueChange={(v) => setYieldPeriod(v as YieldPeriod)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Desde o Início</SelectItem>
              <SelectItem value="24m">Últimos 24m</SelectItem>
              <SelectItem value="12m">Últimos 12m</SelectItem>
              <SelectItem value="6m">Últimos 6m</SelectItem>
              <SelectItem value="3m">Últimos 3m</SelectItem>
              <SelectItem value="1m">Último Mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="hidden md:flex">
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => setIsBrokerDialogOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Incluir Corretora</span>
            <span className="sm:hidden">Corretora</span>
          </Button>
          <Button
            onClick={() => {
              setEditingLot(null)
              setPrefillTitle(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Título</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Total Investido</span>
          </div>
          <span className="text-xl font-bold">{formatCurrency(totalInvested)}</span>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Valor Atual</span>
          </div>
          <span className="text-xl font-bold text-primary">{formatCurrency(currentValue)}</span>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            <span className="text-sm">
              Rendimento ({yieldPeriod === 'all' ? 'Total' : yieldPeriod})
            </span>
          </div>
          <span
            className={`text-xl font-bold ${portfolioYield >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
          >
            {portfolioYield > 0 ? '+' : ''}
            {formatPercent(portfolioYield)}
          </span>
        </div>
      </div>

      <NextCouponWidget />

      <PortfolioTable
        onEdit={handleOpenEdit}
        onDelete={setDeletingId}
        onAnalyze={setAnalyzingId}
        onAddLot={handleOpenAddLot}
      />

      <PortfolioFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingLot={editingLot}
        prefillTitle={prefillTitle}
        onSubmit={onSubmitForm}
      />
      <MtmAnalysisDialog analyzingId={analyzingId} onClose={() => setAnalyzingId(null)} />
      <BrokerAddDialog open={isBrokerDialogOpen} onOpenChange={setIsBrokerDialogOpen} />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingId) {
                  deleteInvestment(deletingId)
                  toast({ title: 'Lote removido.', variant: 'destructive' })
                  setDeletingId(null)
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
