import { prisma } from './prisma'

let isInitialized = false

export async function initializeDatabase() {
  if (isInitialized) {
    return
  }

  try {
    // Tentar uma consulta simples para ver se o banco está funcionando
    await prisma.user.findFirst()
    isInitialized = true
    console.log('✅ Banco de dados já inicializado')
  } catch (error) {
    console.log('🔄 Inicializando banco de dados...')

    try {
      // Em ambiente de produção, tenta migrar o banco
      if (process.env.NODE_ENV === 'production') {
        const { execSync } = require('child_process')
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
        console.log('✅ Migrações aplicadas com sucesso')
      } else {
        // Em desenvolvimento, faz push do schema
        const { execSync } = require('child_process')
        execSync('npx prisma db push', { stdio: 'inherit' })
        console.log('✅ Schema aplicado com sucesso')
      }

      isInitialized = true
    } catch (migrationError) {
      console.error('❌ Erro ao inicializar banco:', migrationError)
      throw new Error('Falha na inicialização do banco de dados')
    }
  }
}