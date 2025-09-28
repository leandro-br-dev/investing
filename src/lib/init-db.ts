import { PrismaClient } from '@prisma/client'

let globalPrisma: PrismaClient | undefined
let isInitialized = false

export async function initializeDatabase() {
  if (isInitialized && globalPrisma) {
    return globalPrisma
  }

  try {
    // Configurar DATABASE_URL para usar /tmp na Vercel
    if (process.env.VERCEL) {
      process.env.DATABASE_URL = 'file:/tmp/prod.db'
      console.log('🔄 Configurando banco para Vercel em /tmp')
    }

    // Criar nova instância do Prisma com a URL atualizada
    if (!globalPrisma) {
      globalPrisma = new PrismaClient()
    }

    // Tentar conectar e fazer uma consulta simples
    await globalPrisma.$connect()

    // Tentar uma consulta - se falhar, é porque as tabelas não existem
    try {
      await globalPrisma.user.findFirst()
      console.log('✅ Banco de dados já inicializado')
    } catch (tableError) {
      // Tabelas não existem, aplicar schema usando Prisma
      console.log('📝 Aplicando schema do banco...')
      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "name" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_settings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE,
          "buyPeriodMonths" INTEGER NOT NULL DEFAULT 12,
          "sellPeriodMonths" INTEGER NOT NULL DEFAULT 24,
          "minPurchaseIntervalDays" INTEGER NOT NULL DEFAULT 90,
          "theme" TEXT NOT NULL DEFAULT 'system',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "assets" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "ticker" TEXT NOT NULL UNIQUE,
          "name" TEXT NOT NULL,
          "currency" TEXT NOT NULL,
          "market" TEXT NOT NULL,
          "decimals" INTEGER NOT NULL DEFAULT 2,
          "minLotSize" INTEGER NOT NULL DEFAULT 1,
          "sector" TEXT,
          "industry" TEXT,
          "marketCap" DECIMAL,
          "sharesOutstanding" DECIMAL,
          "pe" DECIMAL,
          "pb" DECIMAL,
          "roe" DECIMAL,
          "roa" DECIMAL,
          "dividendYield" DECIMAL,
          "debtToEquity" DECIMAL,
          "currentRatio" DECIMAL,
          "quickRatio" DECIMAL,
          "priceToSales" DECIMAL,
          "evEbitda" DECIMAL,
          "revenue" DECIMAL,
          "netIncome" DECIMAL,
          "totalAssets" DECIMAL,
          "totalEquity" DECIMAL,
          "totalDebt" DECIMAL,
          "lastFundamentalUpdate" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "historical_prices" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "ticker" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "open" DECIMAL NOT NULL,
          "high" DECIMAL NOT NULL,
          "low" DECIMAL NOT NULL,
          "close" DECIMAL NOT NULL,
          FOREIGN KEY ("ticker") REFERENCES "assets"("ticker"),
          UNIQUE("ticker", "date")
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "historical_prices_ticker_idx" ON "historical_prices"("ticker");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "historical_prices_ticker_date_idx" ON "historical_prices"("ticker", "date");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "portfolios" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL DEFAULT 'Carteira Principal',
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "portfolio_items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "portfolioId" TEXT NOT NULL,
          "ticker" TEXT NOT NULL,
          "quantity" DECIMAL NOT NULL,
          "avgPrice" DECIMAL NOT NULL,
          "currency" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE,
          FOREIGN KEY ("ticker") REFERENCES "assets"("ticker"),
          UNIQUE("portfolioId", "ticker")
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "simulations" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "startDate" TEXT NOT NULL,
          "currentDate" TEXT NOT NULL,
          "initialCashBRL" DECIMAL NOT NULL DEFAULT 0,
          "initialCashUSD" DECIMAL NOT NULL DEFAULT 0,
          "monthlyDepositBRL" DECIMAL NOT NULL DEFAULT 0,
          "monthlyDepositUSD" DECIMAL NOT NULL DEFAULT 0,
          "currentCashBRL" DECIMAL NOT NULL DEFAULT 0,
          "currentCashUSD" DECIMAL NOT NULL DEFAULT 0,
          "realizedProfitBRL" DECIMAL NOT NULL DEFAULT 0,
          "realizedProfitUSD" DECIMAL NOT NULL DEFAULT 0,
          "minPurchaseIntervalDays" INTEGER NOT NULL DEFAULT 90,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "simulation_items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "simulationId" TEXT NOT NULL,
          "ticker" TEXT NOT NULL,
          "quantity" DECIMAL NOT NULL,
          "avgPrice" DECIMAL NOT NULL,
          "currency" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE,
          FOREIGN KEY ("ticker") REFERENCES "assets"("ticker"),
          UNIQUE("simulationId", "ticker")
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "transactions" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "portfolioId" TEXT,
          "simulationId" TEXT,
          "ticker" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "quantity" DECIMAL NOT NULL,
          "price" DECIMAL NOT NULL,
          "totalAmount" DECIMAL NOT NULL,
          "currency" TEXT NOT NULL,
          "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
          FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE,
          FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE,
          FOREIGN KEY ("ticker") REFERENCES "assets"("ticker")
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "transactions_userId_idx" ON "transactions"("userId");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "transactions_portfolioId_idx" ON "transactions"("portfolioId");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "transactions_simulationId_idx" ON "transactions"("simulationId");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "transactions_ticker_idx" ON "transactions"("ticker");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "transactions_executedAt_idx" ON "transactions"("executedAt");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "fundamental_analysis" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "ticker" TEXT NOT NULL,
          "analysisDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "valueScore" INTEGER,
          "qualityScore" INTEGER,
          "growthScore" INTEGER,
          "dividendScore" INTEGER,
          "overallScore" INTEGER,
          "grahamNumber" DECIMAL,
          "peterLynchFairValue" DECIMAL,
          "discountedCashFlow" DECIMAL,
          "bookValue" DECIMAL,
          "sectorPeAvg" DECIMAL,
          "sectorPbAvg" DECIMAL,
          "sectorRoeAvg" DECIMAL,
          "revenueGrowth3Y" DECIMAL,
          "earningsGrowth3Y" DECIMAL,
          "equityGrowth3Y" DECIMAL,
          "recommendation" TEXT,
          "targetPrice" DECIMAL,
          "riskLevel" TEXT,
          "timeHorizon" TEXT,
          "strengths" TEXT,
          "weaknesses" TEXT,
          "catalysts" TEXT,
          "risks" TEXT,
          FOREIGN KEY ("ticker") REFERENCES "assets"("ticker")
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "fundamental_analysis_ticker_idx" ON "fundamental_analysis"("ticker");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "fundamental_analysis_analysisDate_idx" ON "fundamental_analysis"("analysisDate");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "scheduler_logs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "type" TEXT NOT NULL,
          "trigger" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "duration" INTEGER,
          "recordsUpdated" INTEGER,
          "errors" INTEGER,
          "details" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "scheduler_logs_timestamp_idx" ON "scheduler_logs"("timestamp");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "scheduler_logs_type_idx" ON "scheduler_logs"("type");
      `)

      await globalPrisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "scheduler_logs_status_idx" ON "scheduler_logs"("status");
      `)

      console.log('✅ Schema aplicado com sucesso')
    }

    isInitialized = true
    return globalPrisma
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error)
    throw new Error('Falha na inicialização do banco de dados')
  }
}

export async function getPrismaClient() {
  return await initializeDatabase()
}