"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Square,
  RefreshCw,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SchedulerStatus {
  isRunning: boolean
  lastUpdate: string | null
  hourlyJobRunning: boolean
  dailyJobRunning: boolean
  logsCount: number
}

interface SchedulerStats {
  last24h: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  averageDuration: number
  totalRecordsUpdated: number
}

interface SchedulerLog {
  id: string
  timestamp: string
  type: "hourly" | "daily" | "manual"
  trigger: "users_online" | "scheduled" | "force"
  status: "started" | "completed" | "failed"
  duration?: number
  recordsUpdated?: number
  errors?: number
  details: Record<string, unknown>
}

export default function SchedulerAdminPage() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null)
  const [stats, setStats] = useState<SchedulerStats | null>(null)
  const [logs, setLogs] = useState<SchedulerLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch("/api/scheduler")
      const result = await response.json()

      if (result.success) {
        setStatus(result.data.status)
        setStats(result.data.stats)
        setLogs(result.data.recentLogs)
      }
    } catch (error) {
      console.error("Erro ao buscar dados do scheduler:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    setActionLoading(action)
    try {
      const response = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchData() // Refresh data
      } else {
        alert(result.error || "Erro na operação")
      }
    } catch (error) {
      console.error(`Erro na ação ${action}:`, error)
      alert("Erro na operação")
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkHistorical = async () => {
    if (
      !confirm(
        "Isso irá carregar dados históricos dos últimos 20 anos para TODOS os ativos. Esta operação pode demorar muito tempo. Continuar?"
      )
    ) {
      return
    }

    setActionLoading("bulk_historical")
    try {
      const response = await fetch("/api/yahoo-finance/bulk-historical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearsBack: 20,
          replaceExisting: false,
          batchSize: 2, // Lotes menores para evitar timeout
          delayBetweenBatches: 8000, // 8 segundos entre lotes
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(
          `Carregamento histórico concluído!\n\nSucessos: ${result.results.successful.length}\nFalhas: ${result.results.failed.length}\nTotal de registros: ${result.results.totalRecords}`
        )
        await fetchData() // Refresh data
      } else {
        alert(result.error || "Erro no carregamento histórico")
      }
    } catch (error) {
      console.error("Erro no carregamento histórico:", error)
      alert("Erro no carregamento histórico")
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh a cada 30 segundos
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: "started" | "completed" | "failed") => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sucesso
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Falha
          </Badge>
        )
      case "started":
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Executando
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const getTriggerBadge = (trigger: "users_online" | "scheduled" | "force") => {
    switch (trigger) {
      case "users_online":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            👥 Usuários Online
          </Badge>
        )
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            ⏰ Agendado
          </Badge>
        )
      case "force":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            🔧 Manual
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamento Automático</h1>
          <p className="text-muted-foreground">
            Monitoramento e controle das atualizações automáticas de dados
          </p>
        </div>
        <Button
          onClick={() => fetchData()}
          variant="outline"
          disabled={actionLoading !== null}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Status do Scheduler
            </CardTitle>
            {status?.hourlyJobRunning && status?.dailyJobRunning ? (
              <Play className="h-4 w-4 text-green-600" />
            ) : (
              <Square className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.hourlyJobRunning && status?.dailyJobRunning
                ? "Ativo"
                : "Inativo"}
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs: {status?.hourlyJobRunning ? "✅" : "❌"} Horário |{" "}
              {status?.dailyJobRunning ? "✅" : "❌"} Diário
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Última Atualização
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.lastUpdate
                ? formatDistanceToNow(new Date(status.lastUpdate), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.isRunning ? "🔄 Executando agora" : "⏸️ Parado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Sucesso (24h)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.last24h.successRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.last24h.successful || 0}/{stats?.last24h.total || 0}{" "}
              execuções
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
          <CardDescription>
            Gerencie o funcionamento do agendamento automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => handleAction("start")}
              disabled={
                actionLoading !== null ||
                (status?.hourlyJobRunning && status?.dailyJobRunning)
              }
              variant={
                status?.hourlyJobRunning && status?.dailyJobRunning
                  ? "secondary"
                  : "default"
              }
            >
              {actionLoading === "start" && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Play className="h-4 w-4 mr-2" />
              Iniciar Scheduler
            </Button>

            <Button
              onClick={() => handleAction("stop")}
              disabled={
                actionLoading !== null ||
                (!status?.hourlyJobRunning && !status?.dailyJobRunning)
              }
              variant="outline"
            >
              {actionLoading === "stop" && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Square className="h-4 w-4 mr-2" />
              Parar Scheduler
            </Button>

            <Button
              onClick={() => handleAction("force_update")}
              disabled={actionLoading !== null || status?.isRunning}
              variant="secondary"
            >
              {actionLoading === "force_update" && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualização Manual
            </Button>

            <Button
              onClick={() => handleBulkHistorical()}
              disabled={actionLoading !== null || status?.isRunning}
              variant="outline"
            >
              {actionLoading === "bulk_historical" && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Database className="h-4 w-4 mr-2" />
              Carregar 20 Anos
            </Button>
          </div>

          {stats && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Estatísticas (24h)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Execuções:</span>
                  <div className="font-bold">{stats.last24h.total}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Sucessos:</span>
                  <div className="font-bold text-green-600">
                    {stats.last24h.successful}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Falhas:</span>
                  <div className="font-bold text-red-600">
                    {stats.last24h.failed}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duração Média:</span>
                  <div className="font-bold">{stats.averageDuration}s</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>
            Histórico das últimas execuções do scheduler
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              Nenhum log encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      {getTriggerBadge(log.trigger)}
                      <Badge variant="outline">
                        {log.type === "hourly" && (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {log.type === "daily" && (
                          <Calendar className="h-3 w-3 mr-1" />
                        )}
                        {log.type === "manual" && (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {log.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {log.duration && (
                      <div>
                        <span className="text-muted-foreground">Duração:</span>
                        <div className="font-medium">
                          {Math.round(log.duration / 1000)}s
                        </div>
                      </div>
                    )}
                    {log.recordsUpdated !== undefined && (
                      <div>
                        <span className="text-muted-foreground">
                          Atualizados:
                        </span>
                        <div className="font-medium text-green-600">
                          {log.recordsUpdated}
                        </div>
                      </div>
                    )}
                    {log.errors !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Erros:</span>
                        <div className="font-medium text-red-600">
                          {log.errors}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <div className="font-mono text-xs">{log.id}</div>
                    </div>
                  </div>

                  {(log.details as { error?: string })?.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Erro:</strong>{" "}
                      {(log.details as { error?: string })?.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
