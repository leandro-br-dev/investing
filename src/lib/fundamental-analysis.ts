import { prisma } from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"

interface FundamentalData {
  ticker: string
  price: number
  marketCap?: number
  pe?: number
  pb?: number
  roe?: number
  roa?: number
  dividendYield?: number
  debtToEquity?: number
  currentRatio?: number
  priceToSales?: number
  evEbitda?: number
  revenue?: number
  netIncome?: number
  totalAssets?: number
  totalEquity?: number
  totalDebt?: number
}

interface AnalysisResult {
  valueScore: number
  qualityScore: number
  growthScore: number
  dividendScore: number
  overallScore: number
  recommendation: "BUY" | "HOLD" | "SELL"
  targetPrice: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  grahamNumber?: number
  peterLynchFairValue?: number
  strengths: string[]
  weaknesses: string[]
  catalysts: string[]
  risks: string[]
}

export class FundamentalAnalysisEngine {
  /**
   * Realiza análise fundamentalista completa de um ativo
   */
  static async analyzeAsset(ticker: string): Promise<AnalysisResult | null> {
    try {
      // Buscar dados do ativo
      const asset = await prisma.asset.findUnique({
        where: { ticker },
        include: {
          historicalPrices: {
            orderBy: { date: "desc" },
            take: 252, // ~1 ano de dados
          },
        },
      })

      if (!asset || asset.historicalPrices.length === 0) {
        return null
      }

      const currentPrice = Number(asset.historicalPrices[0].close)

      const fundamentalData: FundamentalData = {
        ticker,
        price: currentPrice,
        marketCap: asset.marketCap ? Number(asset.marketCap) : undefined,
        pe: asset.pe ? Number(asset.pe) : undefined,
        pb: asset.pb ? Number(asset.pb) : undefined,
        roe: asset.roe ? Number(asset.roe) : undefined,
        roa: asset.roa ? Number(asset.roa) : undefined,
        dividendYield: asset.dividendYield
          ? Number(asset.dividendYield)
          : undefined,
        debtToEquity: asset.debtToEquity
          ? Number(asset.debtToEquity)
          : undefined,
        currentRatio: asset.currentRatio
          ? Number(asset.currentRatio)
          : undefined,
        priceToSales: asset.priceToSales
          ? Number(asset.priceToSales)
          : undefined,
        evEbitda: asset.evEbitda ? Number(asset.evEbitda) : undefined,
        revenue: asset.revenue ? Number(asset.revenue) : undefined,
        netIncome: asset.netIncome ? Number(asset.netIncome) : undefined,
        totalAssets: asset.totalAssets ? Number(asset.totalAssets) : undefined,
        totalEquity: asset.totalEquity ? Number(asset.totalEquity) : undefined,
        totalDebt: asset.totalDebt ? Number(asset.totalDebt) : undefined,
      }

      // Realizar análises
      const analysis = this.performAnalysis(
        fundamentalData,
        asset.historicalPrices
      )

      // Salvar resultado no banco
      await this.saveAnalysis(ticker, analysis, fundamentalData)

      return analysis
    } catch (error) {
      console.error(`Erro na análise fundamentalista de ${ticker}:`, error)
      return null
    }
  }

  /**
   * Calcula scores e recomendações baseados nos dados fundamentalistas
   */
  private static performAnalysis(
    data: FundamentalData,
    historicalPrices: unknown[]
  ): AnalysisResult {
    const scores = {
      valueScore: this.calculateValueScore(data),
      qualityScore: this.calculateQualityScore(data),
      growthScore: this.calculateGrowthScore(data, historicalPrices),
      dividendScore: this.calculateDividendScore(data),
    }

    const overallScore = Math.round(
      scores.valueScore * 0.3 +
        scores.qualityScore * 0.25 +
        scores.growthScore * 0.25 +
        scores.dividendScore * 0.2
    )

    const recommendation = this.getRecommendation(overallScore, data)
    const riskLevel = this.getRiskLevel(data)
    const targetPrice = this.calculateTargetPrice(data)

    // Análises específicas de Value Investing
    const grahamNumber = this.calculateGrahamNumber(data)
    const peterLynchFairValue = this.calculatePeterLynchFairValue(data)

    // Análise qualitativa
    const qualitativeAnalysis = this.performQualitativeAnalysis(data, scores)

    return {
      ...scores,
      overallScore,
      recommendation,
      targetPrice,
      riskLevel,
      grahamNumber,
      peterLynchFairValue,
      ...qualitativeAnalysis,
    }
  }

  /**
   * Calcula score de valor (P/E, P/VP, P/Vendas, etc.)
   */
  private static calculateValueScore(data: FundamentalData): number {
    let score = 50 // Score base
    let factors = 0

    // P/E análise
    if (data.pe !== undefined) {
      factors++
      if (data.pe < 10) score += 15
      else if (data.pe < 15) score += 10
      else if (data.pe < 20) score += 5
      else if (data.pe > 30) score -= 15
      else if (data.pe > 25) score -= 10
    }

    // P/VP análise
    if (data.pb !== undefined) {
      factors++
      if (data.pb < 1) score += 15
      else if (data.pb < 1.5) score += 10
      else if (data.pb < 2) score += 5
      else if (data.pb > 3) score -= 10
    }

    // P/Vendas análise
    if (data.priceToSales !== undefined) {
      factors++
      if (data.priceToSales < 1) score += 10
      else if (data.priceToSales < 2) score += 5
      else if (data.priceToSales > 5) score -= 10
    }

    // EV/EBITDA análise
    if (data.evEbitda !== undefined) {
      factors++
      if (data.evEbitda < 8) score += 10
      else if (data.evEbitda < 12) score += 5
      else if (data.evEbitda > 20) score -= 10
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de qualidade (ROE, ROA, Dívida, etc.)
   */
  private static calculateQualityScore(data: FundamentalData): number {
    let score = 50
    let factors = 0

    // ROE análise
    if (data.roe !== undefined) {
      factors++
      if (data.roe > 20) score += 15
      else if (data.roe > 15) score += 10
      else if (data.roe > 10) score += 5
      else if (data.roe < 5) score -= 10
    }

    // ROA análise
    if (data.roa !== undefined) {
      factors++
      if (data.roa > 10) score += 10
      else if (data.roa > 5) score += 5
      else if (data.roa < 2) score -= 5
    }

    // Dívida/Patrimônio análise
    if (data.debtToEquity !== undefined) {
      factors++
      if (data.debtToEquity < 0.3) score += 15
      else if (data.debtToEquity < 0.5) score += 10
      else if (data.debtToEquity < 1) score += 5
      else if (data.debtToEquity > 2) score -= 15
    }

    // Liquidez corrente análise
    if (data.currentRatio !== undefined) {
      factors++
      if (data.currentRatio > 2) score += 10
      else if (data.currentRatio > 1.5) score += 5
      else if (data.currentRatio < 1) score -= 15
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de crescimento baseado em dados históricos
   */
  private static calculateGrowthScore(
    data: FundamentalData,
    historicalPrices: unknown[]
  ): number {
    let score = 50

    if (historicalPrices.length < 52) return score // Precisa de pelo menos 1 ano

    // Análise de tendência de preços (últimos 12 meses)
    const currentPrice = Number(historicalPrices[0].close)
    const priceOneYearAgo = Number(
      historicalPrices[Math.min(251, historicalPrices.length - 1)].close
    )

    const priceGrowth =
      ((currentPrice - priceOneYearAgo) / priceOneYearAgo) * 100

    if (priceGrowth > 20) score += 15
    else if (priceGrowth > 10) score += 10
    else if (priceGrowth > 0) score += 5
    else if (priceGrowth < -20) score -= 15
    else if (priceGrowth < -10) score -= 10

    // TODO: Adicionar análise de crescimento de receita e lucros quando tivermos dados históricos

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula score de dividendos
   */
  private static calculateDividendScore(data: FundamentalData): number {
    let score = 50

    if (data.dividendYield !== undefined) {
      if (data.dividendYield > 8) score += 15
      else if (data.dividendYield > 6) score += 10
      else if (data.dividendYield > 4) score += 5
      else if (data.dividendYield < 1) score -= 5
    } else {
      score = 30 // Penalidade por não pagar dividendos
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calcula o Número de Graham
   */
  private static calculateGrahamNumber(
    data: FundamentalData
  ): number | undefined {
    if (!data.netIncome || !data.totalEquity || !data.marketCap)
      return undefined

    const eps = data.netIncome / (data.marketCap / data.price) // Lucro por ação estimado
    const bookValuePerShare = data.totalEquity / (data.marketCap / data.price) // Valor patrimonial por ação estimado

    if (eps <= 0 || bookValuePerShare <= 0) return undefined

    return Math.sqrt(22.5 * eps * bookValuePerShare)
  }

  /**
   * Calcula valor justo pelo método Peter Lynch
   */
  private static calculatePeterLynchFairValue(
    data: FundamentalData
  ): number | undefined {
    if (!data.pe || !data.dividendYield) return undefined

    // Peter Lynch: PEG ratio ideal é 1.0
    // Fair Value = Earnings Growth Rate * Dividend Yield / P/E
    const assumedGrowthRate = 15 // Assumir 15% para empresas de qualidade
    const peterLynchRatio = (assumedGrowthRate + data.dividendYield) / data.pe

    if (peterLynchRatio > 1.5) {
      return data.price * 1.2 // 20% acima do preço atual
    } else if (peterLynchRatio > 1.0) {
      return data.price * 1.1 // 10% acima do preço atual
    } else {
      return data.price * 0.9 // 10% abaixo do preço atual
    }
  }

  /**
   * Determina recomendação baseada no score geral
   */
  private static getRecommendation(
    overallScore: number,
    data: FundamentalData
  ): "BUY" | "HOLD" | "SELL" {
    if (overallScore >= 75) return "BUY"
    if (overallScore >= 60) return "HOLD"
    return "SELL"
  }

  /**
   * Determina nível de risco
   */
  private static getRiskLevel(
    data: FundamentalData
  ): "LOW" | "MEDIUM" | "HIGH" {
    let riskFactors = 0

    // Fatores de alto risco
    if (data.debtToEquity && data.debtToEquity > 1.5) riskFactors++
    if (data.currentRatio && data.currentRatio < 1.2) riskFactors++
    if (data.pe && data.pe > 30) riskFactors++
    if (data.pb && data.pb > 3) riskFactors++

    if (riskFactors >= 3) return "HIGH"
    if (riskFactors >= 1) return "MEDIUM"
    return "LOW"
  }

  /**
   * Calcula preço alvo baseado em múltiplos
   */
  private static calculateTargetPrice(data: FundamentalData): number {
    // Método simples: média de diferentes abordagens
    const targetPrices: number[] = []

    // Abordagem por P/E justo (assumir P/E 15 como justo)
    if (data.netIncome && data.marketCap) {
      const eps = data.netIncome / (data.marketCap / data.price)
      const fairPeTarget = eps * 15
      targetPrices.push(fairPeTarget)
    }

    // Abordagem por P/VP justo (assumir P/VP 1.5 como justo)
    if (data.totalEquity && data.marketCap) {
      const bookValuePerShare = data.totalEquity / (data.marketCap / data.price)
      const fairPbTarget = bookValuePerShare * 1.5
      targetPrices.push(fairPbTarget)
    }

    // Se não conseguiu calcular, usar 10% acima do preço atual como conservador
    if (targetPrices.length === 0) {
      return data.price * 1.1
    }

    // Retornar média dos preços alvo calculados
    return (
      targetPrices.reduce((sum, price) => sum + price, 0) / targetPrices.length
    )
  }

  /**
   * Análise qualitativa
   */
  private static performQualitativeAnalysis(
    data: FundamentalData,
    scores: unknown
  ): {
    strengths: string[]
    weaknesses: string[]
    catalysts: string[]
    risks: string[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const catalysts: string[] = []
    const risks: string[] = []

    // Análise de pontos fortes
    if (data.roe && data.roe > 15)
      strengths.push("Alto retorno sobre patrimônio (ROE > 15%)")
    if (data.pb && data.pb < 1.5)
      strengths.push("Ação negociada abaixo do valor patrimonial")
    if (data.debtToEquity && data.debtToEquity < 0.5)
      strengths.push("Baixo endividamento")
    if (data.dividendYield && data.dividendYield > 5)
      strengths.push("Alto rendimento de dividendos")
    if (data.currentRatio && data.currentRatio > 2)
      strengths.push("Excelente liquidez corrente")

    // Análise de pontos fracos
    if (data.pe && data.pe > 25)
      weaknesses.push("P/E elevado indica possível sobrevalorização")
    if (data.debtToEquity && data.debtToEquity > 1)
      weaknesses.push("Alto endividamento")
    if (data.roe && data.roe < 10)
      weaknesses.push("Baixo retorno sobre patrimônio")
    if (data.currentRatio && data.currentRatio < 1.2)
      weaknesses.push("Liquidez corrente baixa")

    // Catalisadores potenciais
    if (scores.valueScore > 70)
      catalysts.push("Ação subvalorizada com potencial de rerating")
    if (data.dividendYield && data.dividendYield > 6)
      catalysts.push("Alto dividend yield atrai investidores de renda")
    if (scores.qualityScore > 70)
      catalysts.push("Empresa de alta qualidade com fundamentos sólidos")

    // Riscos identificados
    if (data.debtToEquity && data.debtToEquity > 1.5)
      risks.push("Alto endividamento pode limitar crescimento")
    if (data.pe && data.pe > 30)
      risks.push("Múltiplos elevados aumentam risco de correção")
    if (scores.qualityScore < 40) risks.push("Fundamentos fracos da empresa")

    return { strengths, weaknesses, catalysts, risks }
  }

  /**
   * Salva resultado da análise no banco de dados
   */
  private static async saveAnalysis(
    ticker: string,
    analysis: AnalysisResult,
    data: FundamentalData
  ) {
    try {
      await prisma.fundamentalAnalysis.create({
        data: {
          ticker,
          valueScore: analysis.valueScore,
          qualityScore: analysis.qualityScore,
          growthScore: analysis.growthScore,
          dividendScore: analysis.dividendScore,
          overallScore: analysis.overallScore,
          recommendation: analysis.recommendation,
          targetPrice: new Decimal(analysis.targetPrice.toFixed(2)),
          riskLevel: analysis.riskLevel,
          grahamNumber: analysis.grahamNumber
            ? new Decimal(analysis.grahamNumber.toFixed(2))
            : null,
          peterLynchFairValue: analysis.peterLynchFairValue
            ? new Decimal(analysis.peterLynchFairValue.toFixed(2))
            : null,
          strengths: analysis.strengths.join("; "),
          weaknesses: analysis.weaknesses.join("; "),
          catalysts: analysis.catalysts.join("; "),
          risks: analysis.risks.join("; "),
        },
      })

      // Atualizar timestamp da última análise no asset
      await prisma.asset.update({
        where: { ticker },
        data: { lastFundamentalUpdate: new Date() },
      })
    } catch (error) {
      console.error(`Erro ao salvar análise de ${ticker}:`, error)
    }
  }

  /**
   * Obtém última análise de um ativo
   */
  static async getLatestAnalysis(ticker: string) {
    return await prisma.fundamentalAnalysis.findFirst({
      where: { ticker },
      orderBy: { analysisDate: "desc" },
    })
  }

  /**
   * Analisa múltiplos ativos em lote
   */
  static async analyzeBulk(tickers: string[]): Promise<void> {
    console.log(
      `🔍 Iniciando análise fundamentalista em lote para ${tickers.length} ativos`
    )

    for (const ticker of tickers) {
      try {
        console.log(`📊 Analisando ${ticker}...`)
        const result = await this.analyzeAsset(ticker)

        if (result) {
          console.log(
            `✅ ${ticker}: Score ${result.overallScore}/100 - Recomendação: ${result.recommendation}`
          )
        } else {
          console.log(`❌ ${ticker}: Falha na análise`)
        }

        // Pequeno delay para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`❌ Erro ao analisar ${ticker}:`, error)
      }
    }

    console.log(`🎉 Análise em lote concluída`)
  }
}
