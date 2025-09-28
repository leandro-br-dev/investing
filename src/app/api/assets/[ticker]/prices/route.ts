import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getPrismaClient } from "@/lib/init-db"
import { getLongCacheHeaders } from "@/lib/cache"

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const prisma = await getPrismaClient()
    const session = await getServerSession(authOptions)

    if (!session || !(session as { user?: { id: string } }).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const simulationDate = searchParams.get("simulationDate")
    const ticker = decodeURIComponent(params.ticker)

    // Se simulationDate for fornecida, usá-la como endDate padrão
    const effectiveEndDate = simulationDate || endDate

    // Buscar o ativo
    const asset = await prisma.asset.findFirst({
      where: { ticker: ticker.toUpperCase() },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Buscar preços históricos
    const whereClause: unknown = {
      ticker: asset.ticker,
    }

    if (startDate || effectiveEndDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = startDate
      }
      if (effectiveEndDate) {
        whereClause.date.lte = effectiveEndDate
      }
    }

    const prices = await prisma.historicalPrice.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
      take: 365, // Limitar a 1 ano de dados
    })

    const formattedPrices = prices.map((price: unknown) => ({
      date: price.date,
      open: Number(price.open),
      high: Number(price.high),
      low: Number(price.low),
      close: Number(price.close),
      volume: Number(price.volume || 0),
    }))

    const response = NextResponse.json({
      asset: {
        ticker: asset.ticker,
        name: asset.name,
        currency: asset.currency,
        market: asset.market,
      },
      prices: formattedPrices,
      period: {
        startDate: startDate || (prices.length > 0 ? prices[0].date : null),
        endDate:
          endDate ||
          (prices.length > 0 ? prices[prices.length - 1].date : null),
        totalDays: prices.length,
      },
    })

    // Add cache headers for historical prices (cache for 30 minutes since data is historical)
    const cacheHeaders = getLongCacheHeaders()
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error("Error fetching asset prices:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
