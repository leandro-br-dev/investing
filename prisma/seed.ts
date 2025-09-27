import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpar dados existentes
  await prisma.simulationItem.deleteMany()
  await prisma.portfolioItem.deleteMany()
  await prisma.historicalPrice.deleteMany()
  await prisma.simulation.deleteMany()
  await prisma.portfolio.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany()

  // Criar ativos brasileiros (B3)
  const assetsBRL = [
    { ticker: 'PETR4', name: 'Petrobras PN', currency: 'BRL', market: 'B3' },
    { ticker: 'VALE3', name: 'Vale ON', currency: 'BRL', market: 'B3' },
    { ticker: 'ITUB4', name: 'Itaú Unibanco PN', currency: 'BRL', market: 'B3' },
    { ticker: 'BBDC4', name: 'Bradesco PN', currency: 'BRL', market: 'B3' },
    { ticker: 'ABEV3', name: 'Ambev ON', currency: 'BRL', market: 'B3' },
    { ticker: 'WEGE3', name: 'WEG ON', currency: 'BRL', market: 'B3' },
    { ticker: 'MGLU3', name: 'Magazine Luiza ON', currency: 'BRL', market: 'B3' },
    { ticker: 'JBSS3', name: 'JBS ON', currency: 'BRL', market: 'B3' },
    { ticker: 'SUZB3', name: 'Suzano ON', currency: 'BRL', market: 'B3' },
    { ticker: 'RENT3', name: 'Localiza ON', currency: 'BRL', market: 'B3' },
    { ticker: 'LREN3', name: 'Lojas Renner ON', currency: 'BRL', market: 'B3' },
    { ticker: 'RAIL3', name: 'Rumo ON', currency: 'BRL', market: 'B3' },
    { ticker: 'KLBN11', name: 'Klabin Unit', currency: 'BRL', market: 'B3' },
    { ticker: 'RADL3', name: 'Raia Drogasil ON', currency: 'BRL', market: 'B3' },
    { ticker: 'HAPV3', name: 'Hapvida ON', currency: 'BRL', market: 'B3' },
    { ticker: 'CCRO3', name: 'CCR ON', currency: 'BRL', market: 'B3' },
    { ticker: 'GGBR4', name: 'Gerdau PN', currency: 'BRL', market: 'B3' },
    { ticker: 'USIM5', name: 'Usiminas PNA', currency: 'BRL', market: 'B3' },
    { ticker: 'BPAC11', name: 'BTG Pactual Unit', currency: 'BRL', market: 'B3' },
    { ticker: 'SANB11', name: 'Santander Unit', currency: 'BRL', market: 'B3' }
  ]

  // Criar ativos americanos
  const assetsUSD = [
    { ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'TSLA', name: 'Tesla Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'META', name: 'Meta Platforms Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'NFLX', name: 'Netflix Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'ADBE', name: 'Adobe Inc.', currency: 'USD', market: 'NASDAQ' },
    { ticker: 'CRM', name: 'Salesforce Inc.', currency: 'USD', market: 'NYSE' },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', currency: 'USD', market: 'NYSE' },
    { ticker: 'BAC', name: 'Bank of America Corp', currency: 'USD', market: 'NYSE' },
    { ticker: 'WMT', name: 'Walmart Inc.', currency: 'USD', market: 'NYSE' },
    { ticker: 'DIS', name: 'The Walt Disney Company', currency: 'USD', market: 'NYSE' },
    { ticker: 'KO', name: 'The Coca-Cola Company', currency: 'USD', market: 'NYSE' },
    { ticker: 'PFE', name: 'Pfizer Inc.', currency: 'USD', market: 'NYSE' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', currency: 'USD', market: 'NYSE' },
    { ticker: 'V', name: 'Visa Inc.', currency: 'USD', market: 'NYSE' },
    { ticker: 'MA', name: 'Mastercard Inc.', currency: 'USD', market: 'NYSE' },
    { ticker: 'UNH', name: 'UnitedHealth Group Inc.', currency: 'USD', market: 'NYSE' }
  ]

  // Inserir ativos
  console.log('📊 Criando ativos brasileiros...')
  for (const asset of assetsBRL) {
    await prisma.asset.create({ data: asset })
  }

  console.log('🇺🇸 Criando ativos americanos...')
  for (const asset of assetsUSD) {
    await prisma.asset.create({ data: asset })
  }

  // Criar dados históricos de exemplo (últimos 30 dias)
  console.log('📈 Criando dados históricos de exemplo...')

  const now = new Date()
  const sampleAssets = ['PETR4', 'AAPL', 'VALE3', 'MSFT']

  for (const ticker of sampleAssets) {
    let basePrice = ticker.includes('4') || ticker.includes('3') ? 30 : 150 // BRL vs USD base

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      // Simular variação de preço
      const variation = (Math.random() - 0.5) * 0.1 // +/- 5%
      basePrice = basePrice * (1 + variation)

      const high = basePrice * (1 + Math.random() * 0.05)
      const low = basePrice * (1 - Math.random() * 0.05)
      const close = low + (high - low) * Math.random()

      await prisma.historicalPrice.create({
        data: {
          ticker,
          date: date.toISOString().split('T')[0],
          open: Number(basePrice.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2))
        }
      })

      basePrice = close
    }
  }

  console.log('✅ Seed concluído com sucesso!')
  console.log(`📊 ${assetsBRL.length + assetsUSD.length} ativos criados`)
  console.log(`📈 ${sampleAssets.length * 30} registros históricos criados`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })