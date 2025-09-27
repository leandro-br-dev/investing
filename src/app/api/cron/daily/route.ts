import { NextRequest, NextResponse } from "next/server"
import { scheduler } from "@/lib/scheduler"

export async function GET(req: NextRequest) {
  try {
    // Verificar se é uma requisição do Vercel Cron
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🌅 Vercel Cron: Executando job diário")

    // Executar atualização diária completa (substitui o hourly job)
    // Faz uma atualização mais abrangente já que só executamos uma vez por dia
    const updateResult = await scheduler.forceUpdate()

    return NextResponse.json({
      success: true,
      message: "Daily cron job completed (includes full market data update)",
      log: updateResult,
      timestamp: new Date().toISOString(),
      note: "Hobby plan limitation: Running comprehensive daily update instead of hourly",
    })
  } catch (error: unknown) {
    console.error("❌ Erro no cron job diário:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
