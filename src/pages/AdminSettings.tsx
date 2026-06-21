import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import useUserStore from '@/stores/useUserStore'

export default function AdminSettings() {
  const { activeUser, activeRole, updateUser } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (activeRole !== 'Admin') {
      navigate('/')
    }
  }, [activeRole, navigate])

  const [cpf, setCpf] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  useEffect(() => {
    if (activeUser) {
      setCpf(activeUser.cpf)
      setUserPassword(activeUser.password || '')
      setAdminPassword(activeUser.adminPassword || '')
    }
  }, [activeUser])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.length > 11) val = val.slice(0, 11)
    val = val.replace(/(\d{3})(\d)/, '$1.$2')
    val = val.replace(/(\d{3})(\d)/, '$1.$2')
    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    setCpf(val)
  }

  const handleSave = () => {
    if (activeUser) {
      updateUser(activeUser.id, {
        cpf,
        password: userPassword,
        adminPassword,
      })
      toast({ title: 'Configurações atualizadas com sucesso' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto mt-8">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Segurança e Acesso Administrativo
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie o CPF e as senhas mestre de acesso à plataforma.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Credenciais do Sistema</CardTitle>
          <CardDescription>
            Atualize suas informações de login. A senha do Modo Usuário permite acessar a plataforma
            como investidor comum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">CPF do Administrador</label>
            <Input value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" />
            <p className="text-xs text-muted-foreground">
              Este CPF será usado para ambos os modos de acesso.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Senha (Modo Usuário)
              </label>
              <Input
                type="text"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Senha (Modo Admin)
              </label>
              <Input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 flex justify-end border-t p-4 mt-4">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
