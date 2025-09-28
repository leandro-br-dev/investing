// Execute este script no console do navegador (F12) na sua aplicação
// Cole todo o código abaixo no console e pressione Enter

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
];

async function addAssetsViaBrowser() {
  console.log('🌱 Iniciando seed via browser...');

  let added = 0;
  let errors = 0;

  for (const asset of assets) {
    try {
      const response = await fetch('/api/admin/add-asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset)
      });

      if (response.ok) {
        console.log(`✅ ${asset.ticker} adicionado`);
        added++;
      } else {
        console.log(`❌ Erro ao adicionar ${asset.ticker}: ${response.status}`);
        errors++;
      }
    } catch (error) {
      console.log(`❌ Erro ao adicionar ${asset.ticker}:`, error.message);
      errors++;
    }

    // Pequena pausa para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`📊 Processo concluído! ${added} ativos adicionados, ${errors} erros`);

  // Agora vamos adicionar alguns dados históricos para 4 ativos principais
  console.log('📈 Adicionando dados históricos de exemplo...');

  const sampleTickers = ['PETR4', 'AAPL', 'VALE3', 'MSFT'];

  for (const ticker of sampleTickers) {
    try {
      const response = await fetch('/api/yahoo-finance/historical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          period: '1mo' // Últimos 30 dias
        })
      });

      if (response.ok) {
        console.log(`📈 Dados históricos de ${ticker} adicionados`);
      } else {
        console.log(`⚠️ Não foi possível adicionar dados históricos de ${ticker}`);
      }
    } catch (error) {
      console.log(`⚠️ Erro ao adicionar dados históricos de ${ticker}:`, error.message);
    }
  }

  console.log('🎉 Seed completo! Recarregue a página e teste a funcionalidade de atualização.');
}

// Executar
addAssetsViaBrowser();