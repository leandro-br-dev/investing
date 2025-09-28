import { NextRequest, NextResponse } from "next/server"
import yahooFinance from "yahoo-finance2"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker") || "AAPL"
    const days = parseInt(searchParams.get("days") || "7")

    console.log(
      `📈 Testando dados históricos do Yahoo Finance para ${ticker} (${days} dias)`
    )

    try {
      // Definir período
      const endDate = new Date()
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Buscar dados históricos
      const historical = await yahooFinance.historical(ticker, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
      })

      console.log(
        `✅ Encontrados ${historical.length} registros históricos para ${ticker}`
      )

      // Pegar alguns registros de exemplo
      const sample = historical.slice(0, 3).map((record) => ({
        date: record.date.toISOString().split("T")[0],
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
      }))

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        test: "Yahoo Finance Historical Data - Teste",
        ticker: ticker.toUpperCase(),
        period: {
          days,
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
        data: {
          totalRecords: historical.length,
          sample,
          latest:
            historical.length > 0
              ? {
                  date: historical[0].date.toISOString().split("T")[0],
                  price: historical[0].close,
                }
              : null,
        },
        message: `✅ Dados históricos obtidos com sucesso para ${ticker}`,
      })
    } catch (yahooError: unknown) {
      console.error(
        "❌ Erro nos dados históricos do Yahoo Finance:",
        yahooError
      )

      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: "Yahoo Finance Historical Data Error",
          errorType: yahooError.name || "Unknown Error",
          details: yahooError.message,
          ticker,
          suggestion:
            "Verifique se o ticker está correto e se há dados históricos disponíveis",
          message: `❌ Falha ao obter dados históricos para ${ticker}`,
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("❌ Erro geral na API de teste de dados históricos:", error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: "Internal server error",
        errorType: error.name || "Unknown Error",
        details: error.message,
        message: "❌ Erro interno do servidor",
      },
      { status: 500 }
    )
  }
}
