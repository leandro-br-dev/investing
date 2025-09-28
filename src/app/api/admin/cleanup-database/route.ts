import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
        const session = await getServerSession(authOptions)

    if (!session || !(session as { user?: { id: string } }).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, confirm } = body

    if (confirm !== "YES_DELETE_ALL_DATA") {
      return NextResponse.json(
        {
          error: "Missing confirmation",
          message: "You must provide confirm: 'YES_DELETE_ALL_DATA' to proceed",
        },
        { status: 400 }
      )
    }

    console.log(`🗑️ Iniciando limpeza do banco de dados: ${action}`)

    let result = {}

    switch (action) {
      case "clean_historical_prices":
        const deletedPrices = await prisma.historicalPrice.deleteMany({})
        result = {
          action: "clean_historical_prices",
          deletedRecords: deletedPrices.count,
          message: `Deleted ${deletedPrices.count} historical price records`,
        }
        console.log(
          `🗑️ Removidos ${deletedPrices.count} registros de preços históricos`
        )
        break

      case "clean_fundamental_analysis":
        const deletedAnalysis = await prisma.fundamentalAnalysis.deleteMany({})
        result = {
          action: "clean_fundamental_analysis",
          deletedRecords: deletedAnalysis.count,
          message: `Deleted ${deletedAnalysis.count} fundamental analysis records`,
        }
        console.log(
          `🗑️ Removidos ${deletedAnalysis.count} registros de análise fundamentalista`
        )
        break

      case "clean_portfolios":
        // Limpar portfolios e itens relacionados
        const deletedItems = await prisma.portfolioItem.deleteMany({})
        const deletedPortfolios = await prisma.portfolio.deleteMany({})
        const deletedTransactions = await prisma.transaction.deleteMany({})

        result = {
          action: "clean_portfolios",
          deletedRecords: {
            portfolioItems: deletedItems.count,
            portfolios: deletedPortfolios.count,
            transactions: deletedTransactions.count,
          },
          message: `Deleted ${deletedPortfolios.count} portfolios, ${deletedItems.count} items, ${deletedTransactions.count} transactions`,
        }
        console.log(
          `🗑️ Removidos ${deletedPortfolios.count} portfolios, ${deletedItems.count} itens, ${deletedTransactions.count} transações`
        )
        break

      case "reset_assets_fundamentals":
        // Resetar apenas os dados fundamentalistas dos assets, mantendo ticker, name, etc.
        const updatedAssets = await prisma.asset.updateMany({
          data: {
            sector: null,
            industry: null,
            marketCap: null,
            sharesOutstanding: null,
            pe: null,
            pb: null,
            roe: null,
            roa: null,
            dividendYield: null,
            debtToEquity: null,
            currentRatio: null,
            quickRatio: null,
            priceToSales: null,
            evEbitda: null,
            revenue: null,
            netIncome: null,
            totalAssets: null,
            totalEquity: null,
            totalDebt: null,
            lastFundamentalUpdate: null,
          },
        })

        result = {
          action: "reset_assets_fundamentals",
          updatedRecords: updatedAssets.count,
          message: `Reset fundamental data for ${updatedAssets.count} assets`,
        }
        console.log(
          `🗑️ Resetados dados fundamentalistas de ${updatedAssets.count} ativos`
        )
        break

      case "clean_all_except_users_assets":
        // Limpar tudo exceto usuários e ativos básicos
        const results = await prisma.$transaction([
          prisma.fundamentalAnalysis.deleteMany({}),
          prisma.historicalPrice.deleteMany({}),
          prisma.transaction.deleteMany({}),
          prisma.portfolioItem.deleteMany({}),
          prisma.portfolio.deleteMany({}),
          prisma.simulationItem.deleteMany({}),
          prisma.simulation.deleteMany({}),
        ])

        result = {
          action: "clean_all_except_users_assets",
          deletedRecords: {
            fundamentalAnalysis: results[0].count,
            historicalPrices: results[1].count,
            transactions: results[2].count,
            portfolioItems: results[3].count,
            portfolios: results[4].count,
            simulationItems: results[5].count,
            simulations: results[6].count,
          },
          message: `Cleaned all data except users and basic asset information`,
        }
        console.log(
          `🗑️ Limpeza completa realizada, mantendo apenas usuários e ativos básicos`
        )
        break

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
            validActions: [
              "clean_historical_prices",
              "clean_fundamental_analysis",
              "clean_portfolios",
              "reset_assets_fundamentals",
              "clean_all_except_users_assets",
            ],
          },
          { status: 400 }
        )
    }

    console.log(`✅ Limpeza concluída: ${action}`)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("❌ Erro na limpeza do banco:", error)
    return NextResponse.json(
      {
        error: "Database cleanup failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// GET - Status do banco e informações para limpeza
export async function GET() {
  try {
        const session = await getServerSession(authOptions)

    if (!session || !(session as { user?: { id: string } }).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Obter estatísticas do banco
    const [
      usersCount,
      assetsCount,
      historicalPricesCount,
      portfoliosCount,
      portfolioItemsCount,
      transactionsCount,
      fundamentalAnalysisCount,
      simulationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.asset.count(),
      prisma.historicalPrice.count(),
      prisma.portfolio.count(),
      prisma.portfolioItem.count(),
      prisma.transaction.count(),
      prisma.fundamentalAnalysis.count(),
      prisma.simulation.count(),
    ])

    // Verificar problemas de precisão decimal
    const samplePrices = await prisma.historicalPrice.findMany({
      take: 10,
      select: {
        ticker: true,
        date: true,
        close: true,
      },
    })

    const hasDecimalIssues = samplePrices.some((price) => {
      const closeStr = price.close.toString()
      const decimalPart = closeStr.includes(".") ? closeStr.split(".")[1] : ""
      return decimalPart.length > 2
    })

    return NextResponse.json({
      success: true,
      statistics: {
        users: usersCount,
        assets: assetsCount,
        historicalPrices: historicalPricesCount,
        portfolios: portfoliosCount,
        portfolioItems: portfolioItemsCount,
        transactions: transactionsCount,
        fundamentalAnalysis: fundamentalAnalysisCount,
        simulations: simulationsCount,
      },
      issues: {
        hasDecimalPrecisionIssues: hasDecimalIssues,
        samplePrices: samplePrices.map((p) => ({
          ticker: p.ticker,
          date: p.date,
          close: p.close.toString(),
          decimalPlaces: p.close.toString().includes(".")
            ? p.close.toString().split(".")[1].length
            : 0,
        })),
      },
      availableActions: [
        {
          action: "clean_historical_prices",
          description:
            "Remove all historical price data (required before reloading with proper precision)",
          risk: "HIGH - Will delete all price history",
        },
        {
          action: "clean_fundamental_analysis",
          description: "Remove all fundamental analysis results",
          risk: "MEDIUM - Analysis can be regenerated",
        },
        {
          action: "clean_portfolios",
          description: "Remove all user portfolios and transactions",
          risk: "HIGH - Will delete user portfolio data",
        },
        {
          action: "reset_assets_fundamentals",
          description: "Reset fundamental data on assets (PE, PB, ROE, etc.)",
          risk: "LOW - Only removes calculated fields",
        },
        {
          action: "clean_all_except_users_assets",
          description:
            "Nuclear option: clean everything except users and basic asset info",
          risk: "VERY HIGH - Will delete all operational data",
        },
      ],
    })
  } catch (error: unknown) {
    console.error("Error getting database status:", error)
    return NextResponse.json(
      {
        error: "Failed to get database status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
