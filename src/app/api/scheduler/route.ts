import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { scheduler, initializeScheduler } from "@/lib/scheduler"

// GET - Status e estatísticas do scheduler
export async function GET(req: NextRequest) {
  try {
    // Inicializar scheduler quando API for acessada
    initializeScheduler()

    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '20')

    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          data: scheduler.getStatus()
        })

      case 'logs':
        const logs = await scheduler.getLogs(limit)
        return NextResponse.json({
          success: true,
          data: logs
        })

      case 'stats':
        const stats = await scheduler.getStats()
        return NextResponse.json({
          success: true,
          data: stats
        })

      default:
        // Status completo por padrão
        const [allStats, recentLogs] = await Promise.all([
          scheduler.getStats(),
          scheduler.getLogs(10)
        ])
        return NextResponse.json({
          success: true,
          data: {
            status: scheduler.getStatus(),
            stats: allStats,
            recentLogs: recentLogs
          }
        })
    }

  } catch (error) {
    console.error('Error in scheduler API:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Controlar o scheduler
export async function POST(req: NextRequest) {
  try {
    // Inicializar scheduler quando API for acessada
    initializeScheduler()

    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'start':
        scheduler.startScheduler()
        return NextResponse.json({
          success: true,
          message: "Scheduler started successfully",
          status: scheduler.getStatus()
        })

      case 'stop':
        scheduler.stopScheduler()
        return NextResponse.json({
          success: true,
          message: "Scheduler stopped successfully",
          status: scheduler.getStatus()
        })

      case 'force_update':
        console.log('🔄 Forçando atualização manual via API')
        const updateResult = await scheduler.forceUpdate()
        return NextResponse.json({
          success: true,
          message: "Manual update triggered",
          updateLog: updateResult,
          status: scheduler.getStatus()
        })

      default:
        return NextResponse.json({
          error: "Invalid action. Available actions: start, stop, force_update"
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error controlling scheduler:', error)
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 })
  }
}