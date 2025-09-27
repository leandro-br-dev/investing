"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  RefreshCw,
  BarChart3,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface UpdateStats {
  totalAssets: number
  updatedToday: number
  updatedYesterday: number
  outdated: number
  assets: Array<{
    ticker: string
    lastUpdate: string
    daysAgo: number
    status: "current" | "recent" | "outdated"
  }>
  lastCheck: string
}

interface UpdateResult {
  successful: Array<{
    ticker: string
    name: string
    currency: string
    message: string
  }>
  failed: Array<{
    ticker: string
    name: string
    error: string
    details?: string
  }>
  total: number
  startTime: string
  endTime: string
  duration: string
  summary: {
    mode: string
    successRate: string
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<UpdateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<UpdateResult | null>(null)

  // Filtros
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all")
  const [updateMode, setUpdateMode] = useState<string>("quotes")
  const [historicalDays, setHistoricalDays] = useState<number>(30)

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/yahoo-finance/update-all")
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setLastUpdate(null)

    try {
      let endpoint = "/api/yahoo-finance/update-all"
      let requestBody: Record<string, unknown> = {}

      if (updateMode === "bulk-optimized") {
        // Usar o novo endpoint otimizado
        endpoint = "/api/yahoo-finance/bulk-historical"
        requestBody = {
          currency: selectedCurrency === "all" ? null : selectedCurrency,
          historicalDays: historicalDays,
          replaceExisting: true, // Para captura de 20 anos, sempre substituir
        }
      } else {
        // Usar o endpoint tradicional
        requestBody = {
          currency: selectedCurrency === "all" ? null : selectedCurrency,
          mode: updateMode,
          historicalDays:
            updateMode === "historical" ? historicalDays : undefined,
          replaceExisting: updateMode === "historical",
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        setLastUpdate(data.results)
        // Atualizar estatísticas após a atualização
        setTimeout(fetchStats, 1000)
      } else {
        console.error("Erro na atualização:", data.error)
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error)
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchStats()
    }
  }, [session])

  if (status === "loading" || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            Carregando painel administrativo...
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">Acesso Restrito</h3>
          <p className="text-muted-foreground">
            Faça login para acessar o painel administrativo.
          </p>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "current":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "recent":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "outdated":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "current":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          >
            Atual
          </Badge>
        )
      case "recent":
        return <Badge variant="secondary">Recente</Badge>
      case "outdated":
        return <Badge variant="destructive">Desatualizado</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin - Yahoo Finance
          </h1>
          <p className="text-muted-foreground">
            Gerenciar atualização de dados do Yahoo Finance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => (window.location.href = "/admin/scheduler")}
            variant="secondary"
            size="sm"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Agendamento
          </Button>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Status
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Ativos
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atualizados Hoje
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.updatedToday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Atualizados Ontem
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.updatedYesterday}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Desatualizados
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.outdated}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Atualizar Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Moeda</label>
              <Select
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="BRL">BRL (Brasil)</SelectItem>
                  <SelectItem value="USD">USD (EUA)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Modo</label>
              <Select value={updateMode} onValueChange={setUpdateMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotes">Cotações Atuais</SelectItem>
                  <SelectItem value="historical">Dados Históricos</SelectItem>
                  <SelectItem value="bulk-optimized">
                    📈 Histórico Otimizado (Recomendado para 20 anos)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(updateMode === "historical" ||
              updateMode === "bulk-optimized") && (
              <div>
                <label className="text-sm font-medium">
                  {updateMode === "bulk-optimized"
                    ? "Período Histórico"
                    : "Dias Históricos"}
                </label>
                <Select
                  value={historicalDays.toString()}
                  onValueChange={(value) => setHistoricalDays(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                    <SelectItem value="730">2 anos</SelectItem>
                    <SelectItem value="1825">5 anos</SelectItem>
                    <SelectItem value="3650">10 anos</SelectItem>
                    <SelectItem value="7300">20 anos ⚡ (Otimizado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full"
              >
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="mr-2 h-4 w-4" />
                )}
                {updating ? "Atualizando..." : "Atualizar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Update Results */}
      {lastUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Última Atualização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-semibold">{lastUpdate.total}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Sucessos</div>
                <div className="text-lg font-semibold text-green-600">
                  {lastUpdate.successful.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Falhas</div>
                <div className="text-lg font-semibold text-red-600">
                  {lastUpdate.failed.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Taxa de Sucesso
                </div>
                <div className="text-lg font-semibold">
                  {lastUpdate.summary.successRate}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Duração</div>
                <div className="font-medium">{lastUpdate.duration}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Modo</div>
                <div className="font-medium">
                  {lastUpdate.summary.mode === "quotes"
                    ? "Cotações"
                    : "Histórico"}
                </div>
              </div>
            </div>

            {lastUpdate.failed.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">
                  Falhas ({lastUpdate.failed.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lastUpdate.failed.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded"
                    >
                      <div className="font-medium">
                        {item.ticker} - {item.name}
                      </div>
                      <div className="text-red-600 dark:text-red-400">
                        {item.error}
                      </div>
                      {item.details && (
                        <div className="text-xs text-muted-foreground">
                          {item.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assets Status Table */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Status dos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Ticker</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">
                      Última Atualização
                    </th>
                    <th className="text-right p-3 font-medium">Dias Atrás</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.assets.map((asset) => (
                    <tr
                      key={asset.ticker}
                      className="border-b hover:bg-accent/50"
                    >
                      <td className="p-3 font-medium">{asset.ticker}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(asset.status)}
                          {getStatusBadge(asset.status)}
                        </div>
                      </td>
                      <td className="p-3">{formatDate(asset.lastUpdate)}</td>
                      <td className="text-right p-3">{asset.daysAgo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
