import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getPrismaClient } from "@/lib/init-db"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id
    const simulationId = params.id
    const body = await req.json()
    const { period = "day", amount = 1 } = body

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

    // Calcular nova data baseada no período
    const currentDate = new Date(simulation.currentDate)
    let newDate = new Date(currentDate)

    switch (period) {
      case "day":
        newDate.setDate(currentDate.getDate() + amount)
        break
      case "week":
        newDate.setDate(currentDate.getDate() + amount * 7)
        break
      case "month":
        newDate.setMonth(currentDate.getMonth() + amount)
        break
      case "year":
        newDate.setFullYear(currentDate.getFullYear() + amount)
        break
      default:
        return NextResponse.json(
          { error: "Invalid period. Use: day, week, month, or year" },
          { status: 400 }
        )
    }

    // Não permitir avançar além da data atual
    const today = new Date()
    if (newDate > today) {
      newDate = today
    }

    const newDateString = newDate.toISOString().split("T")[0]

    // Calcular se deve aplicar depósito mensal
    const startDate = new Date(simulation.startDate)
    const currentMonths = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const newMonths = Math.floor(
      (newDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    let additionalCashBRL = 0
    let additionalCashUSD = 0

    // Aplicar depósitos mensais se passou para um novo mês
    if (newMonths > currentMonths) {
      const monthsDifference = newMonths - currentMonths
      additionalCashBRL =
        Number(simulation.monthlyDepositBRL) * monthsDifference
      additionalCashUSD =
        Number(simulation.monthlyDepositUSD) * monthsDifference
    }

    // Atualizar simulação
    const updatedSimulation = await prisma.simulation.update({
      where: { id: simulationId },
      data: {
        currentDate: newDateString,
        currentCashBRL: Number(simulation.currentCashBRL) + additionalCashBRL,
        currentCashUSD: Number(simulation.currentCashUSD) + additionalCashUSD,
      },
    })

    // Buscar dados atualizados da simulação com preços da nova data
    const simulationWithItems = await prisma.simulation.findUnique({
      where: { id: simulationId },
      include: {
        items: {
          include: {
            asset: {
              include: {
                historicalPrices: {
                  where: {
                    date: { lte: newDateString },
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

    // Calcular novo valor total
    let totalValueBRL = Number(updatedSimulation.currentCashBRL)
    let totalValueUSD = Number(updatedSimulation.currentCashUSD)

    simulationWithItems?.items.forEach((item: unknown) => {
      const currentPrice = Number(
        item.asset.historicalPrices[0]?.close || item.avgPrice
      )
      const currentValue = Number(item.quantity) * currentPrice

      if (item.currency === "BRL") {
        totalValueBRL += currentValue
      } else {
        totalValueUSD += currentValue
      }
    })

    const totalValue = totalValueBRL + totalValueUSD
    const initialValue =
      Number(simulation.initialCashBRL) + Number(simulation.initialCashUSD)
    const totalReturn =
      initialValue > 0 ? ((totalValue - initialValue) / initialValue) * 100 : 0

    return NextResponse.json({
      message: "Simulation time advanced successfully",
      simulation: {
        id: updatedSimulation.id,
        currentDate: updatedSimulation.currentDate,
        currentCashBRL: updatedSimulation.currentCashBRL,
        currentCashUSD: updatedSimulation.currentCashUSD,
        totalValueBRL,
        totalValueUSD,
        totalValue,
        totalReturn: Number(totalReturn.toFixed(2)),
        monthlyDepositsApplied: {
          brl: additionalCashBRL,
          usd: additionalCashUSD,
        },
      },
      advancement: {
        period,
        amount,
        fromDate: simulation.currentDate,
        toDate: newDateString,
        monthlyDepositsApplied: additionalCashBRL > 0 || additionalCashUSD > 0,
      },
    })
  } catch (error) {
    console.error("Error advancing simulation time:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
