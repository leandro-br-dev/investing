import { NextRequest, NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/init-db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const prisma = await getPrismaClient()
    console.log("🔍 Testando status de TODOS os ativos...")

    // Buscar TODOS os ativos cadastrados
    const allAssets = await prisma.asset.findMany({
      select: {
        ticker: true,
        name: true,
        currency: true,
        market: true,
      },
      orderBy: [{ currency: "asc" }, { ticker: "asc" }],
    })

    // Buscar dados históricos mais recentes para cada ativo
    const recentData = await prisma.historicalPrice.findMany({
      select: {
        ticker: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    })

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

    // Processar TODOS os ativos (incluindo os sem dados históricos)
    let updatedToday = 0
    let updatedYesterday = 0
    let outdated = 0
    let noHistory = 0

    const assets = allAssets
      .map((asset) => {
        const ticker = asset.ticker
        const historyData = latestByTicker[ticker]

        if (!historyData) {
          noHistory++
          return {
            ticker,
            name: asset.name,
            currency: asset.currency,
            market: asset.market,
            lastUpdate: null,
            daysAgo: null,
            status: "no-history",
          }
        }

        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(historyData.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        if (historyData.date === today) updatedToday++
        else if (historyData.date === yesterday) updatedYesterday++
        else outdated++

        return {
          ticker,
          name: asset.name,
          currency: asset.currency,
          market: asset.market,
          lastUpdate: historyData.date,
          daysAgo: daysDiff,
          status:
            daysDiff === 0 ? "current" : daysDiff === 1 ? "recent" : "outdated",
        }
      })
      .sort((a, b) => {
        // Ordenar: sem histórico primeiro, depois por daysAgo
        if (a.status === "no-history" && b.status !== "no-history") return -1
        if (a.status !== "no-history" && b.status === "no-history") return 1
        if (a.daysAgo === null) return 0
        if (b.daysAgo === null) return 0
        return b.daysAgo - a.daysAgo
      })

    const stats = {
      totalAssets: allAssets.length,
      updatedToday,
      updatedYesterday,
      outdated,
      noHistory,
      assetsWithHistory: allAssets.length - noHistory,
      breakdown: {
        brl: {
          total: allAssets.filter((a) => a.currency === "BRL").length,
          withHistory: assets.filter(
            (a) => a.currency === "BRL" && a.status !== "no-history"
          ).length,
        },
        usd: {
          total: allAssets.filter((a) => a.currency === "USD").length,
          withHistory: assets.filter(
            (a) => a.currency === "USD" && a.status !== "no-history"
          ).length,
        },
      },
      assets: assets.slice(0, 10), // Mostrar apenas os primeiros 10 para não sobrecarregar
    }

    console.log("✅ Status calculado para todos os ativos:", {
      total: stats.totalAssets,
      withHistory: stats.assetsWithHistory,
      noHistory: stats.noHistory,
      current: stats.updatedToday,
      recent: stats.updatedYesterday,
      outdated: stats.outdated,
    })

    return NextResponse.json({
      success: true,
      test: "All Assets Status - Teste Completo",
      timestamp: new Date().toISOString(),
      stats,
      summary: {
        totalRegistered: allAssets.length,
        withHistoricalData: allAssets.length - noHistory,
        needHistoricalData: noHistory,
        percentageWithData: Math.round(
          ((allAssets.length - noHistory) / allAssets.length) * 100
        ),
      },
      lastCheck: new Date().toISOString(),
      message: `✅ Status de ${allAssets.length} ativos processado (${noHistory} sem dados históricos)`,
    })
  } catch (error: unknown) {
    console.error("❌ Erro ao buscar status de todos os ativos:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error getting all assets status",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
