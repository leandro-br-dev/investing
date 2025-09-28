import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      currency, // 'BRL', 'USD', ou null para todos
      mode = "quotes", // 'quotes' para cotações atuais, 'historical' para dados históricos
      historicalDays = 30,
      replaceExisting = false,
    } = body

    // Buscar ativos da base de dados
    const whereClause = currency ? { currency } : {}
    const assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        ticker: true,
        name: true,
        currency: true,
        market: true,
      },
    })

    if (assets.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No assets found",
        filter: { currency },
      })
    }

    console.log(
      `Iniciando atualização de ${assets.length} ativos (modo: ${mode})`
    )

    const results: {
      successful: unknown[]
      failed: unknown[]
      total: number
      startTime: string
    } = {
      successful: [],
      failed: [],
      total: assets.length,
      startTime: new Date().toISOString(),
    }

    // Processar em lotes pequenos para evitar rate limiting
    const batchSize = 5
    const delayBetweenBatches = 2000 // 2 segundos

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize)

      console.log(
        `Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`
      )

      const batchPromises = batch.map(async (asset) => {
        try {
          const endpoint =
            mode === "historical"
              ? "/api/yahoo-finance/historical"
              : "/api/yahoo-finance/quote"

          const url =
            mode === "historical"
              ? `${req.nextUrl.origin}${endpoint}`
              : `${req.nextUrl.origin}${endpoint}?ticker=${asset.ticker}`

          const requestOptions: RequestInit = {
            method: mode === "historical" ? "POST" : "GET",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") || "",
            },
          }

          if (mode === "historical") {
            const period2 = new Date()
            const period1 = new Date(
              Date.now() - historicalDays * 24 * 60 * 60 * 1000
            )

            requestOptions.body = JSON.stringify({
              ticker: asset.ticker,
              period1: period1.toISOString(),
              period2: period2.toISOString(),
              replaceExisting,
            })
          }

          const response = await fetch(url, requestOptions)
          const data = await response.json()

          if (response.ok) {
            results.successful.push({
              ticker: asset.ticker,
              name: asset.name,
              currency: asset.currency,
              data: data.data,
              message: data.message,
            })
          } else {
            results.failed.push({
              ticker: asset.ticker,
              name: asset.name,
              error: data.error || "Unknown error",
              details: data.details,
            })
          }
        } catch (error: unknown) {
          results.failed.push({
            ticker: asset.ticker,
            name: asset.name,
            error: "Request failed",
            details: error.message,
          })
        }
      })

      await Promise.all(batchPromises)

      // Delay entre lotes (exceto no último)
      if (i + batchSize < assets.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
      }
    }

    const endTime = new Date().toISOString()
    const duration =
      new Date(endTime).getTime() - new Date(results.startTime).getTime()

    console.log(
      `Atualização concluída: ${results.successful.length} sucessos, ${results.failed.length} falhas`
    )

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        endTime,
        duration: `${Math.round(duration / 1000)}s`,
        summary: {
          mode,
          filter: { currency },
          successRate: `${Math.round((results.successful.length / results.total) * 100)}%`,
        },
      },
      message: `Bulk update completed: ${results.successful.length}/${results.total} assets updated successfully`,
    })
  } catch (error) {
    console.error("Error in bulk update API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET para status da última atualização
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      assets,
    }

    return NextResponse.json({
      success: true,
      stats,
      lastCheck: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error getting update status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
