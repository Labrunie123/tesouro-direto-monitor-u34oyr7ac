import React, { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Edit2,
  LineChart,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import usePortfolioStore, { Investment } from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters'

interface Props {
  onEdit: (inv: Investment) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  onAddLot: (title: string) => void
}

export function PortfolioTable({ onEdit, onDelete, onAnalyze, onAddLot }: Props) {
  const { investments, yieldPeriod, calculateCurrentValue, getYieldForPeriod } = usePortfolioStore()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    )
  }

  const groupedInvestments = useMemo(() => {
    const groups: Record<string, Investment[]> = {}
    investments.forEach((inv) => {
      if (!groups[inv.title]) groups[inv.title] = []
      groups[inv.title].push(inv)
    })

    return Object.entries(groups).map(([title, lots]) => {
      const totalQuantity = lots.reduce((acc, l) => acc + l.quantity, 0)
      const totalInvested = lots.reduce((acc, l) => acc + l.purchasePrice * l.quantity, 0)
      const totalVNA = lots.reduce((acc, l) => acc + calculateCurrentValue(l) * l.quantity, 0)
      const weightedRate =
        totalQuantity > 0
          ? lots.reduce((acc, l) => acc + l.rate * l.quantity, 0) / totalQuantity
          : 0
      const agents = Array.from(new Set(lots.map((l) => l.agent)))
      const displayAgent = agents.length > 1 ? 'Múltiplas' : agents[0]

      let totalYield = 0
      if (totalInvested > 0) {
        lots.forEach((l) => {
          const weight = (l.purchasePrice * l.quantity) / totalInvested
          totalYield += getYieldForPeriod(l, yieldPeriod) * weight
        })
      }

      return { title, lots, totalQuantity, weightedRate, totalVNA, totalYield, displayAgent }
    })
  }, [investments, yieldPeriod, calculateCurrentValue, getYieldForPeriod])

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10 hover:bg-muted/10">
            <TableHead>Título (Sub-Carteira)</TableHead>
            <TableHead className="hidden md:table-cell">Corretora</TableHead>
            <TableHead className="text-right">Qtd Total</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Taxa Méd.</TableHead>
            <TableHead className="text-right text-primary">Yield Méd. ({yieldPeriod})</TableHead>
            <TableHead className="text-right">VNA Consolidado</TableHead>
            <TableHead className="w-[120px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedInvestments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                Nenhum título cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            groupedInvestments.map((group) => {
              const isExpanded = expandedGroups.includes(group.title)
              return (
                <React.Fragment key={group.title}>
                  <TableRow
                    className="group cursor-pointer hover:bg-muted/50 data-[state=expanded]:bg-muted/30"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <TableCell className="font-semibold font-medium">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {group.title}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {group.displayAgent}
                    </TableCell>
                    <TableCell className="text-right">{group.totalQuantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {group.weightedRate.toFixed(2)}%
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${group.totalYield >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                    >
                      {group.totalYield > 0 ? '+' : ''}
                      {formatPercent(group.totalYield)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(group.totalVNA)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddLot(group.title)
                          }}
                          title="Adicionar Lote"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded &&
                    group.lots.map((lot) => (
                      <TableRow
                        key={lot.id}
                        className="bg-muted/10 hover:bg-muted/20 border-b-0 last:border-b"
                      >
                        <TableCell className="pl-8 sm:pl-10 py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="h-3 w-3 opacity-50" />
                            Lote: {formatDate(lot.purchaseDate)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-3 text-sm text-muted-foreground">
                          {lot.agent}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm">{lot.quantity}</TableCell>
                        <TableCell className="text-right py-3 text-sm hidden sm:table-cell">
                          {lot.rate}%
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm text-muted-foreground">
                          {formatPercent(getYieldForPeriod(lot, yieldPeriod))}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm">
                          {formatCurrency(calculateCurrentValue(lot) * lot.quantity)}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500"
                              onClick={() => onAnalyze(lot.id)}
                              title="Marcação a Mercado"
                            >
                              <LineChart className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => onEdit(lot)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(lot.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
