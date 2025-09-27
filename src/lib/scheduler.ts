import cron from "node-cron"
import { prisma } from "@/lib/prisma"

interface SchedulerLog {
  id: string
  timestamp: Date
  type: "hourly" | "daily" | "manual"
  trigger: "users_online" | "scheduled" | "force"
  status: "started" | "completed" | "failed"
  details: unknown
  duration?: number
  recordsUpdated?: number
  errors?: number
}

class AutoUpdateScheduler {
  private static instance: AutoUpdateScheduler
  private isRunning: boolean = false
  private lastUpdate: Date | null = null
  private logs: SchedulerLog[] = []
  private maxLogs: number = 100

  // Cron jobs
  private hourlyJob: unknown | null = null
  private dailyJob: unknown | null = null

  private constructor() {
    this.initializeCronJobs()
  }

  public static getInstance(): AutoUpdateScheduler {
    if (!AutoUpdateScheduler.instance) {
      AutoUpdateScheduler.instance = new AutoUpdateScheduler()
    }
    return AutoUpdateScheduler.instance
  }

  private initializeCronJobs() {
    // Job de hora em hora (para quando há usuários online)
    this.hourlyJob = cron.schedule("0 * * * *", async () => {
      const hasOnlineUsers = await this.checkOnlineUsers()
      if (hasOnlineUsers) {
        await this.performUpdate("hourly", "users_online")
      }
    })
    this.hourlyJob.stop() // Não inicia automaticamente

    // Job diário (sempre executa às 6:00 AM)
    this.dailyJob = cron.schedule("0 6 * * *", async () => {
      await this.performUpdate("daily", "scheduled")
    })
    this.dailyJob.stop() // Não inicia automaticamente

    console.log(
      "📅 Scheduler inicializado - Jobs configurados mas não iniciados"
    )
  }

  public startScheduler() {
    if (this.hourlyJob && this.dailyJob) {
      this.hourlyJob.start()
      this.dailyJob.start()
      console.log("🚀 Auto-update scheduler iniciado")
      console.log("⏰ Job de hora em hora: ativado (quando há usuários online)")
      console.log("🌅 Job diário: ativado (6:00 AM todos os dias)")
    }
  }

  public stopScheduler() {
    if (this.hourlyJob && this.dailyJob) {
      this.hourlyJob.stop()
      this.dailyJob.stop()
      console.log("⏹️ Auto-update scheduler parado")
    }
  }

  private async checkOnlineUsers(): Promise<boolean> {
    try {
      const now = new Date()
      const hour = now.getHours()

      // Verificar múltiplas fontes de atividade
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 60 * 1000)

      // 1. Verificar usuários ativos recentemente
      const recentUsers = await prisma.user.count({
        where: {
          updatedAt: {
            gte: thirtyMinutesAgo,
          },
        },
      })

      // 2. Verificar transações recentes (indicam uso ativo)
      const recentTransactions = await prisma.transaction.count({
        where: {
          createdAt: {
            gte: oneHourAgo,
          },
        },
      })

      // 3. Verificar simulações ativas (alguém usando o simulador)
      const activeSimulations = await prisma.simulation.count({
        where: {
          updatedAt: {
            gte: twoHoursAgo,
          },
          isActive: true,
        },
      })

      const hasRecentActivity =
        recentUsers > 0 || recentTransactions > 0 || activeSimulations > 0

      // Durante horário comercial (8h-22h), priorizar dados reais mas com fallback
      if (hour >= 8 && hour <= 22) {
        if (hasRecentActivity) {
          console.log(
            `👥 Usuários online detectados: ${recentUsers} usuários, ${recentTransactions} transações, ${activeSimulations} simulações ativas`
          )
          return true
        } else {
          console.log(
            "🕒 Horário comercial - assumindo potencial atividade mesmo sem dados recentes"
          )
          return true // Fallback para horário comercial
        }
      }

      // Fora do horário comercial, exigir atividade real
      if (hasRecentActivity) {
        console.log(
          `🌙 Atividade fora do horário comercial detectada: ${recentUsers} usuários, ${recentTransactions} transações, ${activeSimulations} simulações`
        )
        return true
      }

      console.log(
        "😴 Nenhuma atividade recente detectada fora do horário comercial"
      )
      return false
    } catch (error) {
      console.error("Erro ao verificar usuários online:", error)
      // Em caso de erro, ser conservador e não atualizar
      return false
    }
  }

  private async performUpdate(
    type: "hourly" | "daily" | "manual",
    trigger: "users_online" | "scheduled" | "force"
  ): Promise<SchedulerLog> {
    const logId = `${type}_${Date.now()}`
    const startTime = new Date()

    const log: SchedulerLog = {
      id: logId,
      timestamp: startTime,
      type,
      trigger,
      status: "started",
      details: {
        scheduledType: type,
        triggerReason: trigger,
      },
    }

    await this.addLog(log)

    if (this.isRunning) {
      log.status = "failed"
      log.details.error = "Update already running"
      this.updateLog(log)
      return log
    }

    this.isRunning = true
    console.log(
      `🔄 Iniciando atualização automática (${type}) - Trigger: ${trigger}`
    )

    try {
      // Determinar estratégia de atualização baseada no tipo
      const updateStrategy = type === "hourly" ? "quotes" : "historical"
      const historicalDays = type === "daily" ? 7 : 1 // Diário pega 7 dias, horário apenas 1

      // Chamar a API de atualização em lote
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/yahoo-finance/update-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: updateStrategy,
          historicalDays,
          replaceExisting: false,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const endTime = new Date()
        const duration = endTime.getTime() - startTime.getTime()

        log.status = "completed"
        log.duration = duration
        log.recordsUpdated = result.results?.successful?.length || 0
        log.errors = result.results?.failed?.length || 0
        log.details = {
          ...log.details,
          updateMode: updateStrategy,
          historicalDays,
          results: result.results?.summary,
        }

        this.lastUpdate = endTime
        console.log(
          `✅ Atualização automática concluída em ${Math.round(duration / 1000)}s`
        )
        console.log(
          `📊 Atualizados: ${log.recordsUpdated}, Erros: ${log.errors}`
        )
      } else {
        throw new Error(result.error || "Update failed")
      }
    } catch (error: unknown) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      log.status = "failed"
      log.duration = duration
      log.details = {
        ...log.details,
        error: error.message,
        stack: error.stack,
      }

      console.error(`❌ Erro na atualização automática:`, error.message)

      // Enviar notificação de erro se configurado
      await this.sendErrorNotification(error, log)
    } finally {
      this.isRunning = false
      await this.updateLog(log)
    }

    return log
  }

  // Método público para forçar atualização
  public async forceUpdate(): Promise<SchedulerLog> {
    return this.performUpdate("manual", "force")
  }

  // Enviar notificação de erro via webhook
  private async sendErrorNotification(error: unknown, log: SchedulerLog) {
    try {
      const webhookUrl = process.env.ERROR_WEBHOOK_URL

      if (!webhookUrl) {
        console.log(
          "⚠️ ERROR_WEBHOOK_URL não configurado - notificação de erro não enviada"
        )
        return
      }

      const payload = {
        text: `🚨 Erro no Agendamento Automático - Investing`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 Falha no Agendamento Automático",
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Tipo:* ${log.type}`,
              },
              {
                type: "mrkdwn",
                text: `*Trigger:* ${log.trigger}`,
              },
              {
                type: "mrkdwn",
                text: `*Timestamp:* ${log.timestamp.toISOString()}`,
              },
              {
                type: "mrkdwn",
                text: `*Duração:* ${log.duration ? Math.round(log.duration / 1000) + "s" : "N/A"}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Erro:* \`${error.message}\``,
            },
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        console.log("✅ Notificação de erro enviada via webhook")
      } else {
        console.error(
          "❌ Falha ao enviar notificação de erro:",
          response.status,
          response.statusText
        )
      }
    } catch (notificationError) {
      console.error("❌ Erro ao enviar notificação de erro:", notificationError)
    }
  }

  private async addLog(log: SchedulerLog) {
    // Adicionar ao array em memória
    this.logs.unshift(log)

    // Manter apenas os últimos N logs em memória
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Persistir no banco de dados
    try {
      await prisma.schedulerLog.create({
        data: {
          timestamp: log.timestamp,
          type: log.type,
          trigger: log.trigger,
          status: log.status,
          duration: log.duration,
          recordsUpdated: log.recordsUpdated,
          errors: log.errors,
          details: JSON.stringify(log.details),
        },
      })
    } catch (error) {
      console.error("Erro ao salvar log no banco:", error)
    }
  }

  private async updateLog(updatedLog: SchedulerLog) {
    // Atualizar no array em memória
    const index = this.logs.findIndex((log) => log.id === updatedLog.id)
    if (index !== -1) {
      this.logs[index] = updatedLog
    }

    // Atualizar no banco de dados
    try {
      await prisma.schedulerLog.updateMany({
        where: {
          timestamp: updatedLog.timestamp,
          type: updatedLog.type,
        },
        data: {
          status: updatedLog.status,
          duration: updatedLog.duration,
          recordsUpdated: updatedLog.recordsUpdated,
          errors: updatedLog.errors,
          details: JSON.stringify(updatedLog.details),
        },
      })
    } catch (error) {
      console.error("Erro ao atualizar log no banco:", error)
    }
  }

  // Métodos públicos para monitoramento
  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastUpdate,
      hourlyJobRunning: this.hourlyJob?.getStatus() === "scheduled",
      dailyJobRunning: this.dailyJob?.getStatus() === "scheduled",
      logsCount: this.logs.length,
    }
  }

  public async getLogs(limit: number = 20) {
    try {
      // Buscar logs do banco de dados (mais completo)
      const dbLogs = await prisma.schedulerLog.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
      })

      // Converter para formato esperado
      return dbLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        type: log.type as "hourly" | "daily" | "manual",
        trigger: log.trigger as "users_online" | "scheduled" | "force",
        status: log.status as "started" | "completed" | "failed",
        duration: log.duration || undefined,
        recordsUpdated: log.recordsUpdated || undefined,
        errors: log.errors || undefined,
        details: log.details ? JSON.parse(log.details) : {},
      }))
    } catch (error) {
      console.error("Erro ao buscar logs do banco:", error)
      // Fallback para logs em memória
      return this.logs.slice(0, limit)
    }
  }

  public async getStats() {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Buscar estatísticas do banco de dados
      const totalLogs = await prisma.schedulerLog.count({
        where: { timestamp: { gte: last24h } },
      })

      const successfulLogs = await prisma.schedulerLog.count({
        where: {
          timestamp: { gte: last24h },
          status: "completed",
        },
      })

      const failedLogs = await prisma.schedulerLog.count({
        where: {
          timestamp: { gte: last24h },
          status: "failed",
        },
      })

      // Calcular duração média e registros atualizados
      const completedLogsData = await prisma.schedulerLog.findMany({
        where: {
          timestamp: { gte: last24h },
          status: "completed",
        },
        select: {
          duration: true,
          recordsUpdated: true,
        },
      })

      const averageDuration =
        completedLogsData.length > 0
          ? Math.round(
              completedLogsData.reduce(
                (sum, log) => sum + (log.duration || 0),
                0
              ) /
                completedLogsData.length /
                1000
            )
          : 0

      const totalRecordsUpdated = completedLogsData.reduce(
        (sum, log) => sum + (log.recordsUpdated || 0),
        0
      )

      return {
        last24h: {
          total: totalLogs,
          successful: successfulLogs,
          failed: failedLogs,
          successRate:
            totalLogs > 0 ? Math.round((successfulLogs / totalLogs) * 100) : 0,
        },
        averageDuration,
        totalRecordsUpdated,
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas do banco:", error)
      // Fallback para logs em memória
      const last24h = this.logs.filter(
        (log) => log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
      )

      const successful = last24h.filter((log) => log.status === "completed")
      const failed = last24h.filter((log) => log.status === "failed")

      return {
        last24h: {
          total: last24h.length,
          successful: successful.length,
          failed: failed.length,
          successRate:
            last24h.length > 0
              ? Math.round((successful.length / last24h.length) * 100)
              : 0,
        },
        averageDuration:
          successful.length > 0
            ? Math.round(
                successful.reduce((sum, log) => sum + (log.duration || 0), 0) /
                  successful.length /
                  1000
              )
            : 0,
        totalRecordsUpdated: successful.reduce(
          (sum, log) => sum + (log.recordsUpdated || 0),
          0
        ),
      }
    }
  }
}

// Singleton instance
export const scheduler = AutoUpdateScheduler.getInstance()

// Função para inicializar o scheduler (chamada apenas no servidor quando necessário)
export function initializeScheduler() {
  // Verificar se estamos no servidor
  if (typeof window === "undefined") {
    if (process.env.NODE_ENV === "production") {
      scheduler.startScheduler()
      console.log("🔄 Scheduler de atualização automática iniciado em produção")
    } else {
      console.log("🔧 Scheduler disponível mas não iniciado em desenvolvimento")
    }
  }
}
