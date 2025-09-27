"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
// Removed unused recharts imports

interface AssetChartModalProps {
  isOpen: boolean
  onClose: () => void
  asset: {
    ticker: string
    name: string
    currency: string
  } | null
  simulationDate?: string
}

interface PriceData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function AssetChartModal({
  isOpen,
  onClose,
  asset,
  simulationDate,
}: AssetChartModalProps) {
  const [loading, setLoading] = useState(false)
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [minPrice, setMinPrice] = useState<number>(0)
  const [maxPrice, setMaxPrice] = useState<number>(0)

  const fetchPriceData = async () => {
    if (!asset || !simulationDate) return

    setLoading(true)
    try {
      // Calcular data de início (12 meses antes da data da simulação)
      const endDate = new Date(simulationDate)
      const startDate = new Date(endDate)
      startDate.setMonth(startDate.getMonth() - 12)

      const response = await fetch(
        `/api/assets/${encodeURIComponent(asset.ticker)}/prices?startDate=${startDate.toISOString().split("T")[0]}&simulationDate=${endDate.toISOString().split("T")[0]}`
      )

      if (response.ok) {
        const data = await response.json()
        const prices = data.prices || []

        setPriceData(prices)

        if (prices.length > 0) {
          // Preço atual (mais recente)
          setCurrentPrice(prices[prices.length - 1].close)

          // Calcular mínima e máxima no período
          const lows = prices.map((p: PriceData) => p.low)
          const highs = prices.map((p: PriceData) => p.high)
          setMinPrice(Math.min(...lows))
          setMaxPrice(Math.max(...highs))
        }
      }
    } catch (error) {
      console.error("Error fetching price data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && asset) {
      fetchPriceData()
    }
  }, [isOpen, asset, simulationDate, fetchPriceData])

  // Calcular proximidade da mínima e potencial
  const proximity = minPrice > 0 ? (currentPrice / minPrice - 1) * 100 : 0
  const potential = currentPrice > 0 ? (maxPrice / currentPrice - 1) * 100 : 0

  // Gráfico de Candlesticks profissional
  const renderCandlestickChart = () => {
    if (priceData.length === 0) return null

    // Preparar dados para o gráfico
    const chartData = priceData.map((price, index) => ({
      index,
      date: price.date,
      open: Number(price.open),
      close: Number(price.close),
      high: Number(price.high),
      low: Number(price.low),
      volume: Number(price.volume || 0),
      formattedDate: formatDate(price.date, { month: "short", day: "numeric" }),
      isGreen: Number(price.close) >= Number(price.open),
    }))

    // Calcular escala dos preços
    const allPrices = chartData.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const priceRange = maxPrice - minPrice
    const padding = priceRange * 0.1

    // Componente customizado para renderizar candlesticks
    const CandlestickChart = ({ data }: { data: typeof chartData }) => {
      const [hoveredCandle, setHoveredCandle] = useState<
        (typeof chartData)[0] | null
      >(null)
      const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

      const handleMouseMove = (
        event: React.MouseEvent,
        candle: (typeof chartData)[0]
      ) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setMousePos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        })
        setHoveredCandle(candle)
      }

      return (
        <div className="relative w-full h-96">
          <svg viewBox="0 0 1000 400" className="w-full h-full">
            {/* Grid de fundo */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Linhas de referência de preço */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
              const y = 350 - ratio * 300
              const price = minPrice + priceRange * ratio
              return (
                <g key={i}>
                  <line
                    x1="100"
                    y1={y}
                    x2="950"
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                    strokeDasharray="2,2"
                  />
                  <text
                    x="95"
                    y={y + 4}
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.6"
                    textAnchor="end"
                  >
                    {formatCurrency(
                      price,
                      (asset?.currency as "BRL" | "USD") || "USD"
                    )
                      .replace(/[R$USD\s]/g, "")
                      .trim()}
                  </text>
                </g>
              )
            })}

            {/* Candlesticks */}
            {data.map((candle, index) => {
              const x = 100 + index * (850 / data.length)
              const candleWidth = Math.max(3, (850 / data.length) * 0.7)

              // Calcular posições Y baseadas nos preços
              const highY =
                30 +
                ((maxPrice + padding - candle.high) /
                  (priceRange + 2 * padding)) *
                  320
              const lowY =
                30 +
                ((maxPrice + padding - candle.low) /
                  (priceRange + 2 * padding)) *
                  320
              const openY =
                30 +
                ((maxPrice + padding - candle.open) /
                  (priceRange + 2 * padding)) *
                  320
              const closeY =
                30 +
                ((maxPrice + padding - candle.close) /
                  (priceRange + 2 * padding)) *
                  320

              const bodyTop = Math.min(openY, closeY)
              const bodyBottom = Math.max(openY, closeY)
              const bodyHeight = bodyBottom - bodyTop

              const isHovered = hoveredCandle?.index === candle.index
              const color = candle.isGreen ? "#10b981" : "#ef4444"
              const strokeColor = candle.isGreen ? "#059669" : "#dc2626"

              return (
                <g key={index}>
                  {/* Linha superior (high to body) */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={highY}
                    x2={x + candleWidth / 2}
                    y2={bodyTop}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? "2" : "1"}
                    opacity={isHovered ? 1 : 0.8}
                  />

                  {/* Linha inferior (body to low) */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={bodyBottom}
                    x2={x + candleWidth / 2}
                    y2={lowY}
                    stroke={strokeColor}
                    strokeWidth={isHovered ? "2" : "1"}
                    opacity={isHovered ? 1 : 0.8}
                  />

                  {/* Corpo da vela */}
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(1, bodyHeight)}
                    fill={
                      candle.isGreen
                        ? isHovered
                          ? "#059669"
                          : color
                        : "transparent"
                    }
                    stroke={strokeColor}
                    strokeWidth={isHovered ? "2" : "1"}
                    opacity={isHovered ? 1 : 0.8}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseMove(e, candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                  />

                  {/* Area invisível para hover melhorado */}
                  <rect
                    x={x - 5}
                    y={highY - 5}
                    width={candleWidth + 10}
                    height={lowY - highY + 10}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseMove(e, candle)}
                    onMouseMove={(e) => handleMouseMove(e, candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                  />
                </g>
              )
            })}

            {/* Eixo X com datas */}
            {data
              .filter((_, i) => i % Math.ceil(data.length / 8) === 0)
              .map((candle, index) => {
                const x = 80 + data.indexOf(candle) * (840 / data.length)
                return (
                  <text
                    key={index}
                    x={x + 840 / data.length / 2}
                    y={385}
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.6"
                    textAnchor="middle"
                  >
                    {candle.formattedDate}
                  </text>
                )
              })}
          </svg>

          {/* Tooltip customizado */}
          {hoveredCandle && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: Math.min(mousePos.x + 10, 600),
                top: Math.max(mousePos.y - 100, 10),
              }}
            >
              <div className="bg-background border rounded-lg p-3 shadow-lg max-w-xs">
                <p className="font-medium mb-2">
                  {formatDate(hoveredCandle.date)}
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    Abertura:{" "}
                    <span className="font-medium">
                      {formatCurrency(
                        hoveredCandle.open,
                        (asset?.currency as "BRL" | "USD") || "USD"
                      )}
                    </span>
                  </p>
                  <p className="text-red-600">
                    Máxima:{" "}
                    <span className="font-medium">
                      {formatCurrency(
                        hoveredCandle.high,
                        (asset?.currency as "BRL" | "USD") || "USD"
                      )}
                    </span>
                  </p>
                  <p className="text-blue-600">
                    Mínima:{" "}
                    <span className="font-medium">
                      {formatCurrency(
                        hoveredCandle.low,
                        (asset?.currency as "BRL" | "USD") || "USD"
                      )}
                    </span>
                  </p>
                  <p
                    className={
                      hoveredCandle.isGreen ? "text-green-600" : "text-red-600"
                    }
                  >
                    Fechamento:{" "}
                    <span className="font-medium">
                      {formatCurrency(
                        hoveredCandle.close,
                        (asset?.currency as "BRL" | "USD") || "USD"
                      )}
                    </span>
                  </p>
                  <p
                    className={`text-sm ${hoveredCandle.isGreen ? "text-green-600" : "text-red-600"}`}
                  >
                    Variação:{" "}
                    {(
                      ((hoveredCandle.close - hoveredCandle.open) /
                        hoveredCandle.open) *
                      100
                    ).toFixed(2)}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h4 className="text-lg font-medium">
            Gráfico de Candlesticks (12 meses)
          </h4>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          Período: {formatDate(priceData[0]?.date)} até{" "}
          {formatDate(priceData[priceData.length - 1]?.date)}
        </div>

        <CandlestickChart data={chartData} />

        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded border border-green-700"></div>
            <span>Vela de Alta (Fechamento &gt; Abertura)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-red-500 rounded"></div>
            <span>Vela de Baixa (Fechamento &lt; Abertura)</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {asset?.ticker} - {asset?.name}
          </DialogTitle>
          <DialogDescription>
            Visualize o histórico de preços e análise técnica do ativo
            selecionado
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando dados do ativo...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Métricas principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">Preço Atual</div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    currentPrice,
                    (asset?.currency as "BRL" | "USD") || "USD"
                  )}
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">
                  Proximidade Mínima
                </div>
                <div
                  className={cn(
                    "text-lg font-bold",
                    proximity <= 10
                      ? "text-green-600"
                      : proximity <= 25
                        ? "text-yellow-600"
                        : "text-red-600"
                  )}
                >
                  +{proximity.toFixed(2)}%
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">Potencial</div>
                <div className="text-lg font-bold text-green-600">
                  +{potential.toFixed(2)}%
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">
                  Data Simulação
                </div>
                <div className="text-lg font-bold">
                  {formatDate(simulationDate || "")}
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">Volume</div>
                <div className="text-lg font-bold text-blue-600">
                  {priceData.length > 0
                    ? (
                        priceData[priceData.length - 1].volume || 0
                      ).toLocaleString()
                    : "N/A"}
                </div>
              </div>

              <div className="bg-card p-3 rounded-lg border">
                <div className="text-sm text-muted-foreground">Amplitude</div>
                <div className="text-lg font-bold text-purple-600">
                  {maxPrice > 0 && minPrice > 0
                    ? (((maxPrice - minPrice) / minPrice) * 100).toFixed(1) +
                      "%"
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* Range de preços */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Mínima (12M)</span>
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    minPrice,
                    (asset?.currency as "BRL" | "USD") || "USD"
                  )}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Máxima (12M)</span>
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    maxPrice,
                    (asset?.currency as "BRL" | "USD") || "USD"
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico de Candlesticks */}
            {renderCandlestickChart()}

            {/* Informações adicionais */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">
                Análise de Oportunidade
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  • <strong>Proximidade da Mínima:</strong> Quanto menor, melhor
                  a oportunidade de compra
                </p>
                <p>
                  • <strong>Potencial de Retorno:</strong> Baseado na máxima
                  histórica dos últimos 12 meses
                </p>
                <p>
                  • <strong>Data da Simulação:</strong> Preços baseados na data
                  atual da simulação
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end">
              <Button onClick={onClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
