import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Settings2,
  RefreshCw,
  CheckCircle2,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import usePortfolioStore, { BondType } from '@/stores/usePortfolioStore'
import { parseExcelDate, formatDate } from '@/lib/formatters'

export default function Import() {
  const { importInvestments, settings, updateSettings, brokers, toggleBroker } = usePortfolioStore()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [ipcaInput, setIpcaInput] = useState(settings.ipcaAverage24m.toString())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const processCSV = (text: string) => {
    try {
      const lines = text.split('\n').filter((l) => l.trim() !== '')
      if (lines.length <= 1) throw new Error('Arquivo vazio ou sem dados.')

      const newInvs = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        if (cols.length >= 6) {
          const typeMatch = cols[0].toUpperCase().match(/(IPCA\+|SELIC|PREFIXADO|RENDA\+|EDUCA\+)/)
          let inferredType: BondType = 'IPCA+'
          if (typeMatch) {
            inferredType =
              typeMatch[1] === 'PREFIXADO'
                ? 'Prefixado'
                : typeMatch[1] === 'SELIC'
                  ? 'Selic'
                  : typeMatch[1] === 'RENDA+'
                    ? 'Renda+'
                    : typeMatch[1] === 'EDUCA+'
                      ? 'Educa+'
                      : 'IPCA+'
          }

          newInvs.push({
            title: cols[0].trim(),
            agent: cols[1].trim(),
            purchaseDate: parseExcelDate(cols[2].trim()),
            quantity: parseFloat(cols[3]),
            purchasePrice: parseFloat(cols[4]),
            rate: parseFloat(cols[5]),
            type: inferredType,
          })
        }
      }

      if (newInvs.length > 0) {
        importInvestments(newInvs)
        toast({ title: `${newInvs.length} títulos importados com sucesso!`, variant: 'default' })
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
      reader.onload = (event) => processCSV(event.target?.result as string)
      reader.readAsText(file)
    } else {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie um arquivo .csv',
        variant: 'destructive',
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => processCSV(event.target?.result as string)
      reader.readAsText(file)
    }
  }

  const handleSyncVNA = () => {
    setIsSyncing(true)
    setTimeout(() => {
      updateSettings({ lastSync: new Date().toISOString() })
      setIsSyncing(false)
      toast({
        title: 'VNA sincronizado com sucesso!',
        description: 'Os preços foram atualizados com base no fechamento do dia.',
      })
    }, 1500)
  }

  const saveSettings = () => {
    const val = parseFloat(ipcaInput)
    if (!isNaN(val) && val >= 0) {
      updateSettings({ ipcaAverage24m: val })
      toast({ title: 'Configurações salvas' })
    } else {
      toast({ title: 'Valor inválido para IPCA', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importação e Ajustes</h2>
        <p className="text-muted-foreground">
          Configure os parâmetros do sistema e importe dados em lote.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Integração Open Finance (Opcional)
          </CardTitle>
          <CardDescription>
            Conecte suas corretoras para sincronizar automaticamente seus títulos. As importações
            manuais via CSV continuam funcionando normalmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {brokers.map((broker) => (
              <div
                key={broker.id}
                className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
                  broker.status === 'connected'
                    ? 'border-primary bg-primary/5'
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
                  className="mb-4 text-[10px]"
                >
                  {broker.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </Badge>
                {broker.status === 'connected' && broker.lastSync && (
                  <p className="text-xs text-muted-foreground mb-4 text-center">
                    Última sinc: {formatDate(broker.lastSync)}
                  </p>
                )}
                <Button
                  variant={broker.status === 'connected' ? 'outline' : 'default'}
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    toggleBroker(broker.id)
                    toast({
                      title:
                        broker.status === 'connected'
                          ? `Desconectado de ${broker.name}`
                          : `Conectado a ${broker.name}`,
                    })
                  }}
                >
                  {broker.status === 'connected' ? (
                    <>
                      <Unlink className="h-3 w-3" /> Desconectar
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-3 w-3" /> Conectar
                    </>
                  )}
                </Button>
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
            <CardDescription>Envie um arquivo CSV contendo sua carteira histórica.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors h-full min-h-[200px] ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud
                className={`h-10 w-10 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste seu arquivo CSV ou clique para selecionar
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
                <Button size="sm" onClick={handleSyncVNA} disabled={isSyncing}>
                  <RefreshCw className={`h-3 w-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
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
                  <Button variant="secondary" size="sm" onClick={saveSettings}>
                    Salvar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
