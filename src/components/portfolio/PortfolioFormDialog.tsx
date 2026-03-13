import React, { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import usePortfolioStore, { Investment } from '@/stores/usePortfolioStore'

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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingLot: Investment | null
  prefillTitle: string | null
  onSubmit: (values: z.infer<typeof formSchema>) => void
}

export function PortfolioFormDialog({
  open,
  onOpenChange,
  editingLot,
  prefillTitle,
  onSubmit,
}: Props) {
  const { investments } = usePortfolioStore()

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

  useEffect(() => {
    if (!open) return
    if (editingLot) {
      form.reset({
        ...editingLot,
        maturityDate: editingLot.maturityDate || '',
        hasSemiannualCoupon: editingLot.hasSemiannualCoupon || false,
      })
    } else if (prefillTitle) {
      const existing = investments.find((i) => i.title === prefillTitle)
      form.reset({
        title: prefillTitle,
        agent: existing?.agent || '',
        type: existing?.type || 'IPCA+',
        maturityDate: existing?.maturityDate || '',
        hasSemiannualCoupon: existing?.hasSemiannualCoupon || false,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 1,
        purchasePrice: 0,
        rate: 0,
      })
    } else {
      form.reset({
        title: '',
        agent: '',
        type: 'IPCA+',
        purchaseDate: new Date().toISOString().split('T')[0],
        maturityDate: '',
        quantity: 1,
        purchasePrice: 0,
        rate: 0,
        hasSemiannualCoupon: false,
      })
    }
  }, [open, editingLot, prefillTitle, investments, form])

  const existingTitles = Array.from(new Set(investments.map((i) => i.title)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingLot
              ? 'Editar Lote'
              : prefillTitle
                ? 'Adicionar Lote à Sub-Carteira'
                : 'Adicionar Novo Título'}
          </DialogTitle>
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
                      <div>
                        <datalist id="existing-titles">
                          {existingTitles.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                        <Input
                          {...field}
                          list="existing-titles"
                          placeholder="Ex: Tesouro IPCA+ 2045"
                        />
                      </div>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Data de Compra (Lote)</FormLabel>
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
                    <FormLabel>Taxa de Compra (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
