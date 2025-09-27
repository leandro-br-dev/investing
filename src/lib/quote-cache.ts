interface CachedQuote {
  ticker: string
  data: any
  timestamp: number
  expiresAt: number
}

interface CacheConfig {
  quoteTTL: number // TTL para cotações em segundos
  maxSize: number // Máximo de items no cache
}

class QuoteCache {
  private cache = new Map<string, CachedQuote>()
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      quoteTTL: config.quoteTTL || 300, // 5 minutos por padrão
      maxSize: config.maxSize || 500  // 500 items por padrão
    }
  }

  // Gerar chave do cache
  private getCacheKey(ticker: string, type: 'quote' | 'historical' = 'quote'): string {
    return `${type}:${ticker.toUpperCase()}`
  }

  // Verificar se o cache expirou
  private isExpired(cached: CachedQuote): boolean {
    return Date.now() > cached.expiresAt
  }

  // Limpar cache expirado
  private cleanExpired(): void {
    const now = Date.now()
    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (now > cached.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  // Limpar cache por tamanho (LRU - remove os mais antigos)
  private evictBySize(): void {
    if (this.cache.size <= this.config.maxSize) return

    // Ordenar por timestamp (mais antigos primeiro)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    // Remover 20% dos mais antigos
    const toRemove = Math.ceil(this.cache.size * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  // Buscar cotação do cache
  get(ticker: string): any | null {
    const key = this.getCacheKey(ticker)
    const cached = this.cache.get(key)

    if (!cached) return null
    if (this.isExpired(cached)) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  // Salvar cotação no cache
  set(ticker: string, data: any, customTTL?: number): void {
    const key = this.getCacheKey(ticker)
    const ttl = customTTL || this.config.quoteTTL
    const now = Date.now()

    const cached: CachedQuote = {
      ticker: ticker.toUpperCase(),
      data,
      timestamp: now,
      expiresAt: now + (ttl * 1000)
    }

    this.cache.set(key, cached)

    // Limpeza preventiva
    if (this.cache.size % 50 === 0) {
      this.cleanExpired()
      this.evictBySize()
    }
  }

  // Invalidar cache de um ticker específico
  invalidate(ticker: string): boolean {
    const key = this.getCacheKey(ticker)
    return this.cache.delete(key)
  }

  // Invalidar todo o cache
  clear(): void {
    this.cache.clear()
  }

  // Obter estatísticas do cache
  getStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0

    for (const cached of Array.from(this.cache.values())) {
      if (now > cached.expiresAt) {
        expired++
      } else {
        valid++
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      maxSize: this.config.maxSize,
      hitRatio: valid / (valid + expired) || 0
    }
  }

  // Verificar se existem cotações recentes (para determinar se o mercado está aberto)
  hasRecentData(maxAgeMinutes: number = 30): boolean {
    const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000)

    for (const cached of Array.from(this.cache.values())) {
      if (cached.timestamp > cutoff) {
        return true
      }
    }

    return false
  }

  // Buscar múltiplas cotações do cache
  getMultiple(tickers: string[]): { [ticker: string]: any } {
    const result: { [ticker: string]: any } = {}

    for (const ticker of tickers) {
      const data = this.get(ticker)
      if (data) {
        result[ticker] = data
      }
    }

    return result
  }

  // Verificar se o ticker está no cache e é válido
  has(ticker: string): boolean {
    return this.get(ticker) !== null
  }
}

// Singleton para cache global
const globalQuoteCache = new QuoteCache({
  quoteTTL: 300,    // 5 minutos para cotações
  maxSize: 1000     // 1000 cotações no máximo
})

export { QuoteCache, globalQuoteCache }

// Utilitários para cache de dados históricos em memória (para operações rápidas)
interface HistoricalCacheEntry {
  ticker: string
  data: any[]
  period: string
  timestamp: number
  expiresAt: number
}

class HistoricalCache {
  private cache = new Map<string, HistoricalCacheEntry>()
  private readonly TTL = 3600 * 1000 // 1 hora

  private getCacheKey(ticker: string, days: number): string {
    return `hist:${ticker.toUpperCase()}:${days}d`
  }

  get(ticker: string, days: number): any[] | null {
    const key = this.getCacheKey(ticker, days)
    const cached = this.cache.get(key)

    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) this.cache.delete(key)
      return null
    }

    return cached.data
  }

  set(ticker: string, days: number, data: any[]): void {
    const key = this.getCacheKey(ticker, days)
    const now = Date.now()

    this.cache.set(key, {
      ticker: ticker.toUpperCase(),
      data,
      period: `${days}d`,
      timestamp: now,
      expiresAt: now + this.TTL
    })
  }

  invalidate(ticker: string): number {
    let count = 0
    for (const [key] of Array.from(this.cache.entries())) {
      if (key.includes(`:${ticker.toUpperCase()}:`)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.cache.clear()
  }
}

const globalHistoricalCache = new HistoricalCache()

export { HistoricalCache, globalHistoricalCache }