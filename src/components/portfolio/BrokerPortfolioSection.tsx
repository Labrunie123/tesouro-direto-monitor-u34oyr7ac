import { useMemo } from 'react'
import { Pencil, Trash2, BarChart3, Plus } from 'lucide-react'
import { Investment } from '@/stores/usePortfolioStore'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { calculateMetrics } from '@/lib/investment-utils'
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Props {
  brokerName: string
  brokerInvestments: Investment[]
  onEdit: (inv: Investment) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  onAddLot: (title: string) => void
}

export function BrokerPortfolioSection({
  brokerName,
  brokerInvestments,
  onEdit,
  onDelete,
  onAnalyze,
  onAddLot,
}: Props) {
  const { calculateCurrentValue } = usePortfolioStore()

  const titleGroups = useMemo(() => {
    const groups: Record<string, Investment[]> = {}
    brokerInvestments.forEach((inv) => {
      if (!groups[inv.title]) groups[inv.title] = []
      groups[inv.title].push(inv)
    })
    return Object.entries(groups)
  }, [brokerInvestments])

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <h3 className="font-semibold text-sm">{brokerName}</h3>
        <Badge variant="secondary">
          {brokerInvestments.length} {brokerInvestments.length === 1 ? 'lote' : 'lotes'}
        </Badge>
      </div>
      <div className="space-y-4 p-4">
        {titleGroups.map(([title, lots]) => (
          <div key={title} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{title}</span>
              <Button size="sm" variant="ghost" onClick={() => onAddLot(title)}>
                <Plus className="h-3 w-3 mr-1" /> Novo Lote
              </Button>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Preço na Compra</TableHead>
                    <TableHead className="text-right">Valor investido</TableHead>
                    <TableHead className="text-right">Rentabilidade Contratada</TableHead>
                    <TableHead className="text-right">VNA Bruto</TableHead>
                    <TableHead className="text-right">IR</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead className="text-right">Rendimento médio líquido</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => {
                    const m = calculateMetrics(lot, calculateCurrentValue)
                    return (
                      <TableRow key={lot.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(lot.purchaseDate)}
                        </TableCell>
                        <TableCell className="text-right">{lot.quantity}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(lot.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(m.iv)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatPercent(lot.rate)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(m.gv)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(m.ir)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(m.nv)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right whitespace-nowrap font-medium',
                            m.netYield >= 0 ? 'text-emerald-600' : 'text-destructive',
                          )}
                        >
                          {formatPercent(m.netYield)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onAnalyze(lot.id)}
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onEdit(lot)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onDelete(lot.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
