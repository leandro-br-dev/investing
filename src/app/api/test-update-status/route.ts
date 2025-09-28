import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
        console.log("🔍 Testando busca de dados históricos...")

    // Buscar informações sobre dados mais recentes
    const recentData = await prisma.historicalPrice.findMany({
      select: {
        ticker: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 100,
    })

    console.log(`📊 Encontrados ${recentData.length} registros históricos`)

    // Agrupar por ticker para ver última atualização de cada ativo
    const latestByTicker = recentData.reduce((acc: unknown, item) => {
      if (!acc[item.ticker] || acc[item.ticker].date < item.date) {
        acc[item.ticker] = item
      }
      return acc
    }, {})

    const today = new Date().toISOString().split("T")[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    // Primeiro, processar os dados dos ativos
    let updatedToday = 0
    let updatedYesterday = 0
    let outdated = 0

    const assets = Object.entries(latestByTicker)
      .map(([ticker, data]: [string, any]) => {
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(data.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (data.date === today) updatedToday++
        else if (data.date === yesterday) updatedYesterday++
        else outdated++

        return {
          ticker,
          lastUpdate: data.date,
          daysAgo: daysDiff,
          status:
            daysDiff === 0 ? "current" : daysDiff === 1 ? "recent" : "outdated",
        }
      })
      .sort((a, b) => b.daysAgo - a.daysAgo)

    const stats = {
      totalAssets: Object.keys(latestByTicker).length,
      updatedToday,
      updatedYesterday,
      outdated,
      assets,
    }

    console.log("✅ Estatísticas calculadas com sucesso:", {
      total: stats.totalAssets,
      today: stats.updatedToday,
      yesterday: stats.updatedYesterday,
      outdated: stats.outdated,
    })

    return NextResponse.json({
      success: true,
      test: "Update Status API - Teste",
      timestamp: new Date().toISOString(),
      stats,
      lastCheck: new Date().toISOString(),
      message: "✅ Status calculado com sucesso",
    })
  } catch (error: unknown) {
    console.error("❌ Erro ao buscar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error getting update status",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
