import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, Users as UsersIcon, Eye, Edit, Trash2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import useUserStore, { User } from '@/stores/useUserStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export default function Users() {
  const {
    filteredUsers,
    searchQuery,
    setSearchQuery,
    addUser,
    updateUser,
    deleteUser,
    activeRole,
  } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (activeRole !== 'Admin') {
      navigate('/')
    }
  }, [activeRole, navigate])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', cpf: '', password: '' })

  const handleAddClick = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', cpf: '', password: '' })
    setIsFormOpen(true)
  }

  const handleEditClick = (user: User) => {
    if (user.role === 'Admin') {
      toast({
        title: 'Admins devem editar seus dados na página de Configurações.',
        variant: 'destructive',
      })
      return
    }
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      password: user.password || '',
    })
    setIsFormOpen(true)
  }

  const handleFormSubmit = () => {
    if (editingUser) {
      updateUser(editingUser.id, formData)
      toast({ title: 'Usuário atualizado com sucesso!' })
    } else {
      addUser({ ...formData, role: 'User', status: 'Active' })
      toast({ title: 'Novo usuário registrado com sucesso!' })
    }
    setIsFormOpen(false)
  }

  const handleDelete = (id: string, role: string) => {
    if (role === 'Admin') {
      toast({ title: 'Não é possível remover o administrador principal.', variant: 'destructive' })
      return
    }
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      deleteUser(id)
      toast({ title: 'Usuário removido.' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-muted-foreground mt-1">
            Administre os acessos e perfis da sua plataforma.
          </p>
        </div>
        <Button onClick={handleAddClick} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.name}
                    {user.role === 'Admin' && (
                      <Shield className="h-4 w-4 text-primary" title="Administrador" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.cpf}</TableCell>
                <TableCell>
                  <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                    {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user.role === 'User' && (
                      <Button variant="outline" size="icon" asChild title="Ver Carteira">
                        <Link to={`/admin/users/${user.id}/portfolio`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(user)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.role === 'User' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id, user.role)}
                        title="Remover"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF</label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFormSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
