import { NextRequest, NextResponse } from "next/server"
import { scheduler } from "@/lib/scheduler"

export async function GET(req: NextRequest) {
  try {
    // Verificar se é uma requisição do Vercel Cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Vercel Cron: Executando job horário')

    // Executar atualização forçada (o scheduler vai verificar usuários internamente)
    const updateResult = await scheduler.forceUpdate()

    return NextResponse.json({
      success: true,
      message: 'Hourly cron job completed',
      log: updateResult,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro no cron job horário:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}