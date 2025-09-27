import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import yahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"
import { globalQuoteCache } from "@/lib/quote-cache"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker")

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker parameter is required" },
        { status: 400 }
      )
    }

    // Converter ticker brasileiro para formato Yahoo Finance
    const convertTickerForYahoo = (ticker: string): string => {
      // Ações brasileiras: adicionar .SA para B3
      if (ticker.match(/[A-Z]{4}[0-9]{1,2}/)) {
        return `${ticker}.SA`
      }
      // Ações americanas: manter como está
      return ticker
    }

    const yahooTicker = convertTickerForYahoo(ticker)

    // Verificar cache primeiro
    const cachedQuote = globalQuoteCache.get(ticker)
    if (cachedQuote) {
      console.log(`Cotação encontrada no cache para: ${ticker}`)
      return NextResponse.json({
        success: true,
        data: {
          ...cachedQuote,
          source: "cache",
        },
        message: `Cached quote for ${ticker}`,
        cached: true,
      })
    }

    try {
      // Buscar cotação atual do Yahoo Finance
      console.log(`Buscando cotação para: ${yahooTicker}`)

      const quote = await yahooFinance.quote(yahooTicker, {
        fields: [
          "symbol",
          "shortName",
          "longName",
          "regularMarketPrice",
          "regularMarketPreviousClose",
          "regularMarketChange",
          "regularMarketChangePercent",
          "regularMarketTime",
          "currency",
        ],
      })

      if (!quote || !quote.regularMarketPrice) {
        return NextResponse.json(
          { error: `No data found for ticker ${ticker}` },
          { status: 404 }
        )
      }

      // Verificar se o ativo existe na nossa base
      const asset = await prisma.asset.findUnique({
        where: { ticker },
      })

      if (!asset) {
        return NextResponse.json(
          { error: `Asset ${ticker} not found in database` },
          { status: 404 }
        )
      }

      // Preparar dados da cotação
      const quoteData = {
        ticker,
        yahooTicker,
        name: quote.shortName || quote.longName || asset.name,
        price: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        lastUpdate: quote.regularMarketTime
          ? new Date(Number(quote.regularMarketTime) * 1000)
          : new Date(),
        currency: quote.currency || asset.currency,
        source: "yahoo-finance",
      }

      // Salvar no cache
      globalQuoteCache.set(ticker, quoteData, 300) // 5 minutos de cache

      // Opcional: Salvar na base de dados históricos
      const today = new Date().toISOString().split("T")[0]

      await prisma.historicalPrice.upsert({
        where: {
          ticker_date: {
            ticker,
            date: today,
          },
        },
        update: {
          close: quote.regularMarketPrice,
          open: quote.regularMarketPreviousClose, // Aproximação
          high: quote.regularMarketPrice, // Será atualizado com dados históricos completos
          low: quote.regularMarketPrice, // Será atualizado com dados históricos completos
        },
        create: {
          ticker,
          date: today,
          open: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          high: quote.regularMarketPrice,
          low: quote.regularMarketPrice,
          close: quote.regularMarketPrice,
        },
      })

      return NextResponse.json({
        success: true,
        data: quoteData,
        message: `Quote updated for ${ticker}`,
      })
    } catch (yahooError: unknown) {
      console.error(
        `Erro ao buscar cotação do Yahoo Finance para ${yahooTicker}:`,
        yahooError
      )

      // Fallback: buscar dados locais
      const localData = await prisma.historicalPrice.findFirst({
        where: { ticker },
        orderBy: { date: "desc" },
      })

      if (localData) {
        return NextResponse.json({
          success: true,
          data: {
            ticker,
            name: "N/A",
            price: localData.close,
            previousClose: null,
            change: null,
            changePercent: null,
            lastUpdate: new Date(localData.date),
            currency: "N/A",
            source: "local-cache",
          },
          message: `Using cached data for ${ticker} (Yahoo Finance unavailable)`,
          warning: "Data from local cache, may be outdated",
        })
      }

      return NextResponse.json(
        {
          error: `Failed to fetch quote for ${ticker}`,
          details: yahooError.message,
          ticker: yahooTicker,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in quote API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST para buscar múltiplas cotações
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tickers } = await req.json()

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json(
        { error: "Tickers array is required" },
        { status: 400 }
      )
    }

    if (tickers.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 tickers allowed per request" },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const ticker of tickers) {
      try {
        // Reusar a lógica do GET
        const response = await fetch(
          `${req.nextUrl.origin}/api/yahoo-finance/quote?ticker=${ticker}`,
          {
            headers: {
              Cookie: req.headers.get("cookie") || "",
            },
          }
        )

        const data = await response.json()

        if (response.ok) {
          results.push(data.data)
        } else {
          errors.push({ ticker, error: data.error })
        }
      } catch (error: unknown) {
        errors.push({ ticker, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: tickers.length,
        successful: results.length,
        failed: errors.length,
      },
    })
  } catch (error) {
    console.error("Error in bulk quote API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
