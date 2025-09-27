import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const portfolioId = searchParams.get("portfolioId")
    const simulationId = searchParams.get("simulationId")
    const type = searchParams.get("type") // "buy" or "sell"
    const ticker = searchParams.get("ticker")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const userId = (session as unknown).user.id

    // Build filter conditions
    const where: unknown = { userId }

    if (portfolioId) {
      where.portfolioId = portfolioId
    }

    if (simulationId) {
      where.simulationId = simulationId
    }

    if (type && ["buy", "sell"].includes(type)) {
      where.type = type
    }

    if (ticker) {
      where.ticker = ticker
    }

    // Fetch transactions with related data
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        asset: {
          select: {
            name: true,
          },
        },
        portfolio: {
          select: {
            name: true,
          },
        },
        simulation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        executedAt: "desc",
      },
      take: limit,
      skip: offset,
    })

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where })

    // Format response
    const formattedTransactions = transactions.map((transaction: unknown) => ({
      id: transaction.id,
      ticker: transaction.ticker,
      assetName: transaction.asset.name,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      totalAmount: transaction.totalAmount,
      currency: transaction.currency,
      executedAt: transaction.executedAt,
      portfolioName: transaction.portfolio?.name || null,
      simulationName: transaction.simulation?.name || null,
      isSimulation: !!transaction.simulationId,
    }))

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
