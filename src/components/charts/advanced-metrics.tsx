"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Shield, Target, AlertTriangle, PieChart } from "lucide-react"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface Position {
  ticker: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  currentValue: number
  investedAmount: number
  profitLoss: number
  profitLossPercent: number
  currency: "BRL" | "USD"
  sector?: string
  weight?: number
}

interface AdvancedMetricsProps {
  positions: Position[]
  totalValue: number
  totalCost: number
  currency: "BRL" | "USD"
  className?: string
}

export function AdvancedMetrics({
  positions,
  totalValue,
  totalCost,
  currency,
  className = ""
}: AdvancedMetricsProps) {

  const metrics = useMemo(() => {
    if (positions.length === 0) return null

    // Calcular pesos das posições
    const positionsWithWeights = positions.map(pos => ({
      ...pos,
      weight: totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0
    }))

    // Análise de diversificação
    const topPositions = positionsWithWeights
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)

    const top5Weight = topPositions.reduce((sum, pos) => sum + pos.weight, 0)

    // Análise de setores (simulado - em produção viria do banco de dados)
    const sectorAnalysis = positionsWithWeights.reduce((acc, pos) => {
      const sector = pos.sector || 'Outros'
      if (!acc[sector]) {
        acc[sector] = { weight: 0, count: 0 }
      }
      acc[sector].weight += pos.weight
      acc[sector].count += 1
      return acc
    }, {} as Record<string, { weight: number; count: number }>)

    const sectors = Object.entries(sectorAnalysis)
      .sort(([,a], [,b]) => b.weight - a.weight)
      .slice(0, 3)

    // Métricas de risco
    const winnerPositions = positionsWithWeights.filter(pos => pos.profitLoss > 0)
    const loserPositions = positionsWithWeights.filter(pos => pos.profitLoss < 0)

    const winRate = positions.length > 0 ? (winnerPositions.length / positions.length) * 100 : 0

    // Volatilidade simulada baseada na dispersão dos retornos
    const returns = positionsWithWeights.map(pos => pos.profitLossPercent)
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)

    // Sharpe Ratio simplificado (assumindo taxa livre de risco de 10% ao ano)
    const riskFreeRate = 10
    const excessReturn = avgReturn - riskFreeRate
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0

    // Métricas de performance
    const totalReturn = totalValue - totalCost
    const totalReturnPercent = totalCost > 0 ? ((totalValue / totalCost) - 1) * 100 : 0

    // Análise de risco
    const riskLevel = volatility < 15 ? 'BAIXO' : volatility < 25 ? 'MÉDIO' : 'ALTO'
    const riskColor = volatility < 15 ? 'text-green-600' : volatility < 25 ? 'text-yellow-600' : 'text-red-600'

    return {
      positionsWithWeights,
      topPositions,
      top5Weight,
      sectors,
      winRate,
      volatility,
      sharpeRatio,
      totalReturn,
      totalReturnPercent,
      riskLevel,
      riskColor,
      winnerPositions: winnerPositions.length,
      loserPositions: loserPositions.length
    }
  }, [positions, totalValue, totalCost])

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Métricas Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Nenhuma posição disponível para análise
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Performance e Risco */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Retorno Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              metrics.totalReturn >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatPercentage(metrics.totalReturnPercent)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(metrics.totalReturn, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              Nível de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", metrics.riskColor)}>
              {metrics.riskLevel}
            </div>
            <div className="text-sm text-muted-foreground">
              Volatilidade: {metrics.volatility.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.winRate.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {metrics.winnerPositions} ganhos / {metrics.loserPositions} perdas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Índice Sharpe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              metrics.sharpeRatio > 1 ? "text-green-600" :
              metrics.sharpeRatio > 0 ? "text-yellow-600" : "text-red-600"
            )}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Retorno ajustado ao risco
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Concentração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Análise de Concentração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Top 5 Posições</span>
              <span className="text-sm text-muted-foreground">{metrics.top5Weight.toFixed(1)}% da carteira</span>
            </div>
            <Progress value={metrics.top5Weight} className="h-2" />
            <div className={cn(
              "text-xs mt-1",
              metrics.top5Weight > 70 ? "text-red-600" :
              metrics.top5Weight > 50 ? "text-yellow-600" : "text-green-600"
            )}>
              {metrics.top5Weight > 70 ? "Alta concentração" :
               metrics.top5Weight > 50 ? "Concentração moderada" : "Bem diversificado"}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Maiores Posições:</span>
            {metrics.topPositions.map((position, index) => (
              <div key={position.ticker} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <span className="text-sm">{position.ticker}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{position.weight.toFixed(1)}%</div>
                  <div className={cn(
                    "text-xs",
                    position.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercentage(position.profitLossPercent)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise por Setores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Diversificação por Setores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.sectors.length > 0 ? (
            <div className="space-y-3">
              {metrics.sectors.map(([sector, data]) => (
                <div key={sector} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{sector}</span>
                    <span className="text-sm text-muted-foreground">
                      {data.weight.toFixed(1)}% ({data.count} {data.count === 1 ? 'ativo' : 'ativos'})
                    </span>
                  </div>
                  <Progress value={data.weight} className="h-2" />
                </div>
              ))}
              <div className="text-xs text-muted-foreground mt-3">
                💡 Uma boa diversificação mantém cada setor abaixo de 25% da carteira
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Dados de setores não disponíveis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}