import { useState, useMemo, Fragment } from 'react'
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
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import usePortfolioStore, { Investment } from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters'
import { calculateMetrics } from '@/lib/investment-utils'

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
  const { yieldPeriod, calculateCurrentValue, getYieldForPeriod } = usePortfolioStore()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const toggleGroup = (title: string) =>
    setExpandedGroups((p) => (p.includes(title) ? p.filter((t) => t !== title) : [...p, title]))

  const { grouped, totals } = useMemo(() => {
    const groups: Record<string, Investment[]> = {}
    brokerInvestments.forEach((inv) => {
      if (!groups[inv.title]) groups[inv.title] = []
      groups[inv.title].push(inv)
    })

    let tInv = 0,
      tGross = 0,
      tTax = 0

    const grouped = Object.entries(groups).map(([title, lots]) => {
      let gQtd = 0,
        gInv = 0,
        gGross = 0,
        gTax = 0,
        gProfit = 0
      const enriched = lots.map((lot) => {
        const m = calculateMetrics(lot, calculateCurrentValue)
        gQtd += lot.quantity
        gInv += m.iv
        gGross += m.gv
        gTax += m.tax
        gProfit += m.profit
        tInv += m.iv
        tGross += m.gv
        tTax += m.tax
        return { ...lot, ...m }
      })

      let gYield = 0
      if (gInv > 0) {
        enriched.forEach((l) => {
          gYield += getYieldForPeriod(l, yieldPeriod) * (l.iv / gInv)
        })
      }

      return {
        title,
        lots: enriched,
        gQtd,
        gInv,
        gGross,
        gNet: gGross - gTax,
        gYield,
        gEffTax: gProfit > 0 ? gTax / gProfit : 0,
      }
    })

    return {
      grouped,
      totals: { invested: tInv, gross: tGross, net: tGross - tTax },
    }
  }, [brokerInvestments, yieldPeriod, calculateCurrentValue, getYieldForPeriod])

  const yieldPct =
    totals.invested > 0 ? grouped.reduce((a, g) => a + g.gYield * (g.gInv / totals.invested), 0) : 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/20 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{brokerName}</h3>
            <Badge variant="secondary" className="text-xs">
              {brokerInvestments.length} {brokerInvestments.length === 1 ? 'título' : 'títulos'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Investido: </span>
              <span className="font-medium">{formatCurrency(totals.invested)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Valor Atual: </span>
              <span className="font-bold text-primary">{formatCurrency(totals.net)}</span>
            </div>
            <div>
              <span
                className={`font-medium ${yieldPct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
              >
                {yieldPct > 0 ? '+' : ''}
                {formatPercent(yieldPct)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5 hover:bg-muted/5">
                <TableHead>Título</TableHead>
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
              {grouped.map((g) => {
                const exp = expandedGroups.includes(g.title)
                return (
                  <Fragment key={g.title}>
                    <TableRow
                      className="group cursor-pointer hover:bg-muted/50"
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
                      <TableCell className="text-right hidden lg:table-cell">
                        {g.gQtd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(g.gInv)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(g.gGross)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {formatPercent(g.gEffTax * 100)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(g.gNet)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium hidden sm:table-cell ${g.gYield >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                      >
                        {g.gYield > 0 ? '+' : ''}
                        {formatPercent(g.gYield)}
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
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
