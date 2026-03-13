import React from 'react'
import { CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate } from '@/lib/formatters'

export function NextCouponWidget() {
  const { nextCoupon } = usePortfolioStore()

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full shrink-0">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Próximo Cupom Semestral</h3>
            {nextCoupon ? (
              <p className="text-sm text-muted-foreground font-medium">
                Próxima Data: {formatDate(nextCoupon.date)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum cupom previsto</p>
            )}
          </div>
        </div>

        <div className="sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-primary/10 sm:border-t-0">
          {nextCoupon ? (
            <>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Valor Líquido Previsto
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(nextCoupon.amount)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem pagamentos semestrais</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
