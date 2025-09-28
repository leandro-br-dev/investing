import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { FundamentalAnalysisEngine } from "@/lib/fundamental-analysis"
import { getPrismaClient } from "@/lib/init-db"

// GET - Obter análises fundamentalistas
export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker")
    const limit = parseInt(searchParams.get("limit") || "20")
    const orderBy = searchParams.get("orderBy") || "overallScore" // 'overallScore', 'analysisDate', 'valueScore'
    const direction = (searchParams.get("direction") || "desc") as
      | "asc"
      | "desc"
    const minScore = parseInt(searchParams.get("minScore") || "0")
    const recommendation = searchParams.get("recommendation") // 'BUY', 'HOLD', 'SELL'

    if (ticker) {
      // Buscar análise específica de um ativo
      const analysis = await FundamentalAnalysisEngine.getLatestAnalysis(ticker)

      if (!analysis) {
        return NextResponse.json(
          {
            error: "Analysis not found",
            message: `No fundamental analysis found for ${ticker}. Try running an analysis first.`,
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analysis,
      })
    }

    // Buscar análises com filtros
    const whereClause: unknown = {
      overallScore: { gte: minScore },
    }

    if (recommendation) {
      whereClause.recommendation = recommendation
    }

    // TODO: Fix Prisma client type issue for fundamentalAnalysis
    // const analyses = await prisma.fundamentalAnalysis.findMany({
    //   where: whereClause,
    //   include: {
    //     asset: {
    //       select: {
    //         name: true,
    //         currency: true,
    //         market: true,
    //         sector: true,
    //         industry: true
    //       }
    //     }
    //   },
    //   orderBy: orderBy === 'overallScore' ? { overallScore: direction } :
    //             orderBy === 'analysisDate' ? { analysisDate: direction } :
    //             orderBy === 'valueScore' ? { valueScore: direction } :
    //             { overallScore: direction },
    //   take: limit
    // })
    const analyses: unknown[] = [] // Temporarily disabled

    // Agrupar por ticker (pegar apenas a mais recente de cada)
    const latestAnalyses = new Map<string, any>()

    for (const analysis of analyses) {
      const existing = latestAnalyses.get(analysis.ticker)
      if (
        !existing ||
        new Date(analysis.analysisDate) > new Date(existing.analysisDate)
      ) {
        latestAnalyses.set(analysis.ticker, analysis)
      }
    }

    const result = Array.from(latestAnalyses.values())

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        total: result.length,
        buyRecommendations: result.filter(
          (a: unknown) => a.recommendation === "BUY"
        ).length,
        holdRecommendations: result.filter(
          (a: unknown) => a.recommendation === "HOLD"
        ).length,
        sellRecommendations: result.filter(
          (a: unknown) => a.recommendation === "SELL"
        ).length,
        averageScore:
          result.length > 0
            ? Math.round(
                result.reduce(
                  (sum: number, a: unknown) => sum + (a.overallScore || 0),
                  0
                ) / result.length
              )
            : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching fundamental analysis:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Executar análise fundamentalista
export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      ticker,
      tickers, // Array de tickers para análise em lote
      force = false, // Forçar nova análise mesmo se já existe uma recente
    } = body

    if (ticker) {
      // Análise de um único ativo
      console.log(`📊 Iniciando análise fundamentalista para ${ticker}`)

      // Verificar se já existe análise recente (última 24h)
      if (!force) {
        // TODO: Fix Prisma client issue
        // const existingAnalysis = await prisma.fundamentalAnalysis.findFirst({
        //   where: {
        //     ticker,
        //     analysisDate: {
        //       gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
        //     }
        //   },
        //   orderBy: { analysisDate: 'desc' }
        // })
        const existingAnalysis = null // Temporarily disabled

        if (existingAnalysis) {
          return NextResponse.json({
            success: true,
            message: "Recent analysis found",
            data: existingAnalysis,
            cached: true,
          })
        }
      }

      const result = await FundamentalAnalysisEngine.analyzeAsset(ticker)

      if (!result) {
        return NextResponse.json(
          {
            error: "Analysis failed",
            message: `Could not analyze ${ticker}. Check if asset exists and has sufficient data.`,
          },
          { status: 400 }
        )
      }

      console.log(
        `✅ Análise de ${ticker} concluída: Score ${result.overallScore}/100`
      )

      return NextResponse.json({
        success: true,
        message: `Analysis completed for ${ticker}`,
        data: result,
      })
    } else if (tickers && Array.isArray(tickers)) {
      // Análise em lote
      console.log(
        `📊 Iniciando análise fundamentalista em lote para ${tickers.length} ativos`
      )

      // Executar análises em paralelo (máximo 5 por vez para não sobrecarregar)
      const batchSize = 5
      const results: unknown[] = []
      const errors: unknown[] = []

      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize)
        console.log(
          `🔄 Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(tickers.length / batchSize)}`
        )

        const batchPromises = batch.map(async (tickerSymbol: string) => {
          try {
            // Verificar análise recente se não forçado
            if (!force) {
              const existingAnalysis =
                await prisma.fundamentalAnalysis.findFirst({
                  where: {
                    ticker: tickerSymbol,
                    analysisDate: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                  },
                  orderBy: { analysisDate: "desc" },
                })

              if (existingAnalysis) {
                results.push({
                  ticker: tickerSymbol,
                  cached: true,
                  data: existingAnalysis,
                })
                return
              }
            }

            const result =
              await FundamentalAnalysisEngine.analyzeAsset(tickerSymbol)

            if (result) {
              results.push({
                ticker: tickerSymbol,
                success: true,
                data: result,
              })
            } else {
              errors.push({ ticker: tickerSymbol, error: "Analysis failed" })
            }
          } catch (error: unknown) {
            errors.push({ ticker: tickerSymbol, error: error.message })
          }
        })

        await Promise.all(batchPromises)

        // Pequeno delay entre lotes
        if (i + batchSize < tickers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      console.log(
        `🎉 Análise em lote concluída: ${results.length} sucessos, ${errors.length} erros`
      )

      return NextResponse.json({
        success: true,
        message: `Bulk analysis completed`,
        results: {
          successful: results,
          failed: errors,
          summary: {
            total: tickers.length,
            successful: results.length,
            failed: errors.length,
            successRate: `${Math.round((results.length / tickers.length) * 100)}%`,
          },
        },
      })
    } else {
      return NextResponse.json(
        {
          error: "Invalid request",
          message:
            "Provide either 'ticker' for single analysis or 'tickers' array for bulk analysis",
        },
        { status: 400 }
      )
    }
  } catch (error: unknown) {
    console.error("Error in fundamental analysis:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE - Limpar análises antigas
export async function DELETE(req: NextRequest) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker")
    const olderThanDays = parseInt(searchParams.get("olderThanDays") || "30")

    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000
    )

    if (ticker) {
      // Limpar análises antigas de um ativo específico
      const deleted = await prisma.fundamentalAnalysis.deleteMany({
        where: {
          ticker,
          analysisDate: { lt: cutoffDate },
        },
      })

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.count} old analyses for ${ticker}`,
        deleted: deleted.count,
      })
    } else {
      // Limpar todas as análises antigas
      const deleted = await prisma.fundamentalAnalysis.deleteMany({
        where: {
          analysisDate: { lt: cutoffDate },
        },
      })

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.count} old analyses (older than ${olderThanDays} days)`,
        deleted: deleted.count,
      })
    }
  } catch (error: unknown) {
    console.error("Error deleting old analyses:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
