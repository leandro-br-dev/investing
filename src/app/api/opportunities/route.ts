import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMediumCacheHeaders } from "@/lib/cache"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {

    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const currency = searchParams.get("currency") || "BRL"
    const limit = parseInt(searchParams.get("limit") || "20")
    const simulationDate = searchParams.get("simulationDate")

    // Buscar configurações do usuário para períodos
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: (session as unknown).user.id },
    })

    const buyPeriodMonths = userSettings?.buyPeriodMonths || 12
    const sellPeriodMonths = userSettings?.sellPeriodMonths || 24

    // Calcular datas para os períodos baseado na data da simulação (ou atual se não fornecida)
    const referenceDate = simulationDate ? new Date(simulationDate) : new Date()

    const buyPeriodDate = new Date(referenceDate)
    buyPeriodDate.setMonth(buyPeriodDate.getMonth() - buyPeriodMonths)

    const sellPeriodDate = new Date(referenceDate)
    sellPeriodDate.setMonth(sellPeriodDate.getMonth() - sellPeriodMonths)

    // Buscar ativos da moeda especificada
    const assets = await prisma.asset.findMany({
      where: { currency },
      include: {
        historicalPrices: {
          where: {
            date: {
              gte: sellPeriodDate.toISOString().split("T")[0],
              lte: referenceDate.toISOString().split("T")[0],
            },
          },
          orderBy: { date: "desc" },
        },
      },
    })

    // Calcular oportunidades
    const opportunities = assets
      .map((asset) => {
        const prices = asset.historicalPrices

        if (prices.length === 0) return null

        // Preço atual (mais recente)
        const currentPrice = Number(prices[0].close)

        // Preços no período de compra (mínima) - filtrando até a data de referência
        const buyPeriodPrices = prices.filter((p) => {
          const priceDate = new Date(p.date)
          return priceDate >= buyPeriodDate && priceDate <= referenceDate
        })
        const minPrice =
          buyPeriodPrices.length > 0
            ? Math.min(...buyPeriodPrices.map((p) => Number(p.low)))
            : currentPrice

        // Preços no período de venda (máxima) - filtrando até a data de referência
        const sellPeriodPrices = prices.filter((p) => {
          const priceDate = new Date(p.date)
          return priceDate >= sellPeriodDate && priceDate <= referenceDate
        })
        const maxPrice =
          sellPeriodPrices.length > 0
            ? Math.max(...sellPeriodPrices.map((p) => Number(p.high)))
            : currentPrice

        // Calcular proximidade da mínima e potencial de retorno
        const proximity = (currentPrice / minPrice - 1) * 100
        const potential = (maxPrice / currentPrice - 1) * 100

        return {
          ticker: asset.ticker,
          name: asset.name,
          currency: asset.currency,
          market: asset.market,
          price: currentPrice,
          proximity: Number(proximity.toFixed(2)),
          potential: Number(potential.toFixed(2)),
          minPrice,
          maxPrice,
          lastUpdate: prices[0].date,
        }
      })
      .filter(Boolean)

    // Ordenar por proximidade da mínima (mais próximo = melhor oportunidade)
    const sortedOpportunities = opportunities
      .sort((a, b) => a!.proximity - b!.proximity)
      .slice(0, limit)

    const response = NextResponse.json({
      opportunities: sortedOpportunities,
      metadata: {
        currency,
        buyPeriodMonths,
        sellPeriodMonths,
        total: opportunities.length,
        lastUpdate: new Date().toISOString(),
      },
    })

    // Add cache headers for opportunities (cache for 5 minutes)
    const cacheHeaders = getMediumCacheHeaders()
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error("Error fetching opportunities:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
