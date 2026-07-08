import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import usePortfolioStore from '@/stores/usePortfolioStore'

const brokerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrokerAddDialog({ open, onOpenChange }: Props) {
  const { addBroker, userBrokers } = usePortfolioStore()
  const [duplicateError, setDuplicateError] = useState('')

  const form = useForm<z.infer<typeof brokerSchema>>({
    resolver: zodResolver(brokerSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = (values: z.infer<typeof brokerSchema>) => {
    const exists = userBrokers.some(
      (b) => b.name.toLowerCase() === values.name.trim().toLowerCase(),
    )
    if (exists) {
      setDuplicateError('Esta corretora já está cadastrada.')
      return
    }
    addBroker(values.name)
    form.reset({ name: '' })
    setDuplicateError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Incluir Corretora</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Corretora</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: XP Investimentos"
                      onChange={(e) => {
                        field.onChange(e)
                        setDuplicateError('')
                      }}
                    />
                  </FormControl>
                  {duplicateError && <p className="text-sm text-destructive">{duplicateError}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
