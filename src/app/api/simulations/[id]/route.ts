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

    // Buscar simulação específica
    const simulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId,
      },
      include: {
        items: {
          include: {
            asset: {
              include: {
                historicalPrices: {
                  where: {
                    date: {
                      lte:
                        (
                          await prisma.simulation.findUnique({
                            where: { id: simulationId },
                            select: { currentDate: true },
                          })
                        )?.currentDate ||
                        new Date().toISOString().split("T")[0],
                    },
                  },
                  orderBy: { date: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!simulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      )
    }

    // Calcular posições com preços da data atual da simulação
    const positions = simulation.items.map((item: unknown) => {
      const currentPrice =
        item.asset.historicalPrices[0]?.close || item.avgPrice
      const currentValue = item.quantity * currentPrice
      const investedAmount = item.quantity * item.avgPrice
      const profitLoss = currentValue - investedAmount
      const profitLossPercent = (profitLoss / investedAmount) * 100

      return {
        ticker: item.ticker,
        name: item.asset.name,
        quantity: item.quantity,
        averagePrice: item.avgPrice,
        currentPrice,
        currentValue,
        investedAmount,
        profitLoss,
        profitLossPercent: Number(profitLossPercent.toFixed(2)),
        currency: item.currency,
        lastUpdate:
          item.asset.historicalPrices[0]?.date ||
          item.createdAt.toISOString().split("T")[0],
      }
    })

    // Calcular resumos por moeda
    const brlPositions = positions.filter((p) => p.currency === "BRL")
    const usdPositions = positions.filter((p) => p.currency === "USD")

    const brlInvested = brlPositions.reduce(
      (sum, p) => sum + p.investedAmount,
      0
    )
    const brlCurrent = brlPositions.reduce((sum, p) => sum + p.currentValue, 0)
    const brlProfitLoss = brlCurrent - brlInvested

    const usdInvested = usdPositions.reduce(
      (sum, p) => sum + p.investedAmount,
      0
    )
    const usdCurrent = usdPositions.reduce((sum, p) => sum + p.currentValue, 0)
    const usdProfitLoss = usdCurrent - usdInvested

    const totalCurrentValue =
      (simulation as unknown).currentCashBRL +
      (simulation as unknown).currentCashUSD +
      brlCurrent +
      usdCurrent
    const totalInitialValue =
      (simulation as unknown).initialCashBRL +
      (simulation as unknown).initialCashUSD +
      brlInvested +
      usdInvested

    return NextResponse.json({
      simulation: {
        id: (simulation as unknown).id,
        name: (simulation as unknown).name,
        startDate: (simulation as unknown).startDate,
        currentDate: (simulation as unknown).currentDate,
        initialCashBRL: (simulation as unknown).initialCashBRL,
        initialCashUSD: (simulation as unknown).initialCashUSD,
        currentCashBRL: (simulation as unknown).currentCashBRL,
        currentCashUSD: (simulation as unknown).currentCashUSD,
        monthlyDepositBRL: (simulation as unknown).monthlyDepositBRL,
        monthlyDepositUSD: (simulation as unknown).monthlyDepositUSD,
        realizedProfitBRL: (simulation as unknown).realizedProfitBRL,
        realizedProfitUSD: (simulation as unknown).realizedProfitUSD,
        isActive: (simulation as unknown).isActive,
      },
      positions,
      summary: {
        brl: {
          cash: (simulation as unknown).currentCashBRL,
          invested: brlInvested,
          current: brlCurrent,
          profitLoss: brlProfitLoss,
          profitLossPercent:
            brlInvested > 0 ? (brlProfitLoss / brlInvested) * 100 : 0,
          total: (simulation as unknown).currentCashBRL + brlCurrent,
        },
        usd: {
          cash: (simulation as unknown).currentCashUSD,
          invested: usdInvested,
          current: usdCurrent,
          profitLoss: usdProfitLoss,
          profitLossPercent:
            usdInvested > 0 ? (usdProfitLoss / usdInvested) * 100 : 0,
          total: (simulation as unknown).currentCashUSD + usdCurrent,
        },
        total: {
          initialValue: totalInitialValue,
          currentValue: totalCurrentValue,
          profitLoss: totalCurrentValue - totalInitialValue,
          profitLossPercent:
            totalInitialValue > 0
              ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) *
                100
              : 0,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching simulation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await req.json()

    // Verificar se a simulação pertence ao usuário
    const existingSimulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId,
      },
    })

    if (!existingSimulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      )
    }

    // Atualizar simulação
    const updatedSimulation = await prisma.simulation.update({
      where: { id: simulationId },
      data: body,
    })

    return NextResponse.json(updatedSimulation)
  } catch (error) {
    console.error("Error updating simulation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingSimulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId,
      },
    })

    if (!existingSimulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      )
    }

    // Deletar simulação (cascade deletará os items)
    await prisma.simulation.delete({
      where: { id: simulationId },
    })

    return NextResponse.json({ message: "Simulation deleted successfully" })
  } catch (error) {
    console.error("Error deleting simulation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
