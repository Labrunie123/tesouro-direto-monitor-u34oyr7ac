import React, { useState, useMemo } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Download, Edit2, Trash2, ArrowUpDown, FileText, LineChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import usePortfolioStore, { Investment, YieldPeriod } from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate, formatPercent } from '@/lib/formatters'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const formSchema = z.object({
  title: z.string().min(3, 'Título muito curto'),
  agent: z.string().min(2, 'Informe a corretora'),
  purchaseDate: z.string().min(1, 'Data obrigatória'),
  maturityDate: z.string().optional(),
  quantity: z.coerce.number().positive('Quantidade deve ser > 0'),
  purchasePrice: z.coerce.number().positive('Preço deve ser > 0'),
  rate: z.coerce.number().nonnegative('Taxa inválida'),
  type: z.enum(['IPCA+', 'Selic', 'Prefixado', 'Renda+', 'Educa+'] as const),
  hasSemiannualCoupon: z.boolean().default(false),
})

export default function Portfolio() {
  const {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    calculateCurrentValue,
    getYieldForPeriod,
    yieldPeriod,
    setYieldPeriod,
  } = usePortfolioStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      agent: '',
      purchaseDate: '',
      maturityDate: '',
      quantity: 1,
      purchasePrice: 0,
      rate: 0,
      type: 'IPCA+',
      hasSemiannualCoupon: false,
    },
  })

  const handleOpenForm = (inv?: Investment) => {
    if (inv) {
      setEditingId(inv.id)
      form.reset({
        ...inv,
        hasSemiannualCoupon: inv.hasSemiannualCoupon || false,
        maturityDate: inv.maturityDate || '',
      })
    } else {
      setEditingId(null)
      form.reset({
        title: '',
        agent: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        maturityDate: '',
        quantity: 1,
        purchasePrice: 0,
        rate: 0,
        type: 'IPCA+',
        hasSemiannualCoupon: false,
      })
    }
    setIsFormOpen(true)
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateInvestment(editingId, values)
      toast({ title: 'Título atualizado com sucesso!' })
    } else {
      addInvestment(values)
      toast({ title: 'Título adicionado com sucesso!' })
    }
    setIsFormOpen(false)
  }

  const confirmDelete = () => {
    if (deletingId) {
      deleteInvestment(deletingId)
      toast({ title: 'Título removido.', variant: 'destructive' })
      setIsDeleteOpen(false)
    }
  }

  const exportCSV = () => {
    const headers = [
      'Título,Corretora,Data Compra,Qtd,Preço Compra,Taxa(%),VNA Atual,Total Atual,Yield',
    ]
    const rows = investments.map((i) => {
      const vna = calculateCurrentValue(i)
      const y = getYieldForPeriod(i, yieldPeriod)
      return `${i.title},${i.agent},${i.purchaseDate},${i.quantity},${i.purchasePrice},${i.rate},${vna.toFixed(2)},${(vna * i.quantity).toFixed(2)},${y.toFixed(2)}`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csvContent)
    link.download = 'minha_carteira_tesouro.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const analyzingInv = useMemo(
    () => investments.find((i) => i.id === analyzingId),
    [analyzingId, investments],
  )

  const mtmData = useMemo(() => {
    if (!analyzingInv) return []
    const data = []
    const start = new Date(analyzingInv.purchaseDate)
    const end = new Date()
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()
    let curCurve = analyzingInv.purchasePrice
    let curMarket = analyzingInv.purchasePrice

    for (let i = 0; i <= Math.max(months, 1); i++) {
      const d = new Date(start)
      d.setMonth(d.getMonth() + i)

      const curveRate = analyzingInv.rate / 12 / 100
      curCurve *= 1 + curveRate

      // Simulate market fluctuation around the curve
      const vol = Math.sin(i) * 0.02 + 1
      curMarket = curCurve * vol

      data.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        Curva: parseFloat(curCurve.toFixed(2)),
        Mercado: parseFloat(curMarket.toFixed(2)),
      })
    }
    return data
  }, [analyzingInv])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Minha Carteira</h2>
          <p className="text-muted-foreground">Gerencie seus títulos do Tesouro Direto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yieldPeriod} onValueChange={(v) => setYieldPeriod(v as YieldPeriod)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Desde o Início</SelectItem>
              <SelectItem value="24m">Últimos 24m</SelectItem>
              <SelectItem value="12m">Últimos 12m</SelectItem>
              <SelectItem value="6m">Últimos 6m</SelectItem>
              <SelectItem value="3m">Últimos 3m</SelectItem>
              <SelectItem value="1m">Último Mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="hidden md:flex">
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Corretora</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Taxa</TableHead>
                <TableHead className="text-right text-primary">Yield ({yieldPeriod})</TableHead>
                <TableHead className="text-right">VNA Total</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum título cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                investments.map((inv) => {
                  const vna = calculateCurrentValue(inv)
                  const total = vna * inv.quantity
                  const yieldVal = getYieldForPeriod(inv, yieldPeriod)

                  return (
                    <TableRow key={inv.id} className="group">
                      <TableCell className="font-medium">
                        <div>{inv.title}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{inv.agent}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {inv.agent}
                      </TableCell>
                      <TableCell className="text-right">{inv.quantity}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{inv.rate}%</TableCell>
                      <TableCell
                        className={`text-right font-medium ${yieldVal >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
                      >
                        {yieldVal > 0 ? '+' : ''}
                        {formatPercent(yieldVal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500"
                            onClick={() => setAnalyzingId(inv.id)}
                            title="Marcação a Mercado"
                          >
                            <LineChart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenForm(inv)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setDeletingId(inv.id)
                              setIsDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Título' : 'Adicionar Novo Título'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Título</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IPCA+">IPCA+</SelectItem>
                          <SelectItem value="Selic">Selic</SelectItem>
                          <SelectItem value="Prefixado">Prefixado</SelectItem>
                          <SelectItem value="Renda+">Renda+</SelectItem>
                          <SelectItem value="Educa+">Educa+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corretora</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Compra</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Unitário (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!analyzingId} onOpenChange={(v) => !v && setAnalyzingId(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Análise de Marcação a Mercado</DialogTitle>
            <DialogDescription>
              {analyzingInv?.title} • {analyzingInv?.agent}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={mtmData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `R$ ${v}`}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="Mercado"
                    name="Valor de Mercado"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Curva"
                    name="Valor na Curva (Teórico)"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
            {mtmData.length > 0 && (
              <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg mt-4 border border-border/50">
                <div>
                  <p className="text-sm text-muted-foreground">Valor na Curva Atual</p>
                  <p className="font-semibold">
                    {formatCurrency(mtmData[mtmData.length - 1].Curva)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor de Mercado Atual</p>
                  <p className="font-semibold text-primary">
                    {formatCurrency(mtmData[mtmData.length - 1].Mercado)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
