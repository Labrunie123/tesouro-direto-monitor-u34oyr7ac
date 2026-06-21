import React, { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import usePortfolioStore from '@/stores/usePortfolioStore'
import useUserStore from '@/stores/useUserStore'
import Portfolio from './Portfolio'

export default function AdminUserPortfolio() {
  const { userId } = useParams()
  const { setCurrentUserId } = usePortfolioStore()
  const { users } = useUserStore()

  useEffect(() => {
    if (userId) {
      setCurrentUserId(userId)
    }
    return () => {
      setCurrentUserId(null)
    }
  }, [userId, setCurrentUserId])

  const user = users.find((u) => u.id === userId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 bg-primary/10 text-primary p-4 rounded-lg border border-primary/20">
        <Button variant="outline" size="sm" asChild className="bg-background">
          <Link to="/users">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Link>
        </Button>
        <div>
          <h2 className="font-semibold text-sm md:text-base">
            Modo Administrador: Visualizando Carteira
          </h2>
          <p className="text-xs md:text-sm opacity-80 mt-0.5">
            Editando e analisando dados do usuário: <strong>{user?.name || 'Desconhecido'}</strong>
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Portfolio />
      </div>
    </div>
  )
}
