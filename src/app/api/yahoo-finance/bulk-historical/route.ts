import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import yahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      currency, // 'BRL', 'USD', ou null para todos
      historicalDays = 30,
      replaceExisting = false
    } = body

    console.log(`🚀 Iniciando captura otimizada em lote - ${historicalDays} dias, moeda: ${currency || 'todas'}`)

    const startTime = new Date().toISOString()

    // Buscar ativos da base de dados
    const whereClause = currency ? { currency } : {}
    const assets = await prisma.asset.findMany({
      where: whereClause,
      select: {
        ticker: true,
        name: true,
        currency: true,
        market: true
      }
    })

    if (assets.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No assets found",
        filter: { currency }
      })
    }

    console.log(`📊 Encontrados ${assets.length} ativos para atualizar`)

    // Converter tickers para formato Yahoo Finance
    const convertTickerForYahoo = (ticker: string): string => {
      if (ticker.match(/[A-Z]{4}[0-9]{1,2}/)) {
        return `${ticker}.SA`
      }
      return ticker
    }

    // Preparar lista de tickers para Yahoo Finance
    const yahooTickers = assets.map(asset => convertTickerForYahoo(asset.ticker))
    const tickerMap = new Map()
    assets.forEach((asset, index) => {
      tickerMap.set(yahooTickers[index], asset.ticker)
    })

    console.log(`📡 Tickers para Yahoo Finance:`, yahooTickers.slice(0, 5), '...')

    // Definir período
    const endDate = new Date()
    const startDate = new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000)

    console.log(`📅 Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`)

    let results: {
      successful: any[]
      failed: any[]
      totalRecords: number
    } = {
      successful: [] as any[],
      failed: [] as any[],
      totalRecords: 0
    }

    try {
      // TÉCNICA OTIMIZADA BASEADA NO PYTHON: Processar em lotes menores mas de forma mais eficiente
      console.log('🔥 Aplicando técnica otimizada inspirada no arquivo Python')

      // Para downloads grandes (20 anos), processar em lotes ainda menores para SQLite
      const batchSize = historicalDays > 3650 ? 2 : 8 // Para 20 anos, usar lotes de apenas 2 ativos

      for (let i = 0; i < yahooTickers.length; i += batchSize) {
        const tickerBatch = yahooTickers.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(yahooTickers.length / batchSize)

        console.log(`📦 Lote ${batchNumber}/${totalBatches}: processando ${tickerBatch.length} ativos`)

        // Processar este lote em paralelo usando Promise.allSettled para robustez
        const batchResults = await Promise.allSettled(
          tickerBatch.map(async (yahooTicker) => {
            const originalTicker = tickerMap.get(yahooTicker)
            const asset = assets.find(a => a.ticker === originalTicker)

            if (!asset) {
              throw new Error(`Asset não encontrado: ${yahooTicker}`)
            }

            console.log(`  📡 Baixando ${yahooTicker}...`)

            // Usar a biblioteca yfinance2 de forma otimizada
            const historical = await yahooFinance.historical(yahooTicker, {
              period1: startDate,
              period2: endDate,
              interval: '1d'
              // Removido events: {} pois causava erro na biblioteca
            })

            if (!historical || historical.length === 0) {
              throw new Error(`Sem dados históricos para ${yahooTicker}`)
            }

            // Se replaceExisting = true, limpar dados existentes
            if (replaceExisting) {
              await prisma.historicalPrice.deleteMany({
                where: { ticker: originalTicker }
              })
              console.log(`  🗑️ Dados antigos de ${originalTicker} removidos`)
            }

            let processed = 0

            // OTIMIZAÇÃO MÁXIMA PARA 20 ANOS: Usar estratégia híbrida mais inteligente
            const recordsToInsert: Array<{
              ticker: string;
              date: string;
              open: number;
              high: number;
              low: number;
              close: number;
            }> = historical.map(record => ({
              ticker: originalTicker,
              date: record.date.toISOString().split('T')[0],
              open: Number((record.open || 0).toFixed(2)),
              high: Number((record.high || 0).toFixed(2)),
              low: Number((record.low || 0).toFixed(2)),
              close: Number((record.close || 0).toFixed(2))
            }))

            if (replaceExisting) {
              // ESTRATÉGIA OTIMIZADA: Usar createMany sempre que possível
              try {
                await prisma.historicalPrice.createMany({
                  data: recordsToInsert
                })
                processed = recordsToInsert.length
                console.log(`  ✅ ${originalTicker}: ${processed} registros inseridos (createMany)`)
              } catch (error) {
                console.log(`  ⚠️ ${originalTicker}: CreateMany falhou, usando estratégia alternativa`)
                // ESTRATÉGIA ALTERNATIVA: Usar transações em lotes menores
                const smallBatchSize = 25 // Lotes muito pequenos para SQLite

                for (let j = 0; j < recordsToInsert.length; j += smallBatchSize) {
                  const smallBatch = recordsToInsert.slice(j, j + smallBatchSize)

                  try {
                    await prisma.$transaction(async (tx) => {
                      for (const record of smallBatch) {
                        await tx.historicalPrice.upsert({
                          where: {
                            ticker_date: {
                              ticker: record.ticker,
                              date: record.date
                            }
                          },
                          update: {
                            open: record.open,
                            high: record.high,
                            low: record.low,
                            close: record.close
                          },
                          create: record
                        })
                        processed++
                      }
                    }, {
                      timeout: 30000 // 30 segundos por transação
                    })

                    // Log de progresso a cada lote
                    if (j % (smallBatchSize * 10) === 0) {
                      console.log(`    📈 ${originalTicker}: ${processed}/${recordsToInsert.length} registros processados...`)
                    }

                  } catch (batchError) {
                    const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown error'
                    console.error(`    ❌ Erro no lote ${j}-${j + smallBatchSize} para ${originalTicker}:`, errorMessage)
                    // Continuar com próximo lote mesmo se um falhar
                  }

                  // Pequeno delay entre lotes para não sobrecarregar SQLite
                  await new Promise(resolve => setTimeout(resolve, 50))
                }
              }
            } else {
              // Para updates incrementais, usar estratégia mais conservadora
              const upsertBatchSize = 20 // Reduzido para SQLite

              for (let j = 0; j < recordsToInsert.length; j += upsertBatchSize) {
                const batch = recordsToInsert.slice(j, j + upsertBatchSize)

                try {
                  await Promise.allSettled(batch.map(async (record) => {
                    await prisma.historicalPrice.upsert({
                      where: {
                        ticker_date: {
                          ticker: record.ticker,
                          date: record.date
                        }
                      },
                      update: {
                        open: record.open,
                        high: record.high,
                        low: record.low,
                        close: record.close
                      },
                      create: record
                    })
                    processed++
                  }))

                  // Delay entre lotes
                  await new Promise(resolve => setTimeout(resolve, 100))

                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                  console.error(`    ❌ Erro no lote de upserts:`, errorMessage)
                }
              }
              console.log(`  ✅ ${originalTicker}: ${processed} registros processados (upserts)`)
            }

            return {
              ticker: originalTicker,
              yahooTicker,
              name: asset.name,
              currency: asset.currency,
              records: {
                found: historical.length,
                processed
              },
              message: `${processed} registros processados`
            }
          })
        )

        // Processar resultados do batch
        batchResults.forEach((result, index) => {
          const yahooTicker = tickerBatch[index]
          const originalTicker = tickerMap.get(yahooTicker)
          const asset = assets.find(a => a.ticker === originalTicker)

          if (result.status === 'fulfilled') {
            results.successful.push(result.value)
            results.totalRecords += result.value.records.processed
          } else {
            results.failed.push({
              ticker: originalTicker,
              yahooTicker,
              name: asset?.name || 'Unknown',
              error: result.reason.message || 'Unknown error',
              details: result.reason.toString()
            })
          }
        })

        // Delay aumentado entre lotes para SQLite processar
        if (i + batchSize < yahooTickers.length) {
          const delay = historicalDays > 3650 ? 8000 : 3000 // 8s para 20 anos, 3s para períodos menores
          console.log(`  ⏱️ Aguardando ${delay}ms para SQLite processar...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

    } catch (downloadError: any) {
      console.error('❌ Erro geral no download otimizado:', downloadError)

      return NextResponse.json({
        success: false,
        error: "Bulk download failed",
        details: downloadError.message
      }, { status: 500 })
    }

    const endTime = new Date().toISOString()
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime()

    console.log(`🎉 Captura otimizada concluída!`)
    console.log(`✅ Sucessos: ${results.successful.length}`)
    console.log(`❌ Falhas: ${results.failed.length}`)
    console.log(`📊 Total de registros: ${results.totalRecords}`)
    console.log(`⚡ Velocidade: ${Math.round(results.totalRecords / (duration / 1000))} registros/segundo`)

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        total: assets.length,
        startTime,
        endTime,
        duration: `${Math.round(duration / 1000)}s`,
        summary: {
          mode: 'bulk-optimized-historical',
          technique: 'Inspirado no método Python com yf.download em lote',
          historicalDays,
          filter: { currency },
          successRate: `${Math.round((results.successful.length / assets.length) * 100)}%`,
          totalRecords: results.totalRecords,
          recordsPerSecond: Math.round(results.totalRecords / (duration / 1000)),
          optimization: `Lotes de ${historicalDays > 3650 ? 3 : 10} ativos processados em paralelo`
        }
      },
      message: `✨ Captura otimizada concluída: ${results.successful.length}/${assets.length} ativos com ${results.totalRecords} registros totais`
    })

  } catch (error) {
    console.error('❌ Erro na API de captura otimizada:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}