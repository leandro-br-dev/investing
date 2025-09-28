import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import yahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      ticker,
      period1,
      period2,
      interval = "1d",
      replaceExisting = false,
    } = body

    if (!ticker) {
      return NextResponse.json({ error: "Ticker is required" }, { status: 400 })
    }

    // Converter ticker brasileiro para formato Yahoo Finance
    const convertTickerForYahoo = (ticker: string): string => {
      if (ticker.match(/[A-Z]{4}[0-9]{1,2}/)) {
        return `${ticker}.SA`
      }
      return ticker
    }

    const yahooTicker = convertTickerForYahoo(ticker)

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

    try {
      // Definir período padrão (últimos 2 anos se não especificado)
      const endDate = period2 ? new Date(period2) : new Date()
      const startDate = period1
        ? new Date(period1)
        : new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)

      console.log(
        `Buscando dados históricos para ${yahooTicker} de ${startDate.toISOString()} até ${endDate.toISOString()}`
      )

      const historical = await yahooFinance.historical(yahooTicker, {
        period1: startDate,
        period2: endDate,
        interval: interval as unknown,
      })

      if (!historical || historical.length === 0) {
        return NextResponse.json(
          { error: `No historical data found for ${ticker}` },
          { status: 404 }
        )
      }

      console.log(`Encontrados ${historical.length} registros históricos`)

      // Se replaceExisting = true, limpar dados existentes
      if (replaceExisting) {
        await prisma.historicalPrice.deleteMany({
          where: { ticker },
        })
      }

      let processed = 0
      const skipped = 0
      let errors = 0

      // Processar em lotes para evitar sobrecarga
      const batchSize = 50
      for (let i = 0; i < historical.length; i += batchSize) {
        const batch = historical.slice(i, i + batchSize)

        const operations = batch.map(async (record) => {
          try {
            const date = record.date.toISOString().split("T")[0]

            await prisma.historicalPrice.upsert({
              where: {
                ticker_date: {
                  ticker,
                  date,
                },
              },
              update: {
                open: record.open || 0,
                high: record.high || 0,
                low: record.low || 0,
                close: record.close || 0,
              },
              create: {
                ticker,
                date,
                open: record.open || 0,
                high: record.high || 0,
                low: record.low || 0,
                close: record.close || 0,
              },
            })

            processed++
          } catch (error) {
            console.error(
              `Erro ao processar registro para ${record.date}:`,
              error
            )
            errors++
          }
        })

        await Promise.all(operations)
      }

      return NextResponse.json({
        success: true,
        data: {
          ticker,
          yahooTicker,
          period: {
            start: startDate.toISOString().split("T")[0],
            end: endDate.toISOString().split("T")[0],
          },
          records: {
            found: historical.length,
            processed,
            skipped,
            errors,
          },
        },
        message: `Historical data updated for ${ticker}`,
      })
    } catch (yahooError: unknown) {
      console.error(
        `Erro ao buscar dados históricos do Yahoo Finance para ${yahooTicker}:`,
        yahooError
      )

      return NextResponse.json(
        {
          error: `Failed to fetch historical data for ${ticker}`,
          details: yahooError.message,
          ticker: yahooTicker,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in historical data API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET para buscar dados históricos já armazenados
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker")
    const days = parseInt(searchParams.get("days") || "30")

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker parameter is required" },
        { status: 400 }
      )
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const historicalData = await prisma.historicalPrice.findMany({
      where: {
        ticker,
        date: {
          gte: cutoffDate.toISOString().split("T")[0],
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      data: historicalData,
      summary: {
        ticker,
        records: historicalData.length,
        period: days,
        oldest: historicalData[historicalData.length - 1]?.date,
        newest: historicalData[0]?.date,
      },
    })
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
