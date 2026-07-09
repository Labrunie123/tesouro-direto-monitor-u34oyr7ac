import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

export default function Index() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Painel Geral</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Visão geral da sua carteira de investimentos no Tesouro Direto
        </p>
      </div>
      <DashboardCards />
      <DashboardCharts />
    </div>
  )
}
