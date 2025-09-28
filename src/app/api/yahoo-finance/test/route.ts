import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import yahooFinance from "yahoo-finance2"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get("ticker") || "AAPL"

    console.log(`Testando Yahoo Finance com ticker: ${ticker}`)

    try {
      // Teste simples do Yahoo Finance
      const quote = await yahooFinance.quote(ticker, {
        fields: ["symbol", "shortName", "regularMarketPrice", "currency"],
      })

      console.log("Resposta do Yahoo Finance:", quote)

      return NextResponse.json({
        success: true,
        test: "Yahoo Finance API",
        ticker,
        data: {
          symbol: quote.symbol,
          name: quote.shortName,
          price: quote.regularMarketPrice,
          currency: quote.currency,
        },
        rawData: quote,
        message: `Teste bem-sucedido para ${ticker}`,
      })
    } catch (yahooError: unknown) {
      console.error("Erro no Yahoo Finance:", yahooError)

      return NextResponse.json(
        {
          success: false,
          error: "Yahoo Finance API Error",
          details: yahooError.message,
          ticker,
          message: "Falha no teste do Yahoo Finance",
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("Erro geral na API de teste:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
