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

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as any).user.id
    const simulationId = params.id

    // Buscar simulação específica
    const simulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId
      },
      include: {
        items: {
          include: {
            asset: {
              include: {
                historicalPrices: {
                  where: {
                    date: {
                      lte: (await prisma.simulation.findUnique({
                        where: { id: simulationId },
                        select: { currentDate: true }
                      }))?.currentDate || new Date().toISOString().split('T')[0]
                    }
                  },
                  orderBy: { date: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    })

    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Calcular posições com preços da data atual da simulação
    const positions = simulation.items.map((item: any) => {
      const currentPrice = item.asset.historicalPrices[0]?.close || item.avgPrice
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
        lastUpdate: item.asset.historicalPrices[0]?.date || item.createdAt.toISOString().split('T')[0]
      }
    })

    // Calcular resumos por moeda
    const brlPositions = positions.filter(p => p.currency === "BRL")
    const usdPositions = positions.filter(p => p.currency === "USD")

    const brlInvested = brlPositions.reduce((sum, p) => sum + p.investedAmount, 0)
    const brlCurrent = brlPositions.reduce((sum, p) => sum + p.currentValue, 0)
    const brlProfitLoss = brlCurrent - brlInvested

    const usdInvested = usdPositions.reduce((sum, p) => sum + p.investedAmount, 0)
    const usdCurrent = usdPositions.reduce((sum, p) => sum + p.currentValue, 0)
    const usdProfitLoss = usdCurrent - usdInvested

    const totalCurrentValue = (simulation as any).currentCashBRL + (simulation as any).currentCashUSD + brlCurrent + usdCurrent
    const totalInitialValue = (simulation as any).initialCashBRL + (simulation as any).initialCashUSD + brlInvested + usdInvested

    return NextResponse.json({
      simulation: {
        id: (simulation as any).id,
        name: (simulation as any).name,
        startDate: (simulation as any).startDate,
        currentDate: (simulation as any).currentDate,
        initialCashBRL: (simulation as any).initialCashBRL,
        initialCashUSD: (simulation as any).initialCashUSD,
        currentCashBRL: (simulation as any).currentCashBRL,
        currentCashUSD: (simulation as any).currentCashUSD,
        monthlyDepositBRL: (simulation as any).monthlyDepositBRL,
        monthlyDepositUSD: (simulation as any).monthlyDepositUSD,
        realizedProfitBRL: (simulation as any).realizedProfitBRL,
        realizedProfitUSD: (simulation as any).realizedProfitUSD,
        isActive: (simulation as any).isActive
      },
      positions,
      summary: {
        brl: {
          cash: (simulation as any).currentCashBRL,
          invested: brlInvested,
          current: brlCurrent,
          profitLoss: brlProfitLoss,
          profitLossPercent: brlInvested > 0 ? (brlProfitLoss / brlInvested) * 100 : 0,
          total: (simulation as any).currentCashBRL + brlCurrent
        },
        usd: {
          cash: (simulation as any).currentCashUSD,
          invested: usdInvested,
          current: usdCurrent,
          profitLoss: usdProfitLoss,
          profitLossPercent: usdInvested > 0 ? (usdProfitLoss / usdInvested) * 100 : 0,
          total: (simulation as any).currentCashUSD + usdCurrent
        },
        total: {
          initialValue: totalInitialValue,
          currentValue: totalCurrentValue,
          profitLoss: totalCurrentValue - totalInitialValue,
          profitLossPercent: totalInitialValue > 0 ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching simulation:', error)
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

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as any).user.id
    const simulationId = params.id
    const body = await req.json()

    // Verificar se a simulação pertence ao usuário
    const existingSimulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId
      }
    })

    if (!existingSimulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Atualizar simulação
    const updatedSimulation = await prisma.simulation.update({
      where: { id: simulationId },
      data: body
    })

    return NextResponse.json(updatedSimulation)

  } catch (error) {
    console.error('Error updating simulation:', error)
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

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as any).user.id
    const simulationId = params.id

    // Verificar se a simulação pertence ao usuário
    const existingSimulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId
      }
    })

    if (!existingSimulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 })
    }

    // Deletar simulação (cascade deletará os items)
    await prisma.simulation.delete({
      where: { id: simulationId }
    })

    return NextResponse.json({ message: "Simulation deleted successfully" })

  } catch (error) {
    console.error('Error deleting simulation:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}