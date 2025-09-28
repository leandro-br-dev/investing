import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
        const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id
    const simulationId = params.id

    // Verificar se a simulação pertence ao usuário
    const simulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId,
      },
    })

    if (!simulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      )
    }

    // Buscar posições ativas da simulação
    const positions = await prisma.simulationItem.findMany({
      where: {
        simulationId,
        quantity: { gt: 0 },
      },
      include: {
        asset: {
          include: {
            historicalPrices: {
              where: {
                date: { lte: simulation.currentDate },
              },
              orderBy: { date: "desc" },
              take: 1,
            },
          },
        },
      },
    })

    const enrichedPositions = positions.map((position: unknown) => {
      const currentPrice = Number(
        position.asset.historicalPrices[0]?.close || position.avgPrice
      )
      const currentValue = Number(position.quantity) * currentPrice
      const totalCost = Number(position.quantity) * Number(position.avgPrice)
      const profitLoss = currentValue - totalCost
      const profitLossPercent =
        totalCost > 0 ? (profitLoss / totalCost) * 100 : 0

      return {
        ticker: position.ticker,
        name: position.asset.name,
        currency: position.currency,
        market: position.asset.market,
        quantity: Number(position.quantity),
        avgPrice: Number(position.avgPrice),
        currentPrice,
        currentValue,
        totalCost,
        profitLoss,
        profitLossPercent: Number(profitLossPercent.toFixed(2)),
        lastUpdate:
          position.asset.historicalPrices[0]?.date || simulation.currentDate,
      }
    })

    // Calcular totais por moeda
    const brlPositions = enrichedPositions.filter((p) => p.currency === "BRL")
    const usdPositions = enrichedPositions.filter((p) => p.currency === "USD")

    const totalBRL = brlPositions.reduce(
      (sum, pos) => sum + pos.currentValue,
      0
    )
    const totalUSD = usdPositions.reduce(
      (sum, pos) => sum + pos.currentValue,
      0
    )
    const totalCostBRL = brlPositions.reduce(
      (sum, pos) => sum + pos.totalCost,
      0
    )
    const totalCostUSD = usdPositions.reduce(
      (sum, pos) => sum + pos.totalCost,
      0
    )
    const profitLossBRL = totalBRL - totalCostBRL
    const profitLossUSD = totalUSD - totalCostUSD

    return NextResponse.json({
      positions: enrichedPositions,
      summary: {
        totalPositions: enrichedPositions.length,
        brl: {
          positions: brlPositions.length,
          currentValue: totalBRL,
          totalCost: totalCostBRL,
          profitLoss: profitLossBRL,
          profitLossPercent:
            totalCostBRL > 0 ? (profitLossBRL / totalCostBRL) * 100 : 0,
          cashBalance: Number(simulation.currentCashBRL || 0),
        },
        usd: {
          positions: usdPositions.length,
          currentValue: totalUSD,
          totalCost: totalCostUSD,
          profitLoss: profitLossUSD,
          profitLossPercent:
            totalCostUSD > 0 ? (profitLossUSD / totalCostUSD) * 100 : 0,
          cashBalance: Number(simulation.currentCashUSD || 0),
        },
      },
      simulationDate: simulation.currentDate,
    })
  } catch (error) {
    console.error("Error fetching simulation positions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
