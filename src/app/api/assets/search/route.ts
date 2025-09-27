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
    const query = searchParams.get("q")
    const simulationDate = searchParams.get("simulationDate")

    if (!query || query.length < 2) {
      return NextResponse.json({ assets: [] })
    }

    // Buscar ativos que correspondem ao termo de busca
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          {
            ticker: {
              contains: query.toUpperCase(),
            },
          },
          {
            name: {
              contains: query,
            },
          },
        ],
      },
      include: {
        historicalPrices: {
          where: simulationDate
            ? {
                date: { lte: simulationDate },
              }
            : undefined,
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      take: 10,
    })

    // Formatar resultado com preço atual
    const formattedAssets = assets.map((asset: unknown) => ({
      ticker: asset.ticker,
      name: asset.name,
      currency: asset.currency,
      market: asset.market,
      decimals: asset.decimals,
      minLotSize: asset.minLotSize,
      price: asset.historicalPrices[0]?.close || 0,
    }))

    return NextResponse.json({
      assets: formattedAssets,
      total: formattedAssets.length,
    })
  } catch (error) {
    console.error("Error searching assets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
