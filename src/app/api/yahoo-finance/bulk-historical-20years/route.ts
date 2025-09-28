import { NextRequest, NextResponse } from "next/server"
import yahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"

// Estado global para tracking do progresso (em produção usar Redis ou DB)
let loadingStatus = {
  isRunning: false,
  progress: 0,
  currentAsset: "",
  totalAssets: 0,
  processedAssets: 0,
  errors: [] as string[],
  startTime: null as Date | null,
  results: {
    successful: [] as unknown[],
    failed: [] as unknown[],
    totalRecords: 0,
  },
}

export async function GET() {
  return NextResponse.json({
    success: true,
    status: loadingStatus,
  })
}

export async function POST(req: NextRequest) {
  if (loadingStatus.isRunning) {
    return NextResponse.json(
      {
        error: "Carregamento já em andamento",
        status: loadingStatus,
      },
      { status: 409 }
    )
  }

  try {
    const body = await req.json()
    const { currency = null, yearsBack = 20, replaceExisting = false } = body

    console.log(`🚀 Iniciando carregamento de 20 anos de dados históricos`)
    console.log(`💱 Moeda: ${currency || "Todas"}`)
    console.log(`🔄 Replace existing: ${replaceExisting}`)

    // Buscar ativos
    const whereClause = currency ? { currency } : {}
        const assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        ticker: true,
        name: true,
        currency: true,
        market: true,
      },
      orderBy: [{ currency: "asc" }, { ticker: "asc" }],
    })

    if (assets.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhum ativo encontrado",
        filter: { currency },
      })
    }

    // Inicializar status
    loadingStatus = {
      isRunning: true,
      progress: 0,
      currentAsset: "",
      totalAssets: assets.length,
      processedAssets: 0,
      errors: [] as string[],
      startTime: new Date(),
      results: {
        successful: [] as unknown[],
        failed: [] as unknown[],
        totalRecords: 0,
      },
    }

    // Processar em background (não await)
    processAssetsInBackground(assets, yearsBack, replaceExisting)

    return NextResponse.json({
      success: true,
      message: `Carregamento iniciado em background para ${assets.length} ativos`,
      trackingUrl: "/api/yahoo-finance/bulk-historical-20years",
      totalAssets: assets.length,
      estimatedDuration: `${Math.round(assets.length * 3)} minutos`,
    })
  } catch (error: unknown) {
    loadingStatus.isRunning = false
    console.error("❌ Erro ao iniciar carregamento:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

async function processAssetsInBackground(
  assets: unknown[],
  yearsBack: number,
  replaceExisting: boolean
) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - yearsBack)

  console.log(
    `📅 Período: ${startDate.toISOString().split("T")[0]} até ${endDate.toISOString().split("T")[0]}`
  )

  const convertTickerForYahoo = (ticker: string): string => {
    if (ticker.match(/[A-Z]{4}[0-9]{1,2}/)) {
      return `${ticker}.SA`
    }
    return ticker
  }

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    const { ticker, name, currency, market } = asset
    const yahooTicker = convertTickerForYahoo(ticker)

    try {
      loadingStatus.currentAsset = ticker
      loadingStatus.progress = Math.round((i / assets.length) * 100)

      console.log(
        `📡 [${i + 1}/${assets.length}] Processando ${ticker} (${yahooTicker})...`
      )

      // Verificar se já tem dados suficientes
      if (!replaceExisting) {
                const existingCount = await prisma.historicalPrice.count({
          where: { ticker },
        })

        if (existingCount > 1000) {
          // Se já tem mais de 1000 registros, pular
          console.log(
            `⏭️ ${ticker} já tem ${existingCount} registros, pulando...`
          )
          loadingStatus.results.successful.push({
            ticker,
            name,
            message: `Skipped - already has ${existingCount} records`,
            records: existingCount,
          })
          loadingStatus.processedAssets++
          continue
        }
      }

      // Buscar dados do Yahoo Finance
      const historical = await yahooFinance.historical(yahooTicker, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
      })

      if (!historical || historical.length === 0) {
        throw new Error(`Nenhum dado histórico encontrado para ${yahooTicker}`)
      }

      console.log(`✅ ${ticker}: ${historical.length} registros encontrados`)

      // Remover dados existentes se solicitado
      if (replaceExisting) {
                const deletedCount = await prisma.historicalPrice.deleteMany({
          where: { ticker },
        })
        console.log(
          `🗑️ ${ticker}: ${deletedCount.count} registros antigos removidos`
        )
      }

      // Processar em lotes muito pequenos para evitar timeout
      let processed = 0
      let errors = 0
      const miniLotSize = 5 // Lotes muito pequenos

      for (let j = 0; j < historical.length; j += miniLotSize) {
        const miniLot = historical.slice(j, j + miniLotSize)

        try {
                    await prisma.$transaction(
            async (tx) => {
              for (const record of miniLot) {
                try {
                  const date = record.date.toISOString().split("T")[0]

                  await tx.historicalPrice.upsert({
                    where: {
                      ticker_date: {
                        ticker,
                        date,
                      },
                    },
                    update: {
                      open: Number((record.open || 0).toFixed(2)),
                      high: Number((record.high || 0).toFixed(2)),
                      low: Number((record.low || 0).toFixed(2)),
                      close: Number((record.close || 0).toFixed(2)),
                    },
                    create: {
                      ticker,
                      date,
                      open: Number((record.open || 0).toFixed(2)),
                      high: Number((record.high || 0).toFixed(2)),
                      low: Number((record.low || 0).toFixed(2)),
                      close: Number((record.close || 0).toFixed(2)),
                    },
                  })

                  processed++
                } catch (error) {
                  console.error(
                    `❌ Erro ao salvar registro para ${ticker}:`,
                    error
                  )
                  errors++
                }
              }
            },
            {
              maxWait: 10000, // 10 segundos
              timeout: 20000, // 20 segundos
            }
          )

          // Pequeno delay entre mini-lotes
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`❌ Erro no mini-lote para ${ticker}:`, error)
          errors += miniLot.length
        }
      }

      loadingStatus.results.successful.push({
        ticker,
        name,
        currency,
        market,
        yahooTicker,
        records: {
          found: historical.length,
          processed,
          errors,
        },
        period: {
          start: startDate.toISOString().split("T")[0],
          end: endDate.toISOString().split("T")[0],
        },
      })

      loadingStatus.results.totalRecords += processed
      loadingStatus.processedAssets++

      console.log(
        `✅ ${ticker}: ${processed} registros salvos (${errors} erros)`
      )
    } catch (error: unknown) {
      console.error(`❌ Erro ao processar ${ticker}:`, error.message)

      loadingStatus.results.failed.push({
        ticker,
        name,
        currency,
        market,
        yahooTicker,
        error: error.message,
        details: error.name || "Unknown Error",
      })

      loadingStatus.errors.push(`${ticker}: ${error.message}`)
      loadingStatus.processedAssets++
    }

    // Delay entre ativos para não sobrecarregar a API do Yahoo
    if (i < assets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 segundos
    }
  }

  // Finalizar
  loadingStatus.isRunning = false
  loadingStatus.progress = 100
  loadingStatus.currentAsset = ""

  const endTime = new Date()
  const duration = endTime.getTime() - (loadingStatus.startTime?.getTime() || 0)

  console.log(`🎉 Carregamento de 20 anos concluído!`)
  console.log(`✅ Sucessos: ${loadingStatus.results.successful.length}`)
  console.log(`❌ Falhas: ${loadingStatus.results.failed.length}`)
  console.log(`📊 Total de registros: ${loadingStatus.results.totalRecords}`)
  console.log(`⏱️ Duração: ${Math.round(duration / 1000)}s`)
}

// DELETE - Parar o carregamento
export async function DELETE(req: NextRequest) {
  if (!loadingStatus.isRunning) {
    return NextResponse.json(
      {
        error: "Nenhum carregamento em andamento",
        status: loadingStatus,
      },
      { status: 400 }
    )
  }

  loadingStatus.isRunning = false
  console.log("⏹️ Carregamento cancelado pelo usuário")

  return NextResponse.json({
    success: true,
    message: "Carregamento cancelado",
    status: loadingStatus,
  })
}
