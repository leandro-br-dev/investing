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
          "defaultCurrency" TEXT NOT NULL DEFAULT 'BRL',
          "theme" TEXT NOT NULL DEFAULT 'system',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        );
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