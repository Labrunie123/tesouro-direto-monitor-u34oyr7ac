import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Settings2,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import usePortfolioStore, { BondType } from '@/stores/usePortfolioStore'
import { parseExcelDate, formatDate } from '@/lib/formatters'

type LocalBroker = {
  id: string
  name: string
  logo: string
  status: 'connected' | 'disconnected'
  lastSync?: string
}

const INITIAL_BROKERS: LocalBroker[] = [
  {
    id: 'xp',
    name: 'XP Investimentos',
    logo: 'https://img.usecurling.com/i?q=finance&color=black',
    status: 'disconnected',
  },
  {
    id: 'btg',
    name: 'BTG Pactual',
    logo: 'https://img.usecurling.com/i?q=bank&color=blue',
    status: 'disconnected',
  },
  {
    id: 'nuinvest',
    name: 'NuInvest',
    logo: 'https://img.usecurling.com/i?q=wallet&color=purple',
    status: 'disconnected',
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    logo: 'https://img.usecurling.com/i?q=globe&color=orange',
    status: 'disconnected',
  },
]

export default function Import() {
  const { importInvestments, settings, updateSettings } = usePortfolioStore()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [ipcaInput, setIpcaInput] = useState(settings.ipcaAverage24m.toString())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [localBrokers, setLocalBrokers] = useState<LocalBroker[]>(INITIAL_BROKERS)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null)
  const [authForm, setAuthForm] = useState({ user: '', password: '', token: '' })

  const processCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter((l) => l.trim() !== '')
      if (lines.length <= 1) throw new Error('Arquivo vazio ou sem dados.')

      const newInvs = lines
        .slice(1)
        .map((line) => {
          const cols = line.split(',')
          if (cols.length < 6) return null
          const t = cols[0].toUpperCase()
          const type: BondType = t.includes('PREFIXADO')
            ? 'Prefixado'
            : t.includes('SELIC')
              ? 'Selic'
              : t.includes('RENDA+')
                ? 'Renda+'
                : t.includes('EDUCA+')
                  ? 'Educa+'
                  : 'IPCA+'
          return {
            title: cols[0].trim(),
            agent: cols[1].trim(),
            purchaseDate: parseExcelDate(cols[2].trim()),
            quantity: parseFloat(cols[3]),
            purchasePrice: parseFloat(cols[4]),
            rate: parseFloat(cols[5]),
            type,
          }
        })
        .filter(Boolean) as any[]

      if (newInvs.length > 0) {
        importInvestments(newInvs)
        toast({ title: `${newInvs.length} títulos importados com sucesso!` })
      } else {
        throw new Error('Nenhuma linha válida encontrada.')
      }
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader()
      reader.onload = (ev) => processCSV(ev.target?.result as string)
      reader.readAsText(file)
    } else {
      toast({
        title: 'Formato inválido',
        description: 'Envie um arquivo .csv',
        variant: 'destructive',
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => processCSV(ev.target?.result as string)
      reader.readAsText(file)
    }
  }

  const handleConnectClick = (id: string) => {
    setSelectedBrokerId(id)
    setAuthForm({ user: '', password: '', token: '' })
    setAuthModalOpen(true)
  }

  const handleDisconnect = (id: string) => {
    setLocalBrokers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'disconnected', lastSync: undefined } : b)),
    )
    toast({ title: 'Desconectado com sucesso' })
  }

  const submitAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrokerId) return
    setLocalBrokers((prev) =>
      prev.map((b) =>
        b.id === selectedBrokerId
          ? { ...b, status: 'connected', lastSync: new Date().toISOString() }
          : b,
      ),
    )
    setAuthModalOpen(false)
    toast({ title: `Conectado com sucesso!` })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importação e Ajustes</h2>
        <p className="text-muted-foreground">
          Configure os parâmetros e gerencie suas integrações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Diretório de Corretoras
          </CardTitle>
          <CardDescription>
            Conecte suas corretoras para sincronizar dados. Conexões são temporárias e não
            armazenamos credenciais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {localBrokers.map((broker) => (
              <div
                key={broker.id}
                className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                  broker.status === 'connected'
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <img
                  src={broker.logo}
                  alt={broker.name}
                  className="h-10 w-10 object-contain mb-3 rounded-md mix-blend-multiply"
                />
                <h4 className="font-semibold text-sm mb-1">{broker.name}</h4>
                <Badge
                  variant={broker.status === 'connected' ? 'default' : 'secondary'}
                  className={
                    broker.status === 'connected'
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white mb-4 text-[10px]'
                      : 'mb-4 text-[10px]'
                  }
                >
                  {broker.status === 'connected' ? 'Connected' : 'Disconnected'}
                </Badge>
                {broker.status === 'connected' && broker.lastSync && (
                  <p className="text-xs text-muted-foreground mb-4 text-center">
                    Última sinc: {formatDate(broker.lastSync)}
                  </p>
                )}
                {broker.status === 'connected' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={() => handleDisconnect(broker.id)}
                  >
                    <Unlink className="h-3 w-3" /> Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleConnectClick(broker.id)}
                  >
                    <LinkIcon className="h-3 w-3" /> Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Importação Manual (CSV)
            </CardTitle>
            <CardDescription>Envie um arquivo CSV contendo sua carteira.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors h-full min-h-[200px] ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <UploadCloud
                className={`h-10 w-10 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste seu arquivo CSV ou clique
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm">
                Selecionar Arquivo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                Sincronização de VNA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-lg border border-border/50">
                <div>
                  <p className="font-medium text-sm">Última atualização</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(settings.lastSync).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsSyncing(true)
                    setTimeout(() => {
                      updateSettings({ lastSync: new Date().toISOString() })
                      setIsSyncing(false)
                      toast({ title: 'VNA sincronizado!' })
                    }, 1500)
                  }}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />{' '}
                  Sincronizar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-orange-500" />
                Parâmetros de Projeção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ipca" className="text-xs">
                  Média IPCA (Últimos 24 meses) %
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ipca"
                    type="number"
                    step="0.01"
                    value={ipcaInput}
                    onChange={(e) => setIpcaInput(e.target.value)}
                    className="max-w-[150px] h-9"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const v = parseFloat(ipcaInput)
                      if (!isNaN(v) && v >= 0) {
                        updateSettings({ ipcaAverage24m: v })
                        toast({ title: 'Salvo com sucesso' })
                      } else {
                        toast({ title: 'Valor inválido', variant: 'destructive' })
                      }
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={submitAuth}>
            <DialogHeader>
              <DialogTitle>Autenticação da Corretora</DialogTitle>
              <DialogDescription>
                Insira suas credenciais para conectar à{' '}
                {localBrokers.find((b) => b.id === selectedBrokerId)?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3.5 rounded-md flex gap-3 text-sm my-4 items-start shadow-sm">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Security Notice:</strong> These credentials are not stored and will be
                requested again for future connections. Suas credenciais permanecem seguras e
                efêmeras.
              </p>
            </div>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">User (CPF/Login)</Label>
                <Input
                  id="user"
                  value={authForm.user}
                  onChange={(e) => setAuthForm({ ...authForm, user: e.target.value })}
                  placeholder="Seu usuário"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Sua senha"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token">Token / Access Key (MFA)</Label>
                <Input
                  id="token"
                  value={authForm.token}
                  onChange={(e) => setAuthForm({ ...authForm, token: e.target.value })}
                  placeholder="Código do App"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAuthModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Autenticar e Conectar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
