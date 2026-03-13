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

  const toggleGroup = (title: string) =>
    setExpandedGroups((p) => (p.includes(title) ? p.filter((t) => t !== title) : [...p, title]))

  const groupedInvestments = useMemo(() => {
    const groups: Record<string, Investment[]> = {}
    investments.forEach((inv) => {
      if (!groups[inv.title]) groups[inv.title] = []
      groups[inv.title].push(inv)
    })

    return Object.entries(groups).map(([title, lots]) => {
      let tQtd = 0,
        tInv = 0,
        tGross = 0,
        tTax = 0,
        tProfit = 0
      const enriched = lots.map((lot) => {
        const iv = lot.purchasePrice * lot.quantity
        const gv = calculateCurrentValue(lot) * lot.quantity
        const days = Math.floor(
          (new Date().getTime() - new Date(lot.purchaseDate).getTime()) / 86400000,
        )

        let tr = 0.15
        if (days <= 180) tr = 0.225
        else if (days <= 360) tr = 0.2
        else if (days <= 720) tr = 0.175

        const profit = gv - iv
        const tax = profit > 0 ? profit * tr : 0
        const nv = gv - tax

        tQtd += lot.quantity
        tInv += iv
        tGross += gv
        tTax += tax
        tProfit += profit
        return { ...lot, iv, gv, tr, tax, nv }
      })

      let tYield = 0
      if (tInv > 0)
        enriched.forEach((l) => (tYield += getYieldForPeriod(l, yieldPeriod) * (l.iv / tInv)))

      return {
        title,
        lots: enriched,
        tQtd,
        tInv,
        tGross,
        tNet: tGross - tTax,
        tYield,
        tEffTax: tProfit > 0 ? tTax / tProfit : 0,
        agent:
          Array.from(new Set(lots.map((l) => l.agent))).length > 1 ? 'Múltiplas' : lots[0].agent,
      }
    })
  }, [investments, yieldPeriod, calculateCurrentValue, getYieldForPeriod])

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10 hover:bg-muted/10">
            <TableHead>Título</TableHead>
            <TableHead className="hidden xl:table-cell">Corretora</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Qtd</TableHead>
            <TableHead className="text-right whitespace-nowrap">Valor Inicial</TableHead>
            <TableHead className="text-right whitespace-nowrap">VNA Bruto</TableHead>
            <TableHead className="text-right hidden md:table-cell">IR</TableHead>
            <TableHead className="text-right text-primary whitespace-nowrap font-semibold">
              Valor Líquido
            </TableHead>
            <TableHead className="text-right hidden sm:table-cell whitespace-nowrap">
              Yield Méd.
            </TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedInvestments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                Nenhum título cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            groupedInvestments.map((g) => {
              const exp = expandedGroups.includes(g.title)
              return (
                <React.Fragment key={g.title}>
                  <TableRow
                    className="group cursor-pointer hover:bg-muted/50 data-[state=expanded]:bg-muted/30"
                    onClick={() => toggleGroup(g.title)}
                  >
                    <TableCell className="font-semibold font-medium">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        {exp ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {g.title}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {g.agent}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {g.tQtd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(g.tInv)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(g.tGross)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      {formatPercent(g.tEffTax * 100)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(g.tNet)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium hidden sm:table-cell ${g.tYield >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                    >
                      {g.tYield > 0 ? '+' : ''}
                      {formatPercent(g.tYield)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddLot(g.title)
                          }}
                          title="Adicionar Lote"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {exp &&
                    g.lots.map((lot) => (
                      <TableRow
                        key={lot.id}
                        className="bg-muted/10 hover:bg-muted/20 border-b-0 last:border-b"
                      >
                        <TableCell className="pl-8 sm:pl-10 py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <CornerDownRight className="h-3 w-3 opacity-50" />
                            Lote: {formatDate(lot.purchaseDate)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell py-3 text-sm text-muted-foreground">
                          {lot.agent}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell py-3 text-sm">
                          {lot.quantity}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm">
                          {formatCurrency(lot.iv)}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm">
                          {formatCurrency(lot.gv)}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell py-3 text-sm text-muted-foreground">
                          {formatPercent(lot.tr * 100)}
                        </TableCell>
                        <TableCell className="text-right py-3 text-sm font-medium">
                          {formatCurrency(lot.nv)}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell py-3 text-sm text-muted-foreground">
                          {formatPercent(getYieldForPeriod(lot, yieldPeriod))}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-500"
                              onClick={() => onAnalyze(lot.id)}
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
