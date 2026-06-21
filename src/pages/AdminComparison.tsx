import React, { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import useUserStore from '@/stores/useUserStore'

export default function AdminComparison() {
  const { users } = useUserStore()

  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showSelic, setShowSelic] = useState(true)
  const [showIpca, setShowIpca] = useState(true)
  const [showIpcaPlus6, setShowIpcaPlus6] = useState(true)
  const [timeRange, setTimeRange] = useState('12m')

  const chartData = useMemo(() => {
    let months = 12
    if (timeRange === '1m') months = 1
    if (timeRange === '24m') months = 24
    if (timeRange === '36m') months = 36
    if (timeRange === 'ytd') months = new Date().getMonth() + 1

    const data = []

    const userVals: Record<string, number> = {}
    selectedUsers.forEach((uid) => (userVals[uid] = 100))
    let selicVal = 100
    let ipcaVal = 100
    let ipca6Val = 100

    for (let i = months; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

      const row: any = { name: monthName }

      selectedUsers.forEach((uid) => {
        const user = users.find((u) => u.id === uid)
        if (user) {
          row[user.name] = parseFloat(userVals[uid].toFixed(2))
          userVals[uid] *= 1 + (0.005 + Math.random() * 0.008)
        }
      })

      if (showSelic) {
        row['SELIC'] = parseFloat(selicVal.toFixed(2))
        selicVal *= 1 + 0.0085
      }
      if (showIpca) {
        row['IPCA'] = parseFloat(ipcaVal.toFixed(2))
        ipcaVal *= 1 + 0.0035
      }
      if (showIpcaPlus6) {
        row['IPCA + 6%'] = parseFloat(ipca6Val.toFixed(2))
        ipca6Val *= 1 + 0.0082
      }

      data.push(row)
    }
    return data
  }, [selectedUsers, showSelic, showIpca, showIpcaPlus6, timeRange, users])

  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

  const selectableUsers = users.filter((u) => u.role === 'User')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Comparativo de Carteiras</h2>
        <p className="text-muted-foreground">
          Compare a rentabilidade projetada entre os usuários e benchmarks do mercado.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtros de Análise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Usuários
              </h3>
              {selectableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum usuário disponível.</p>
              ) : (
                selectableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedUsers((p) => [...p, user.id])
                        else setSelectedUsers((p) => p.filter((id) => id !== user.id))
                      }}
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {user.name}
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Benchmarks
              </h3>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">SELIC</label>
                <Switch checked={showSelic} onCheckedChange={setShowSelic} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">IPCA</label>
                <Switch checked={showIpca} onCheckedChange={setShowIpca} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">IPCA + 6%</label>
                <Switch checked={showIpcaPlus6} onCheckedChange={setShowIpcaPlus6} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Período
              </h3>
              <ToggleGroup
                type="single"
                value={timeRange}
                onValueChange={(v) => v && setTimeRange(v)}
                className="justify-start flex-wrap gap-2"
              >
                <ToggleGroupItem value="1m" className="text-xs h-8 px-3">
                  1M
                </ToggleGroupItem>
                <ToggleGroupItem value="12m" className="text-xs h-8 px-3">
                  12M
                </ToggleGroupItem>
                <ToggleGroupItem value="24m" className="text-xs h-8 px-3">
                  24M
                </ToggleGroupItem>
                <ToggleGroupItem value="36m" className="text-xs h-8 px-3">
                  36M
                </ToggleGroupItem>
                <ToggleGroupItem value="ytd" className="text-xs h-8 px-3">
                  YTD
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 min-h-[500px] flex flex-col shadow-sm">
          <CardHeader>
            <CardTitle>Evolução Patrimonial Comparativa (Base 100)</CardTitle>
            <CardDescription>Rentabilidade acumulada dos perfis selecionados</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[400px]">
            {chartData.length > 0 &&
            (selectedUsers.length > 0 || showSelic || showIpca || showIpcaPlus6) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ paddingBottom: '20px' }}
                  />

                  {selectedUsers.map((uid, idx) => {
                    const user = users.find((u) => u.id === uid)
                    if (!user) return null
                    return (
                      <Line
                        key={uid}
                        type="monotone"
                        dataKey={user.name}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    )
                  })}

                  {showSelic && (
                    <Line
                      type="monotone"
                      dataKey="SELIC"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                  {showIpca && (
                    <Line
                      type="monotone"
                      dataKey="IPCA"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                  {showIpcaPlus6 && (
                    <Line
                      type="monotone"
                      dataKey="IPCA + 6%"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Selecione ao menos um usuário ou benchmark para visualizar no gráfico.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
