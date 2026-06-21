import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import useUserStore from '@/stores/useUserStore'

export default function Login() {
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useUserStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 11) val = val.slice(0, 11)
    val = val.replace(/(\d{3})(\d)/, '$1.$2')
    val = val.replace(/(\d{3})(\d)/, '$1.$2')
    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    setCpf(val)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const role = login(cpf, password)
    if (role) {
      toast({ title: 'Acesso liberado com sucesso' })
      if (role === 'Admin') {
        navigate('/admin/comparison')
      } else {
        navigate('/')
      }
    } else {
      toast({ title: 'Credenciais inválidas', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-card p-8 rounded-xl shadow-sm border w-full max-w-sm animate-fade-in-up"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-center">TesouroVision</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta para continuar</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CPF</label>
            <Input value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full mt-2">
            Entrar
          </Button>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground text-center space-y-1">
          <p>
            <strong>Admin:</strong> 000.000.000-00
          </p>
          <p>
            Modo Usuário: <code>user123</code>
          </p>
          <p>
            Modo Admin: <code>admin123</code>
          </p>
        </div>
      </form>
    </div>
  )
}
