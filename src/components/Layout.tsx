import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Wallet,
  Coins,
  TrendingUp,
  BarChart3,
  Calculator,
  Users,
  Upload,
  GitCompare,
  Settings,
} from 'lucide-react'

const navItems = [
  { title: 'Painel Geral', href: '/', icon: LayoutDashboard },
  { title: 'Carteira', href: '/portfolio', icon: Wallet },
  { title: 'Rendimentos', href: '/dividends', icon: Coins },
  { title: 'Projeções', href: '/projections', icon: TrendingUp },
  { title: 'Benchmarks', href: '/benchmarks', icon: BarChart3 },
  { title: 'Simulador', href: '/simulator', icon: Calculator },
  { title: 'Usuários', href: '/users', icon: Users },
  { title: 'Importar', href: '/import', icon: Upload },
]

const adminItems = [
  { title: 'Comparação', href: '/admin/comparison', icon: GitCompare },
  { title: 'Configurações', href: '/admin/settings', icon: Settings },
]

const pageTitles: Record<string, string> = {
  '/': 'Painel Geral',
  '/portfolio': 'Carteira',
  '/dividends': 'Rendimentos',
  '/projections': 'Projeções',
  '/benchmarks': 'Benchmarks',
  '/simulator': 'Simulador',
  '/users': 'Usuários',
  '/import': 'Importar',
  '/admin/comparison': 'Comparação',
  '/admin/settings': 'Configurações',
}

export default function Layout() {
  const location = useLocation()
  const currentTitle = pageTitles[location.pathname] || 'Painel Geral'

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-base font-bold">Tesouro Monitor</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-6">
          <SidebarTrigger />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tesouro Monitor</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{currentTitle}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
