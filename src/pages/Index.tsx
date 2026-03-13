import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCards } from '@/components/dashboard/DashboardCards'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

export default function Index() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Acompanhamento consolidado da sua carteira.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" className="gap-2">
            <Link to="/simulator">
              <Calculator className="h-4 w-4" />
              Simulador
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/report" target="_blank">
              <FileText className="h-4 w-4" />
              Gerar Relatório PDF
            </Link>
          </Button>
        </div>
      </div>

      <DashboardCards />
      <DashboardCharts />
    </div>
  )
}
