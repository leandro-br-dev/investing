"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, DollarSign, Loader2, RefreshCw, LineChart } from "lucide-react"
import { formatCurrency, formatPercentage, getPercentageColor } from "@/lib/utils"
import { cn } from "@/lib/utils"

// Lazy load modals
const TransactionModal = lazy(() => import("@/components/modals/transaction-modal").then(module => ({ default: module.TransactionModal })))
const AssetChartModal = lazy(() => import("@/components/modals/asset-chart-modal").then(module => ({ default: module.AssetChartModal })))

// Loading components
import { ModalSkeleton, ChartModalSkeleton } from "@/components/loading/modal-skeleton"

interface Opportunity {
  ticker: string
  name: string
  price: number
  proximity: number
  potential: number
  currency: "BRL" | "USD"
  market: string
}

interface PortfolioSummary {
  totalCurrentValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  currency: string
}

interface DashboardData {
  opportunities: Opportunity[]
  portfolioBRL: PortfolioSummary | null
  portfolioUSD: PortfolioSummary | null
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData>({
    opportunities: [],
    portfolioBRL: null,
    portfolioUSD: null
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [transactionModal, setTransactionModal] = useState<{
    isOpen: boolean
    mode: "buy" | "sell"
    ticker?: string
    name?: string
    currency?: "BRL" | "USD"
  }>({ isOpen: false, mode: "buy" })
  const [chartModal, setChartModal] = useState<{
    isOpen: boolean
    ticker?: string
    name?: string
    currency?: "BRL" | "USD"
  }>({ isOpen: false })

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Buscar oportunidades (BRL e USD limitadas)
      const [opportunitiesBRL, opportunitiesUSD, portfolioBRL, portfolioUSD] = await Promise.all([
        fetch('/api/opportunities?currency=BRL&limit=5').then(r => r.json()),
        fetch('/api/opportunities?currency=USD&limit=5').then(r => r.json()),
        fetch('/api/portfolio?currency=BRL').then(r => r.json()),
        fetch('/api/portfolio?currency=USD').then(r => r.json())
      ])

      // Combinar oportunidades
      const allOpportunities = [
        ...(opportunitiesBRL.opportunities || []),
        ...(opportunitiesUSD.opportunities || [])
      ].slice(0, 10) // Limitar total

      setData({
        opportunities: allOpportunities,
        portfolioBRL: portfolioBRL.summary,
        portfolioUSD: portfolioUSD.summary
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchDashboardData()
    }
  }, [session])

  const totalPortfolioValue = (data.portfolioBRL?.totalCurrentValue || 0) +
                             (data.portfolioUSD?.totalCurrentValue || 0)

  const totalProfitLoss = (data.portfolioBRL?.totalProfitLoss || 0) +
                         (data.portfolioUSD?.totalProfitLoss || 0)

  const handleBuyClick = (opportunity: Opportunity) => {
    setTransactionModal({
      isOpen: true,
      mode: "buy",
      ticker: opportunity.ticker,
      name: opportunity.name,
      currency: opportunity.currency
    })
  }

  const handleChartClick = (opportunity: Opportunity) => {
    setChartModal({
      isOpen: true,
      ticker: opportunity.ticker,
      name: opportunity.name,
      currency: opportunity.currency
    })
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Oportunidades de investimento e métricas da carteira
          </p>
        </div>
        <Button onClick={() => fetchDashboardData(true)} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar Dados
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteira Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPortfolioValue, "USD")}
            </div>
            <p className={cn("text-xs", getPercentageColor(totalProfitLoss))}>
              {totalProfitLoss > 0 ? "+" : ""}{formatCurrency(totalProfitLoss, "USD")}
              <span className="text-muted-foreground"> total L&P</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteira BRL</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.portfolioBRL?.totalCurrentValue || 0, "BRL")}
            </div>
            <p className={cn("text-xs", getPercentageColor(data.portfolioBRL?.totalProfitLoss || 0))}>
              {formatPercentage(data.portfolioBRL?.totalProfitLossPercent || 0)}
              <span className="text-muted-foreground"> retorno</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carteira USD</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.portfolioUSD?.totalCurrentValue || 0, "USD")}
            </div>
            <p className={cn("text-xs", getPercentageColor(data.portfolioUSD?.totalProfitLoss || 0))}>
              {formatPercentage(data.portfolioUSD?.totalProfitLossPercent || 0)}
              <span className="text-muted-foreground"> retorno</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.opportunities.length}</div>
            <p className="text-xs text-muted-foreground">
              Oportunidades ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades de Investimento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ativos próximos aos seus preços mínimos com alto potencial de retorno
          </p>
        </CardHeader>
        <CardContent>
          {data.opportunities.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma oportunidade encontrada</h3>
              <p className="text-muted-foreground">
                Não há oportunidades de investimento disponíveis no momento.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="md:hidden space-y-4">
                {data.opportunities.map((opportunity, index) => (
                  <Card key={index} variant="outline">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold">{opportunity.ticker}</span>
                          <p className="text-xs text-muted-foreground">{opportunity.name}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(opportunity.price, opportunity.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Proximidade:</span>
                          <div className={getPercentageColor(opportunity.proximity)}>
                            {formatPercentage(opportunity.proximity)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Potencial:</span>
                          <div className={getPercentageColor(opportunity.potential)}>
                            {formatPercentage(opportunity.potential)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChartClick(opportunity)}
                          aria-label={`Ver gráfico de ${opportunity.ticker} - ${opportunity.name}`}
                        >
                          <LineChart className="mr-1 h-3 w-3" />
                          Gráfico
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleBuyClick(opportunity)}
                          aria-label={`Comprar ${opportunity.ticker} - ${opportunity.name} por ${formatCurrency(opportunity.price, opportunity.currency)}`}
                        >
                          Comprar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full" role="table" aria-label="Oportunidades de investimento">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium" scope="col">Ativo</th>
                        <th className="text-right p-2 font-medium" scope="col">Preço</th>
                        <th className="text-right p-2 font-medium" scope="col">Proximidade</th>
                        <th className="text-right p-2 font-medium" scope="col">Potencial</th>
                        <th className="text-center p-2 font-medium" scope="col">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.opportunities.map((opportunity, index) => (
                        <tr key={index} className="border-b hover:bg-accent/50">
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{opportunity.ticker}</div>
                              <div className="text-sm text-muted-foreground">{opportunity.name}</div>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {formatCurrency(opportunity.price, opportunity.currency)}
                          </td>
                          <td className={cn(
                            "text-right p-2",
                            getPercentageColor(opportunity.proximity)
                          )}>
                            {formatPercentage(opportunity.proximity)}
                          </td>
                          <td className={cn(
                            "text-right p-2",
                            getPercentageColor(opportunity.potential)
                          )}>
                            {formatPercentage(opportunity.potential)}
                          </td>
                          <td className="text-center p-2">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleChartClick(opportunity)}
                                aria-label={`Ver gráfico de ${opportunity.ticker} - ${opportunity.name}`}
                                title="Ver gráfico histórico"
                              >
                                <LineChart className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleBuyClick(opportunity)}
                                aria-label={`Comprar ${opportunity.ticker} - ${opportunity.name} por ${formatCurrency(opportunity.price, opportunity.currency)}`}
                                title="Realizar compra"
                              >
                                Comprar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      {transactionModal.isOpen && (
        <Suspense fallback={<ModalSkeleton isOpen={transactionModal.isOpen} title="Carregando transação..." />}>
          <TransactionModal
            isOpen={transactionModal.isOpen}
            onClose={() => setTransactionModal({ isOpen: false, mode: "buy" })}
            onSuccess={() => {
              fetchDashboardData(true)
              setTransactionModal({ isOpen: false, mode: "buy" })
            }}
            mode={transactionModal.mode}
            initialTicker={transactionModal.ticker}
          />
        </Suspense>
      )}

      {/* Chart Modal */}
      {chartModal.isOpen && (
        <Suspense fallback={<ChartModalSkeleton isOpen={chartModal.isOpen} />}>
          <AssetChartModal
            isOpen={chartModal.isOpen}
            onClose={() => setChartModal({ isOpen: false })}
            asset={chartModal.ticker ? {
              ticker: chartModal.ticker,
              name: chartModal.name || "",
              currency: chartModal.currency || "USD"
            } : null}
          />
        </Suspense>
      )}
    </div>
  )
}