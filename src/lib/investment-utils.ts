import type { Investment } from '@/stores/usePortfolioStore'

export interface InvestmentMetrics {
  iv: number
  gv: number
  days: number
  tr: number
  profit: number
  tax: number
  nv: number
}

export function calculateMetrics(
  inv: Investment,
  calculateCurrentValue: (inv: Investment) => number,
): InvestmentMetrics {
  const iv = inv.purchasePrice * inv.quantity
  const gv = calculateCurrentValue(inv) * inv.quantity
  const days = Math.floor((new Date().getTime() - new Date(inv.purchaseDate).getTime()) / 86400000)
  let tr = 0.15
  if (days <= 180) tr = 0.225
  else if (days <= 360) tr = 0.2
  else if (days <= 720) tr = 0.175
  const profit = gv - iv
  const tax = profit > 0 ? profit * tr : 0
  const nv = gv - tax
  return { iv, gv, days, tr, profit, tax, nv }
}
