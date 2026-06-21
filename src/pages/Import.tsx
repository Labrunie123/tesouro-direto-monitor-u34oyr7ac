import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Settings2,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  ShieldAlert,
  History,
  Download,
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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import usePortfolioStore, { BondType } from '@/stores/usePortfolioStore'
import { parseExcelDate, formatCurrency, formatPercent } from '@/lib/formatters'

export default function Import() {
  const {
    importInvestments,
    settings,
    updateSettings,
    connectionLogs,
    addConnectionLog,
    brokers,
    setBrokerStatus,
  } = usePortfolioStore()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [ipcaInput, setIpcaInput] = useState(settings.ipcaAverage24m.toString())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null)
  const [authForm, setAuthForm] = useState({ user: '', password: '', token: '' })

  const [assetsModalOpen, setAssetsModalOpen] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [activeBrokerForAssets, setActiveBrokerForAssets] = useState<any | null>(null)

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
    const broker = brokers.find((b) => b.id === id)
    setBrokerStatus(id, 'disconnected')
    if (broker) {
      addConnectionLog({ brokerId: broker.id, brokerName: broker.name, action: 'disconnected' })
    }
    toast({ title: 'Desconectado com sucesso' })
  }

  const isAuthFormValid =
    authForm.user.trim().length >= 3 &&
    authForm.password.length >= 6 &&
    /^\d{6}$/.test(authForm.token)

  const submitAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrokerId || !isAuthFormValid) return
    const broker = brokers.find((b) => b.id === selectedBrokerId)
    if (!broker) return

    setBrokerStatus(selectedBrokerId, 'connected')
    addConnectionLog({ brokerId: broker.id, brokerName: broker.name, action: 'connected' })
    setAuthModalOpen(false)
    toast({ title: `Conectado com sucesso!` })
  }

  const handleOpenAssets = (broker: any) => {
    setActiveBrokerForAssets(broker)
    const mocks = [
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Selic 2029',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 2,
        purchasePrice: 14000.0,
        rate: 0.1,
        type: 'Selic' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro IPCA+ 2035',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 10,
        purchasePrice: 2000.0,
        rate: 5.5,
        type: 'IPCA+' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Prefixado 2031',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 5,
        purchasePrice: 850.0,
        rate: 11.2,
        type: 'Prefixado' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Renda+ 2030',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 15,
        purchasePrice: 500.0,
        rate: 6.0,
        type: 'Renda+' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro IPCA+ com Juros Semestrais 2045',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 8,
        purchasePrice: 1200.0,
        rate: 5.8,
        type: 'IPCA+' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Educa+ 2035',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 20,
        purchasePrice: 450.0,
        rate: 6.2,
        type: 'Educa+' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Prefixado com Juros Semestrais 2033',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 6,
        purchasePrice: 980.0,
        rate: 10.5,
        type: 'Prefixado' as BondType,
      },
      {
        id: crypto.randomUUID(),
        title: 'Tesouro Selic 2026',
        agent: broker.name,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 3,
        purchasePrice: 14200.0,
        rate: 0.05,
        type: 'Selic' as BondType,
      },
    ]
    setAvailableAssets(mocks)
    setSelectedAssetIds([])
    setAssetsModalOpen(true)
  }

  const handleToggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  const handleImportSelectedAssets = () => {
    const toImport = availableAssets
      .filter((a) => selectedAssetIds.includes(a.id))
      .map((a) => {
        const { id, ...rest } = a
        return rest
      })
    if (toImport.length > 0) {
      importInvestments(toImport)
      toast({ title: `${toImport.length} ativos importados com sucesso!` })
      setAssetsModalOpen(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
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
            {brokers.map((broker) => (
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
                  {broker.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </Badge>
                {broker.status === 'connected' && broker.lastSync && (
                  <p className="text-xs text-muted-foreground mb-4 text-center">
                    Última sinc: {new Date(broker.lastSync).toLocaleDateString('pt-BR')}
                  </p>
                )}

                <div className="flex w-full gap-2 mt-auto">
                  {broker.status === 'connected' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 gap-1 px-2"
                        onClick={() => handleOpenAssets(broker)}
                      >
                        <Download className="h-3 w-3" /> Ativos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-destructive hover:bg-destructive/10 border-destructive/20 px-2"
                        onClick={() => handleDisconnect(broker.id)}
                      >
                        <Unlink className="h-3 w-3" /> Sair
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleConnectClick(broker.id)}
                    >
                      <LinkIcon className="h-3 w-3" /> Conectar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Histórico de Conexões
            </CardTitle>
            <CardDescription>
              Registro de atividades de sincronização com as corretoras.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-card/50">
              {connectionLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground mt-[80px]">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <div className="space-y-4">
                  {connectionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.brokerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <Badge
                        variant={log.action === 'connected' ? 'default' : 'secondary'}
                        className={
                          log.action === 'connected' ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                        }
                      >
                        {log.action === 'connected' ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

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
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors h-[230px] ${
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

        <Card>
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

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={submitAuth}>
            <DialogHeader>
              <DialogTitle>Autenticação da Corretora</DialogTitle>
              <DialogDescription>
                Insira suas credenciais para conectar à{' '}
                {brokers.find((b) => b.id === selectedBrokerId)?.name}.
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
                <Label htmlFor="user">Usuário (CPF/Login)</Label>
                <Input
                  id="user"
                  value={authForm.user}
                  onChange={(e) => setAuthForm({ ...authForm, user: e.target.value })}
                  placeholder="Mín. 3 caracteres"
                  required
                />
                {authForm.user.length > 0 && authForm.user.trim().length < 3 && (
                  <p className="text-xs text-destructive">
                    Usuário deve ter pelo menos 3 caracteres.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="Mín. 6 caracteres"
                  required
                />
                {authForm.password.length > 0 && authForm.password.length < 6 && (
                  <p className="text-xs text-destructive">
                    A senha deve ter pelo menos 6 caracteres.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token">Token / Access Key (MFA)</Label>
                <Input
                  id="token"
                  value={authForm.token}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setAuthForm({ ...authForm, token: val })
                  }}
                  placeholder="Ex: 123456"
                  required
                />
                {authForm.token.length > 0 && authForm.token.length !== 6 && (
                  <p className="text-xs text-destructive">
                    O token deve conter exatamente 6 dígitos numéricos.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAuthModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isAuthFormValid}>
                Autenticar e Conectar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assetsModalOpen} onOpenChange={setAssetsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Importar Ativos - {activeBrokerForAssets?.name}</DialogTitle>
            <DialogDescription>
              Selecione os ativos disponíveis na sua conta para importar para a carteira.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-3">
                {availableAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-start space-x-3 border p-3 rounded-lg hover:bg-secondary/20 transition-colors"
                  >
                    <Checkbox
                      id={`asset-${asset.id}`}
                      checked={selectedAssetIds.includes(asset.id)}
                      onCheckedChange={() => handleToggleAsset(asset.id)}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <label
                        htmlFor={`asset-${asset.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {asset.title}
                      </label>
                      <div className="text-xs text-muted-foreground flex justify-between mt-2">
                        <span>Qtd: {asset.quantity}</span>
                        <span>Preço: {formatCurrency(asset.purchasePrice)}</span>
                        <span>Taxa: {formatPercent(asset.rate / 100)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row justify-between items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground w-full sm:w-auto text-left">
              {selectedAssetIds.length} ativo(s) selecionado(s)
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setAssetsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={handleImportSelectedAssets}
                disabled={selectedAssetIds.length === 0}
              >
                Importar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
