import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { globalQuoteCache, globalHistoricalCache } from "@/lib/quote-cache"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    switch (action) {
      case "stats":
        const quoteStats = globalQuoteCache.getStats()
        const hasRecentData = globalQuoteCache.hasRecentData(30)

        return NextResponse.json({
          success: true,
          cache: {
            quotes: {
              ...quoteStats,
              hasRecentData,
              description: "Cotações em tempo real"
            },
            historical: {
              description: "Dados históricos"
            }
          },
          timestamp: new Date().toISOString()
        })

      case "check":
        const ticker = searchParams.get("ticker")
        if (!ticker) {
          return NextResponse.json(
            { error: "Ticker parameter required" },
            { status: 400 }
          )
        }

        const cached = globalQuoteCache.get(ticker)
        const inCache = globalQuoteCache.has(ticker)

        return NextResponse.json({
          success: true,
          ticker: ticker.toUpperCase(),
          inCache,
          data: cached || null,
          message: inCache ? "Found in cache" : "Not in cache"
        })

      default:
        return NextResponse.json({
          success: true,
          actions: [
            "stats - Get cache statistics",
            "check - Check if ticker is in cache (requires ?ticker=SYMBOL)",
            "clear - Clear all cache (POST method)",
            "invalidate - Invalidate specific ticker (POST method)"
          ]
        })
    }

  } catch (error) {
    console.error('Error in cache API:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    switch (action) {
      case "clear":
        globalQuoteCache.clear()
        globalHistoricalCache.clear()

        return NextResponse.json({
          success: true,
          message: "All caches cleared",
          timestamp: new Date().toISOString()
        })

      case "invalidate":
        const body = await req.json()
        const { ticker } = body

        if (!ticker) {
          return NextResponse.json(
            { error: "Ticker is required" },
            { status: 400 }
          )
        }

        const quoteInvalidated = globalQuoteCache.invalidate(ticker)
        const historicalInvalidated = globalHistoricalCache.invalidate(ticker)

        return NextResponse.json({
          success: true,
          ticker: ticker.toUpperCase(),
          invalidated: {
            quotes: quoteInvalidated,
            historical: historicalInvalidated
          },
          message: `Cache invalidated for ${ticker}`
        })

      case "warm-up":
        // Pré-carregar cache com ativos mais importantes
        const { tickers } = await req.json()

        if (!tickers || !Array.isArray(tickers)) {
          return NextResponse.json(
            { error: "Tickers array is required" },
            { status: 400 }
          )
        }

        const results = []
        const errors = []

        for (const ticker of tickers.slice(0, 10)) { // Limite de 10 para warm-up
          try {
            // Fazer requisição para nossa API de cotação para popular o cache
            const response = await fetch(`${req.nextUrl.origin}/api/yahoo-finance/quote?ticker=${ticker}`, {
              headers: {
                'Cookie': req.headers.get('cookie') || ''
              }
            })

            const data = await response.json()

            if (response.ok) {
              results.push({
                ticker,
                cached: !data.cached, // Se veio do cache, não era warm-up
                success: true
              })
            } else {
              errors.push({
                ticker,
                error: data.error
              })
            }
          } catch (error: any) {
            errors.push({
              ticker,
              error: error.message
            })
          }
        }

        return NextResponse.json({
          success: true,
          warmUp: {
            requested: tickers.length,
            processed: results.length + errors.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
          },
          message: "Cache warm-up completed"
        })

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: clear, invalidate, or warm-up" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in cache management API:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}