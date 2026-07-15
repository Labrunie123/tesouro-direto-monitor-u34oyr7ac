import { Investment } from '@/stores/usePortfolioStore'

export interface LotMetrics {
  iv: number
  gv: number
  tr: number
  ir: number
  nv: number
  netYield: number
}

export function getTaxRate(purchaseDate: string): number {
  const days = Math.floor((Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 180) return 0.225
  if (days <= 360) return 0.2
  if (days <= 720) return 0.175
  return 0.15
}

export function calculateMetrics(
  inv: Investment,
  calculateCurrentValue: (inv: Investment, targetDate?: Date) => number,
): LotMetrics {
  const iv = inv.purchasePrice * inv.quantity
  const gv = calculateCurrentValue(inv) * inv.quantity
  const tr = getTaxRate(inv.purchaseDate)
  const ir = Math.max(0, gv - iv) * tr
  const nv = gv - ir
  const netYield = iv > 0 ? ((nv - iv) / iv) * 100 : 0
  return { iv, gv, tr, ir, nv, netYield }
}
