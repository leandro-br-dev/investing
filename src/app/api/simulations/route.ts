import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id

    // Buscar simulações do usuário
    const simulations = await prisma.simulation.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            asset: {
              include: {
                historicalPrices: {
                  orderBy: { date: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Calcular dados das simulações
    const enrichedSimulations = simulations.map((simulation: unknown) => {
      // Calcular valor atual baseado nos preços atuais
      let currentValueBRL = Number(simulation.currentCashBRL)
      let currentValueUSD = Number(simulation.currentCashUSD)

      simulation.items.forEach((item: unknown) => {
        const currentPrice = Number(
          item.asset.historicalPrices[0]?.close || item.avgPrice
        )
        const currentValue = Number(item.quantity) * currentPrice

        if (item.currency === "BRL") {
          currentValueBRL += currentValue
        } else {
          currentValueUSD += currentValue
        }
      })

      const totalCurrentValue = currentValueBRL + currentValueUSD
      const totalInitialValue =
        Number(simulation.initialCashBRL) + Number(simulation.initialCashUSD)
      const totalReturn =
        totalInitialValue > 0
          ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100
          : 0

      // Calcular duração em meses
      const startDate = new Date(simulation.startDate)
      const currentDate = new Date(simulation.currentDate)
      const monthsElapsed = Math.round(
        (currentDate.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )

      return {
        id: simulation.id,
        name: simulation.name,
        startDate: simulation.startDate,
        currentDate: simulation.currentDate,
        initialCashBRL: simulation.initialCashBRL,
        initialCashUSD: simulation.initialCashUSD,
        currentCashBRL: simulation.currentCashBRL,
        currentCashUSD: simulation.currentCashUSD,
        currentValueBRL,
        currentValueUSD,
        totalCurrentValue,
        totalInitialValue,
        totalReturn: Number(totalReturn.toFixed(2)),
        realizedProfitBRL: simulation.realizedProfitBRL,
        realizedProfitUSD: simulation.realizedProfitUSD,
        monthlyDepositBRL: simulation.monthlyDepositBRL,
        monthlyDepositUSD: simulation.monthlyDepositUSD,
        isActive: simulation.isActive,
        monthsElapsed,
        positionsCount: simulation.items.length,
        createdAt: simulation.createdAt,
        updatedAt: simulation.updatedAt,
      }
    })

    return NextResponse.json({
      simulations: enrichedSimulations,
      total: enrichedSimulations.length,
    })
  } catch (error) {
    console.error("Error fetching simulations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id
    const body = await req.json()
    const {
      name,
      startDate,
      initialCashBRL = 0,
      initialCashUSD = 0,
      monthlyDepositBRL = 0,
      monthlyDepositUSD = 0,
      minPurchaseIntervalDays = 90,
    } = body

    // Converter para números
    const initialBRL = Number(initialCashBRL)
    const initialUSD = Number(initialCashUSD)
    const monthlyBRL = Number(monthlyDepositBRL)
    const monthlyUSD = Number(monthlyDepositUSD)
    const intervalDays = Number(minPurchaseIntervalDays)

    // Validações básicas
    if (!name || !startDate) {
      return NextResponse.json(
        { error: "Name and start date are required" },
        { status: 400 }
      )
    }

    if (initialBRL < 0 || initialUSD < 0) {
      return NextResponse.json(
        { error: "Initial cash cannot be negative" },
        { status: 400 }
      )
    }

    if (initialBRL === 0 && initialUSD === 0) {
      return NextResponse.json(
        {
          error:
            "At least one currency must have initial capital greater than 0",
        },
        { status: 400 }
      )
    }

    // Criar nova simulação
    const simulation = await prisma.simulation.create({
      data: {
        userId,
        name,
        startDate,
        currentDate: startDate, // Inicia na mesma data
        initialCashBRL: initialBRL,
        initialCashUSD: initialUSD,
        currentCashBRL: initialBRL,
        currentCashUSD: initialUSD,
        monthlyDepositBRL: monthlyBRL,
        monthlyDepositUSD: monthlyUSD,
        minPurchaseIntervalDays: intervalDays,
        isActive: true,
      },
    })

    return NextResponse.json(simulation, { status: 201 })
  } catch (error) {
    console.error("Error creating simulation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
