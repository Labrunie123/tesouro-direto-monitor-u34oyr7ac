import React, { useEffect } from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  BarChart3,
  Download,
  Plus,
  Settings,
  Calculator,
  Bell,
  HandCoins,
  Users,
  LogOut,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import usePortfolioStore from '@/stores/usePortfolioStore'
import useUserStore from '@/stores/useUserStore'
import { formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function Layout() {
  const location = useLocation()
  const { settings, notifications, setCurrentUserId } = usePortfolioStore()
  const { activeUser, activeRole, logout } = useUserStore()

  useEffect(() => {
    if (activeUser && !location.pathname.includes('/admin/users/')) {
      setCurrentUserId(activeUser.id)
    }
  }, [activeUser, setCurrentUserId, location.pathname])

  if (!activeUser) {
    return <Navigate to="/login" replace />
  }

  if (
    activeRole === 'User' &&
    (location.pathname.startsWith('/admin') || location.pathname === '/users')
  ) {
    return <Navigate to="/" replace />
  }

  const userNav = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { title: 'Minha Carteira', icon: Wallet, path: '/portfolio' },
    { title: 'Dividendos', icon: HandCoins, path: '/dividends' },
    { title: 'Projeções', icon: TrendingUp, path: '/projections' },
    { title: 'Benchmarks', icon: BarChart3, path: '/benchmarks' },
    { title: 'Simulador', icon: Calculator, path: '/simulator' },
    { title: 'Importar Dados', icon: Download, path: '/import' },
  ]

  const adminNav = [
    ...userNav,
    { title: 'Gestão de Usuários', icon: Users, path: '/users' },
    { title: 'Comparativo Admin', icon: BarChart3, path: '/admin/comparison' },
    { title: 'Configurações', icon: Settings, path: '/admin/settings' },
  ]

  const navItems = activeRole === 'Admin' ? adminNav : userNav

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <Sidebar variant="inset" className="border-r border-border/50">
          <SidebarHeader className="flex flex-row items-center gap-2 p-4 pt-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">TesouroVision</span>
          </SidebarHeader>
          <SidebarContent className="px-2 mt-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      location.pathname === item.path ||
                      location.pathname.startsWith(item.path + '/')
                    }
                    className="h-11 rounded-lg px-4"
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border/50">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback>{activeUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold truncate max-w-[100px]">
                    {activeUser.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeRole === 'Admin' ? 'Administrador' : 'Investidor'}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex w-full flex-1 flex-col overflow-hidden bg-muted/20">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm md:px-8">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-4 ml-2">
                <h1 className="text-lg font-semibold hidden sm:block">
                  {navItems.find((i) => i.path === location.pathname)?.title ||
                    (activeRole === 'Admin' ? 'Administração' : 'Visão Geral')}
                </h1>
                <div className="hidden items-center gap-1.5 rounded-full bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground md:flex">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  VNA Atualizado: {formatDate(settings.lastSync)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative mr-2">
                        <Bell className="h-5 w-5" />
                        {notifications.length > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
                          >
                            {notifications.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Notificações Inteligentes</h4>
                        {notifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground mt-2">
                            Nenhuma notificação pendente.
                          </p>
                        ) : (
                          <div className="space-y-3 mt-4">
                            {notifications.map((n) => (
                              <div
                                key={n.id}
                                className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                              >
                                <span className="text-sm font-medium flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'h-2 w-2 rounded-full shrink-0',
                                      n.type === 'maturity' ? 'bg-destructive' : 'bg-primary',
                                    )}
                                  />
                                  {n.title}
                                </span>
                                <span className="text-xs text-muted-foreground ml-4">
                                  {n.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button size="sm" variant="outline" className="hidden md:flex gap-2" asChild>
                    <Link to="/import">
                      <Settings className="h-4 w-4" />
                      Ajustes
                    </Link>
                  </Button>
                  <Button size="sm" className="gap-2 shadow-sm" asChild>
                    <Link to="/portfolio">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Adicionar Título</span>
                      <span className="sm:hidden">Novo</span>
                    </Link>
                  </Button>
                </>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
