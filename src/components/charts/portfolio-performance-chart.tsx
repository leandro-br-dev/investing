"use client"

import { useMemo } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface PortfolioPerformanceData {
  date: string
  totalValue: number
  totalCost: number
  profitLoss: number
  profitLossPercent: number
  brlValue: number
  usdValue: number
}

interface PortfolioPerformanceChartProps {
  data: PortfolioPerformanceData[]
  currency: "BRL" | "USD" | "BOTH"
  title?: string
  className?: string
}

export function PortfolioPerformanceChart({
  data,
  currency = "BOTH",
  title = "Performance da Carteira",
  className = ""
}: PortfolioPerformanceChartProps) {

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedDate: formatDate(item.date, { month: "short", day: "numeric" }),
      totalValueFormatted: item.totalValue,
      profitLossFormatted: item.profitLoss
    }))
  }, [data])

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (data.length === 0) return null

    const latestData = data[data.length - 1]
    const firstData = data[0]

    const totalReturn = latestData.totalValue - latestData.totalCost
    const totalReturnPercent = latestData.totalCost > 0
      ? ((latestData.totalValue / latestData.totalCost) - 1) * 100
      : 0

    const periodReturn = latestData.totalValue - firstData.totalValue
    const periodReturnPercent = firstData.totalValue > 0
      ? ((latestData.totalValue / firstData.totalValue) - 1) * 100
      : 0

    return {
      currentValue: latestData.totalValue,
      totalCost: latestData.totalCost,
      totalReturn,
      totalReturnPercent,
      periodReturn,
      periodReturnPercent,
      isPositive: totalReturn >= 0,
      isPeriodPositive: periodReturn >= 0
    }
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          <p className="text-blue-600">
            Valor Total: {formatCurrency(data.totalValue, currency === "USD" ? "USD" : "BRL")}
          </p>
          <p className="text-gray-600">
            Custo Total: {formatCurrency(data.totalCost, currency === "USD" ? "USD" : "BRL")}
          </p>
          <p className={data.profitLoss >= 0 ? "text-green-600" : "text-red-600"}>
            P&L: {formatCurrency(data.profitLoss, currency === "USD" ? "USD" : "BRL")}
            ({data.profitLossPercent >= 0 ? "+" : ""}{data.profitLossPercent.toFixed(2)}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhum dado de performance disponível
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Valor Atual</div>
              <div className="text-lg font-bold">
                {formatCurrency(stats.currentValue, currency === "USD" ? "USD" : "BRL")}
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Retorno Total</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${
                stats.isPositive ? "text-green-600" : "text-red-600"
              }`}>
                {stats.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {stats.totalReturnPercent >= 0 ? "+" : ""}{stats.totalReturnPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalReturn, currency === "USD" ? "USD" : "BRL")}
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Retorno no Período</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${
                stats.isPeriodPositive ? "text-green-600" : "text-red-600"
              }`}>
                {stats.isPeriodPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {stats.periodReturnPercent >= 0 ? "+" : ""}{stats.periodReturnPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(stats.periodReturn, currency === "USD" ? "USD" : "BRL")}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="formattedDate"
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                interval="preserveStartEnd"
              />
              <YAxis
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => {
                  const formatted = formatCurrency(value, currency === "USD" ? "USD" : "BRL")
                  return formatted.replace(/[R$USD\s]/g, '').trim()
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Área do custo (linha base) */}
              <Area
                type="monotone"
                dataKey="totalCost"
                stroke="#6b7280"
                fillOpacity={1}
                fill="url(#colorCost)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Área do valor atual */}
              <Area
                type="monotone"
                dataKey="totalValueFormatted"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Valor da Carteira</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-gray-500 rounded" style={{ borderStyle: 'dashed' }}></div>
            <span>Custo Investido</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}