import { useMemo } from 'react'
import usePortfolioStore, { Investment } from '@/stores/usePortfolioStore'
import { BrokerPortfolioSection } from '@/components/portfolio/BrokerPortfolioSection'

interface Props {
  onEdit: (inv: Investment) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  onAddLot: (title: string) => void
}

export function PortfolioTable({ onEdit, onDelete, onAnalyze, onAddLot }: Props) {
  const { investments } = usePortfolioStore()

  const brokerGroups = useMemo(() => {
    const groups: Record<string, Investment[]> = {}
    investments.forEach((inv) => {
      const key = inv.agent || 'Sem Corretora'
      if (!groups[key]) groups[key] = []
      groups[key].push(inv)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [investments])

  if (brokerGroups.length === 0) {
    return (
      <div className="rounded-md border bg-card h-32 flex items-center justify-center text-muted-foreground">
        Nenhum título cadastrado.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {brokerGroups.map(([brokerName, brokerInvestments]) => (
        <BrokerPortfolioSection
          key={brokerName}
          brokerName={brokerName}
          brokerInvestments={brokerInvestments}
          onEdit={onEdit}
          onDelete={onDelete}
          onAnalyze={onAnalyze}
          onAddLot={onAddLot}
        />
      ))}
    </div>
  )
}
