import React, { useState } from 'react'
import { Plus, Search, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import useUserStore, { User } from '@/stores/useUserStore'
import { UserTable } from '@/components/users/UserTable'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { UserDeleteDialog } from '@/components/users/UserDeleteDialog'

export default function Users() {
  const { searchQuery, setSearchQuery, addUser, updateUser, deleteUser } = useUserStore()
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const handleAddClick = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (values: any) => {
    if (editingUser) {
      updateUser(editingUser.id, { name: values.name, email: values.email })
      toast({ title: 'Informações do usuário atualizadas com sucesso!' })
    } else {
      addUser({ name: values.name, email: values.email, role: 'User', status: 'Active' })
      toast({ title: 'Novo usuário registrado com sucesso!' })
    }
    setIsFormOpen(false)
  }

  const handleDeleteConfirm = (id: string) => {
    deleteUser(id)
    toast({ title: 'Usuário removido permanentemente.', variant: 'destructive' })
    setDeletingUser(null)
  }

  const handleToggleStatus = (user: User, status: 'Active' | 'Inactive') => {
    try {
      updateUser(user.id, { status })
      toast({ title: 'Status do usuário atualizado com sucesso' })
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
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
            placeholder="Buscar por nome ou email..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <UserTable
        onEdit={handleEditClick}
        onDelete={setDeletingUser}
        onToggleStatus={handleToggleStatus}
      />

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingUser={editingUser}
        onSubmit={handleFormSubmit}
      />

      <UserDeleteDialog
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
