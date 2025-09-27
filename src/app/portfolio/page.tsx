"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Plus, Loader2, RefreshCw } from "lucide-react"
import { formatCurrency, formatPercentage, getPercentageColor } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { TransactionModal } from "@/components/modals/transaction-modal"
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart"
import { AdvancedMetrics } from "@/components/charts/advanced-metrics"

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
  lastUpdate: string
}

interface PortfolioSummary {
  totalCurrentValue: number
  totalInvested: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  positionsCount: number
  currency: string | null
}

interface PortfolioData {
  positions: Position[]
  summary: PortfolioSummary | null
  portfolioId: string
}

export default function PortfolioPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<"BRL" | "USD">("BRL")
  const [portfolioBRL, setPortfolioBRL] = useState<PortfolioData>({ positions: [], summary: null, portfolioId: "" })
  const [portfolioUSD, setPortfolioUSD] = useState<PortfolioData>({ positions: [], summary: null, portfolioId: "" })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [transactionModal, setTransactionModal] = useState<{
    isOpen: boolean
    mode: "buy" | "sell"
    ticker?: string
    currentPosition?: {
      quantity: number
      ticker: string
    }
  }>({ isOpen: false, mode: "buy" })
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [loadingPerformance, setLoadingPerformance] = useState(false)

  const fetchPortfolioData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [brlData, usdData] = await Promise.all([
        fetch('/api/portfolio?currency=BRL').then(r => r.json()),
        fetch('/api/portfolio?currency=USD').then(r => r.json())
      ])

      setPortfolioBRL(brlData)
      setPortfolioUSD(usdData)
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchPerformanceData = async (currency: "BRL" | "USD") => {
    setLoadingPerformance(true)
    try {
      const response = await fetch(`/api/portfolio/performance?currency=${currency}&days=30`)
      const data = await response.json()

      if (data.success) {
        setPerformanceData(data.data)
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      setPerformanceData([])
    } finally {
      setLoadingPerformance(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchPortfolioData()
    }
  }, [session])

  useEffect(() => {
    if (session) {
      fetchPerformanceData(activeTab)
    }
  }, [session, activeTab])

  const currentPortfolio = activeTab === "BRL" ? portfolioBRL.positions : portfolioUSD.positions
  const currentSummary = activeTab === "BRL" ? portfolioBRL.summary : portfolioUSD.summary
  const currency = activeTab

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">
            Gestão e acompanhamento de posições
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => fetchPortfolioData(true)} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setTransactionModal({ isOpen: true, mode: "buy" })}>
            <Plus className="mr-2 h-4 w-4" />
            New Position
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🇧🇷</span>
              Portfolio BRL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioBRL.summary?.totalCurrentValue || 0, "BRL")}
              </div>
              <div className={cn("text-sm", getPercentageColor(portfolioBRL.summary?.totalProfitLoss || 0))}>
                {(portfolioBRL.summary?.totalProfitLoss || 0) > 0 ? "+" : ""}{formatCurrency(portfolioBRL.summary?.totalProfitLoss || 0, "BRL")}
                ({formatPercentage(portfolioBRL.summary?.totalProfitLossPercent || 0)})
              </div>
              <div className="text-xs text-muted-foreground">
                {portfolioBRL.summary?.positionsCount || 0} posições
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🇺🇸</span>
              Portfolio USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioUSD.summary?.totalCurrentValue || 0, "USD")}
              </div>
              <div className={cn("text-sm", getPercentageColor(portfolioUSD.summary?.totalProfitLoss || 0))}>
                {(portfolioUSD.summary?.totalProfitLoss || 0) > 0 ? "+" : ""}{formatCurrency(portfolioUSD.summary?.totalProfitLoss || 0, "USD")}
                ({formatPercentage(portfolioUSD.summary?.totalProfitLossPercent || 0)})
              </div>
              <div className="text-xs text-muted-foreground">
                {portfolioUSD.summary?.positionsCount || 0} posições
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Performance Chart */}
      <PortfolioPerformanceChart
        data={performanceData}
        currency={activeTab}
        title={`Performance da Carteira ${activeTab} (30 dias)`}
        className="mb-6"
      />

      {/* Currency Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("BRL")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "BRL"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          🇧🇷 Portfólio BRL
        </button>
        <button
          onClick={() => setActiveTab("USD")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "USD"
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          🇺🇸 Portfólio USD
        </button>
      </div>

      {/* Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Posições - {currency}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {formatCurrency(currentSummary?.totalCurrentValue || 0, currency)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {currentPortfolio.map((position, index) => (
              <Card key={index} variant="outline">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{position.ticker}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {position.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {position.quantity} ações
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(position.currentValue, currency)}
                      </div>
                      <div className={cn("text-sm", getPercentageColor(position.profitLoss))}>
                        {position.profitLoss > 0 ? "+" : ""}{formatCurrency(position.profitLoss, currency)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Preço Médio:</span>
                      <div>{formatCurrency(position.averagePrice, currency)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Atual:</span>
                      <div>{formatCurrency(position.currentPrice, currency)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setTransactionModal({ isOpen: true, mode: "buy", ticker: position.ticker })}
                    >
                      Comprar +
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setTransactionModal({
                        isOpen: true,
                        mode: "sell",
                        ticker: position.ticker,
                        currentPosition: {
                          quantity: position.quantity,
                          ticker: position.ticker
                        }
                      })}
                    >
                      Vender
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Ativo</th>
                  <th className="text-right p-3 font-medium">Quantidade</th>
                  <th className="text-right p-3 font-medium">Preço Médio</th>
                  <th className="text-right p-3 font-medium">Preço Atual</th>
                  <th className="text-right p-3 font-medium">Valor de Mercado</th>
                  <th className="text-right p-3 font-medium">L&P</th>
                  <th className="text-right p-3 font-medium">L&P %</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentPortfolio.map((position, index) => (
                  <tr key={index} className="border-b hover:bg-accent/50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{position.ticker}</div>
                        <div className="text-sm text-muted-foreground">{position.name}</div>
                      </div>
                    </td>
                    <td className="text-right p-3">{position.quantity}</td>
                    <td className="text-right p-3">
                      {formatCurrency(position.averagePrice, currency)}
                    </td>
                    <td className="text-right p-3">
                      {formatCurrency(position.currentPrice, currency)}
                    </td>
                    <td className="text-right p-3 font-medium">
                      {formatCurrency(position.currentValue, currency)}
                    </td>
                    <td className={cn(
                      "text-right p-3 font-medium",
                      getPercentageColor(position.profitLoss)
                    )}>
                      {position.profitLoss > 0 ? "+" : ""}{formatCurrency(position.profitLoss, currency)}
                    </td>
                    <td className={cn(
                      "text-right p-3 font-medium",
                      getPercentageColor(position.profitLossPercent)
                    )}>
                      {formatPercentage(position.profitLossPercent)}
                    </td>
                    <td className="text-center p-3">
                      <div className="flex justify-center space-x-1 flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTransactionModal({ isOpen: true, mode: "buy", ticker: position.ticker })}
                        >
                          Comprar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTransactionModal({
                            isOpen: true,
                            mode: "sell",
                            ticker: position.ticker,
                            currentPosition: {
                              quantity: position.quantity,
                              ticker: position.ticker
                            }
                          })}
                        >
                          Vender
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {currentPortfolio.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma posição ainda</h3>
              <p className="text-muted-foreground mb-4">
                Comece construindo seu portfólio {currency} comprando sua primeira posição.
              </p>
              <Button onClick={() => setTransactionModal({ isOpen: true, mode: "buy" })}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Posição
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      {currentPortfolio.length > 0 && (
        <AdvancedMetrics
          positions={currentPortfolio}
          totalValue={currentSummary?.totalCurrentValue || 0}
          totalCost={currentSummary?.totalInvested || 0}
          currency={currency}
          className="mt-6"
        />
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={() => setTransactionModal({ isOpen: false, mode: "buy" })}
        onSuccess={() => fetchPortfolioData(true)}
        initialTicker={transactionModal.ticker}
        mode={transactionModal.mode}
        currentPosition={transactionModal.currentPosition}
      />
    </div>
  )
}