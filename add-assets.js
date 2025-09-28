const fetch = require('node-fetch')

const assets = [
  // Ativos brasileiros (B3)
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

  // Ativos americanos
  { ticker: 'AAPL', name: 'Apple Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'TSLA', name: 'Tesla Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'META', name: 'Meta Platforms Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'NFLX', name: 'Netflix Inc.', currency: 'USD', market: 'NASDAQ' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', currency: 'USD', market: 'NYSE' },
  { ticker: 'V', name: 'Visa Inc.', currency: 'USD', market: 'NYSE' }
]

async function addAssets() {
  const baseUrl = 'http://localhost:3000'

  console.log('🌱 Adicionando ativos ao banco...')

  for (const asset of assets) {
    try {
      const response = await fetch(`${baseUrl}/api/admin/add-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset)
      })

      if (response.ok) {
        console.log(`✅ ${asset.ticker} adicionado`)
      } else {
        console.log(`❌ Erro ao adicionar ${asset.ticker}: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Erro ao adicionar ${asset.ticker}:`, error.message)
    }
  }

  console.log('📊 Processo concluído!')
}

addAssets()