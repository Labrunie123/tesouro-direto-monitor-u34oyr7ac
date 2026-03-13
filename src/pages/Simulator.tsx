import React, { useState, useMemo } from 'react'
import {
  Calculator,
  Download,
  LineChart as LineIcon,
  BarChart as BarIcon,
  AreaChart as AreaIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import usePortfolioStore from '@/stores/usePortfolioStore'
import { formatCurrency } from '@/lib/formatters'

export default function Simulator() {
  const { investments, settings } = usePortfolioStore()
  const [customIpca, setCustomIpca] = useState<string>('6.5')
  const [chartType, setChartType] = useState('line')

  const parsedCustomIpca = parseFloat(customIpca) || 0

  const simulationData = useMemo(() => {
    const data = []
    const currentYear = new Date().getFullYear()
    let conservativeVal = investments.reduce(
      (acc, inv) => acc + inv.purchasePrice * inv.quantity,
      0,
    )
    let customVal = conservativeVal

    for (let i = 0; i <= 10; i++) {
      data.push({
        ano: (currentYear + i).toString(),
        Conservador: parseFloat(conservativeVal.toFixed(2)),
        Personalizado: parseFloat(customVal.toFixed(2)),
      })

      let consGrowth = 0
      let custGrowth = 0

      investments.forEach((inv) => {
        const v = inv.purchasePrice * inv.quantity
        const r = inv.type === 'Prefixado' ? inv.rate : inv.rate + settings.ipcaAverage24m
        const rCust = inv.type === 'Prefixado' ? inv.rate : inv.rate + parsedCustomIpca
        consGrowth += v * (r / 100)
        custGrowth += v * (rCust / 100)
      })

      conservativeVal += consGrowth
      customVal += custGrowth
    }
    return data
  }, [investments, settings.ipcaAverage24m, parsedCustomIpca])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Simulador de Cenários</h2>
          <p className="text-muted-foreground">
            Projete o impacto de diferentes níveis de inflação na sua carteira.
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Exportar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Parâmetros
            </CardTitle>
            <CardDescription>Defina as taxas para simulação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>IPCA Base (Conservador)</Label>
              <div className="p-3 bg-muted rounded-md border text-sm font-medium">
                {settings.ipcaAverage24m}% a.a.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-ipca">IPCA Alvo (Personalizado) %</Label>
              <Input
                id="custom-ipca"
                type="number"
                step="0.1"
                value={customIpca}
                onChange={(e) => setCustomIpca(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Comparativo Projetado</CardTitle>
              <CardDescription>Evolução ao longo de 10 anos</CardDescription>
            </div>
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(v) => v && setChartType(v)}
              size="sm"
            >
              <ToggleGroupItem value="line">
                <LineIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="bar">
                <BarIcon className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="area">
                <AreaIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={simulationData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${v / 1000}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="Personalizado"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="Conservador"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart
                  data={simulationData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${v / 1000}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Conservador" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Personalizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart
                  data={simulationData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="ano" axisLine={false} tickLine={false} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$ ${v / 1000}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="Conservador"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Personalizado"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead className="text-right">Conservador</TableHead>
                  <TableHead className="text-right">Personalizado</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulationData.map((d) => (
                  <TableRow key={d.ano}>
                    <TableCell className="font-medium">{d.ano}</TableCell>
                    <TableCell className="text-right">{formatCurrency(d.Conservador)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(d.Personalizado)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      +{formatCurrency(Math.max(0, d.Personalizado - d.Conservador))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
