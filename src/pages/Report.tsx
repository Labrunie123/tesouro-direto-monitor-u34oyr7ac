import React, { useMemo } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

export default function Report() {
  const { investments, totalInvested, currentValue, portfolioYield, settings } = usePortfolioStore()

  const allocationData = useMemo(() => {
    const agents: Record<string, number> = {}
    investments.forEach((inv) => {
      const val = inv.purchasePrice * inv.quantity
      agents[inv.agent] = (agents[inv.agent] || 0) + val
    })
    return Object.entries(agents).map(([name, value]) => ({ name, value }))
  }, [investments])

  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea']

  return (
    <div className="min-h-screen bg-white text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end print:hidden mb-8 gap-2">
          <Button variant="outline" onClick={() => window.close()}>
            Fechar
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir PDF
          </Button>
        </div>

        <div className="border-b-2 border-slate-200 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Relatório Executivo de Investimentos
          </h1>
          <p className="text-slate-500 mt-2">
            Tesouro Direto Monitor • Gerado em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Investido
            </h3>
            <p className="text-2xl font-bold mt-2">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Valor Bruto Atual
            </h3>
            <p className="text-2xl font-bold mt-2 text-emerald-700">
              {formatCurrency(currentValue)}
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rentabilidade Acumulada
            </h3>
            <p className="text-2xl font-bold mt-2">{formatPercent(portfolioYield)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 h-auto">
          <div className="border border-slate-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Alocação por Custódia</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    label={(entry) => entry.name}
                    paddingAngle={2}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-slate-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Resumo dos Títulos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Título / Corretora</th>
                    <th className="py-2 text-right font-medium">Taxa</th>
                    <th className="py-2 text-right font-medium">Investido</th>
                  </tr>
                </thead>
                <tbody>
                  {investments.map((inv) => {
                    const invested = inv.purchasePrice * inv.quantity
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">
                          <div className="font-medium text-slate-900">{inv.title}</div>
                          <div className="text-xs text-slate-500">{inv.agent}</div>
                        </td>
                        <td className="py-3 text-right">{inv.rate}%</td>
                        <td className="py-3 text-right font-medium text-slate-900">
                          {formatCurrency(invested)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 border-t border-slate-200 pt-6">
          <p>IPCA Projetado utilizado: {settings.ipcaAverage24m}% (Média 24 meses)</p>
          <p className="mt-1">
            Este documento é gerado automaticamente e não possui validade legal como informe de
            rendimentos.
          </p>
        </div>
      </div>
    </div>
  )
}
