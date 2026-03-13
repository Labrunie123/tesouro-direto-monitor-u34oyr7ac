import React, { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Download, Edit2, Trash2, ArrowUpDown, FileText } from 'lucide-react'
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
  DialogTrigger,
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
import usePortfolioStore, { Investment, BondType } from '@/stores/usePortfolioStore'
import { formatCurrency, formatDate } from '@/lib/formatters'

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
    settings,
    calculateCurrentValue,
  } = usePortfolioStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
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
      'Título,Corretora,Data Compra,Vencimento,Semestral,Qtd,Preço Compra,Taxa(%),VNA Atual,Total Atual',
    ]
    const rows = investments.map((i) => {
      const vna = calculateCurrentValue(i)
      return `${i.title},${i.agent},${i.purchaseDate},${i.maturityDate || '-'},${i.hasSemiannualCoupon ? 'Sim' : 'Não'},${i.quantity},${i.purchasePrice},${i.rate},${vna.toFixed(2)},${(vna * i.quantity).toFixed(2)}`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'minha_carteira_tesouro.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Minha Carteira</h2>
          <p className="text-muted-foreground">Gerencie seus títulos do Tesouro Direto.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} className="hidden md:flex">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" asChild>
            <Link to="/report" target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Link>
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Título</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-0 border-b">
          <div className="px-6 py-4 flex items-center justify-between bg-muted/30 rounded-t-xl">
            <CardTitle className="text-lg">Posição Consolidada</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="font-semibold">
                  Título <ArrowUpDown className="inline ml-1 h-3 w-3" />
                </TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Corretora</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Data Compra</TableHead>
                <TableHead className="font-semibold text-right">Qtd</TableHead>
                <TableHead className="font-semibold text-right hidden sm:table-cell">
                  Taxa
                </TableHead>
                <TableHead className="font-semibold text-right">VNA (Estimado)</TableHead>
                <TableHead className="font-semibold text-right">Valor Total</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Nenhum título cadastrado. Adicione seu primeiro investimento!
                  </TableCell>
                </TableRow>
              ) : (
                investments.map((inv) => {
                  const vna = calculateCurrentValue(inv)
                  const total = vna * inv.quantity
                  return (
                    <TableRow key={inv.id} className="group">
                      <TableCell className="font-medium">
                        <div>{inv.title}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{inv.agent}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {inv.agent}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDate(inv.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-right">{inv.quantity}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{inv.rate}%</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(vna)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <Input placeholder="Ex: Tesouro IPCA+ 2045" {...field} />
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
                            <SelectValue placeholder="Selecione o tipo" />
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
                      <FormLabel>Agente de Custódia</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: XP Investimentos" {...field} />
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
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
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
                      <FormLabel>Taxa Acordada (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                  name="hasSemiannualCoupon"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-full mt-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Paga Juros Semestrais?</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Habilita notificações automáticas de pagamento de cupons.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Título</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este título da sua carteira? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Sim, excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
