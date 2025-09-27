import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Investigando ativos na base de dados...')

    // Buscar TODOS os ativos
    const allAssets = await prisma.asset.findMany({
      select: {
        ticker: true,
        name: true,
        currency: true,
        market: true
      },
      orderBy: [
        { currency: 'asc' },
        { ticker: 'asc' }
      ]
    })

    console.log(`📊 Total de ativos encontrados: ${allAssets.length}`)

    // Buscar quantos têm dados históricos
    const assetsWithHistory = await prisma.historicalPrice.groupBy({
      by: ['ticker'],
      _count: {
        ticker: true
      }
    })

    console.log(`📈 Ativos com dados históricos: ${assetsWithHistory.length}`)

    // Verificar período dos dados históricos
    const historyStats = await prisma.historicalPrice.aggregate({
      _min: { date: true },
      _max: { date: true },
      _count: { id: true }
    })

    console.log('📅 Estatísticas dos dados históricos:', historyStats)

    // Agrupar ativos por moeda
    const assetsByCurrency = allAssets.reduce((acc: any, asset) => {
      if (!acc[asset.currency]) acc[asset.currency] = []
      acc[asset.currency].push(asset)
      return acc
    }, {})

    // Verificar quais ativos têm dados
    const assetsHistoryMap = assetsWithHistory.reduce((acc: any, item) => {
      acc[item.ticker] = item._count.ticker
      return acc
    }, {})

    const detailedAssets = allAssets.map(asset => ({
      ...asset,
      hasHistory: !!assetsHistoryMap[asset.ticker],
      historyCount: assetsHistoryMap[asset.ticker] || 0
    }))

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAssets: allAssets.length,
        assetsWithHistory: assetsWithHistory.length,
        assetsWithoutHistory: allAssets.length - assetsWithHistory.length,
        totalHistoryRecords: historyStats._count.id,
        historyPeriod: {
          oldest: historyStats._min.date,
          newest: historyStats._max.date
        }
      },
      breakdown: {
        byCurrency: Object.entries(assetsByCurrency).map(([currency, assets]: [string, any]) => ({
          currency,
          count: assets.length,
          withHistory: assets.filter((a: any) => assetsHistoryMap[a.ticker]).length,
          withoutHistory: assets.filter((a: any) => !assetsHistoryMap[a.ticker]).length
        }))
      },
      assets: detailedAssets,
      message: `Análise completa: ${allAssets.length} ativos cadastrados, ${assetsWithHistory.length} com dados históricos`
    })

  } catch (error: any) {
    console.error('❌ Erro ao investigar ativos:', error)
    return NextResponse.json({
      success: false,
      error: "Error investigating assets",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}