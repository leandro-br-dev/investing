import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getPrismaClient } from "@/lib/init-db"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "30")
    const currency = searchParams.get("currency") as "BRL" | "USD" | null

    // Buscar carteira do usuário
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            asset: true,
          },
        },
      },
    })

    if (!portfolio || portfolio.items.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Carteira vazia",
      })
    }

    // Filtrar itens por moeda se especificado
    const filteredItems = currency
      ? portfolio.items.filter((item) => item.currency === currency)
      : portfolio.items

    if (filteredItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: `Nenhum item encontrado para a moeda ${currency}`,
      })
    }

    // Gerar datas para o período
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const performanceData = []
    const dateStep = Math.max(1, Math.floor(days / 30)) // Máximo 30 pontos de dados

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + dateStep)
    ) {
      const currentDate = d.toISOString().split("T")[0]

      let totalValue = 0
      let totalCost = 0

      // Para cada item da carteira, buscar preço histórico na data
      for (const item of filteredItems) {
        const historicalPrice = await prisma.historicalPrice.findFirst({
          where: {
            ticker: item.ticker,
            date: {
              lte: currentDate,
            },
          },
          orderBy: {
            date: "desc",
          },
          take: 1,
        })

        if (historicalPrice) {
          const itemValue =
            Number(item.quantity) * Number(historicalPrice.close)
          const itemCost = Number(item.quantity) * Number(item.avgPrice)

          totalValue += itemValue
          totalCost += itemCost
        }
      }

      if (totalValue > 0) {
        const profitLoss = totalValue - totalCost
        const profitLossPercent =
          totalCost > 0 ? (totalValue / totalCost - 1) * 100 : 0

        performanceData.push({
          date: currentDate,
          totalValue,
          totalCost,
          profitLoss,
          profitLossPercent,
          brlValue: currency === "BRL" ? totalValue : 0,
          usdValue: currency === "USD" ? totalValue : 0,
        })
      }
    }

    // Calcular métricas de resumo
    const summary =
      performanceData.length > 0
        ? {
            currentValue:
              performanceData[performanceData.length - 1]?.totalValue || 0,
            totalCost:
              performanceData[performanceData.length - 1]?.totalCost || 0,
            totalReturn:
              performanceData[performanceData.length - 1]?.profitLoss || 0,
            totalReturnPercent:
              performanceData[performanceData.length - 1]?.profitLossPercent ||
              0,
            periodStart: performanceData[0]?.date,
            periodEnd: performanceData[performanceData.length - 1]?.date,
            dataPoints: performanceData.length,
          }
        : null

    return NextResponse.json({
      success: true,
      data: performanceData,
      summary,
      meta: {
        currency: currency || "ALL",
        days,
        items: filteredItems.length,
      },
    })
  } catch (error: unknown) {
    console.error("Error fetching portfolio performance:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
