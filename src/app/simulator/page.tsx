"use client"

import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Play,
  Plus,
  Calendar,
  BarChart3,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  FastForward,
  ShoppingCart,
  TrendingDown,
  Target,
  Trash2,
  X,
  DollarSign,
} from "lucide-react"
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getPercentageColor,
} from "@/lib/utils"
import { cn } from "@/lib/utils"

// Lazy load modals
const NewSimulationModal = lazy(() =>
  import("@/components/modals/new-simulation-modal").then((module) => ({
    default: module.NewSimulationModal,
  }))
)
const TransactionModal = lazy(() =>
  import("@/components/modals/transaction-modal").then((module) => ({
    default: module.TransactionModal,
  }))
)
const AssetChartModal = lazy(() =>
  import("@/components/modals/asset-chart-modal").then((module) => ({
    default: module.AssetChartModal,
  }))
)

// Loading components
import {
  ModalSkeleton,
  ChartModalSkeleton,
} from "@/components/loading/modal-skeleton"

interface Simulation {
  id: string
  name: string
  startDate: string
  currentDate: string
  initialCashBRL: number
  initialCashUSD: number
  currentCashBRL: number
  currentCashUSD: number
  currentValueBRL: number
  currentValueUSD: number
  totalCurrentValue: number
  totalInitialValue: number
  totalReturn: number
  realizedProfitBRL: number
  realizedProfitUSD: number
  monthlyDepositBRL: number
  monthlyDepositUSD: number
  isActive: boolean
  monthsElapsed: number
  positionsCount: number
}

interface Asset {
  ticker: string
  name: string
  currency: "BRL" | "USD"
  market: string
  price: number
  proximity: number
  potential: number
  minPrice: number
  maxPrice: number
  lastUpdate: string
}

interface Position {
  ticker: string
  name: string
  currency: "BRL" | "USD"
  market: string
  quantity: number
  avgPrice: number
  currentPrice: number
  currentValue: number
  totalCost: number
  profitLoss: number
  profitLossPercent: number
  lastUpdate: string
}

export default function SimulatorPage() {
  const { data: session } = useSession()
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [selectedSim, setSelectedSim] = useState<Simulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [newSimulationModal, setNewSimulationModal] = useState(false)
  const [transactionModal, setTransactionModal] = useState<{
    isOpen: boolean
    mode: "buy" | "sell" | "close"
    simulationId?: string
    initialTicker?: string
    currentPosition?: { quantity: number; ticker: string }
  }>({ isOpen: false, mode: "buy" })
  const [assets, setAssets] = useState<Asset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [chartModal, setChartModal] = useState<{
    isOpen: boolean
    asset: { ticker: string; name: string; currency: string } | null
  }>({ isOpen: false, asset: null })

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    simulationId: string | null
    simulationName: string | null
  }>({ isOpen: false, simulationId: null, simulationName: null })
  const [positions, setPositions] = useState<Position[]>([])
  const [positionsSummary, setPositionsSummary] = useState<any>(null)
  const [loadingPositions, setLoadingPositions] = useState(false)

  const fetchSimulations = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const response = await fetch("/api/simulations")
        const data = await response.json()

        setSimulations(data.simulations || [])

        // Selecionar primeira simulação se não há uma selecionada
        if (!selectedSim && data.simulations?.length > 0) {
          setSelectedSim(data.simulations[0])
        }
      } catch (error) {
        console.error("Error fetching simulations:", error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [selectedSim]
  )

  const advanceTime = async (period: string, amount = 1) => {
    if (!selectedSim) return

    setAdvancing(true)
    try {
      const response = await fetch(
        `/api/simulations/${selectedSim.id}/advance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ period, amount }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        // Atualizar a simulação selecionada imediatamente com os novos dados
        if (data.simulation && selectedSim) {
          setSelectedSim((prev) =>
            prev
              ? {
                  ...prev,
                  currentDate: data.simulation.currentDate,
                  currentCashBRL: data.simulation.currentCashBRL,
                  currentCashUSD: data.simulation.currentCashUSD,
                  currentValueBRL: data.simulation.totalValueBRL,
                  currentValueUSD: data.simulation.totalValueUSD,
                  totalCurrentValue: data.simulation.totalValue,
                  totalReturn: data.simulation.totalReturn,
                }
              : null
          )
        }

        await fetchSimulations(true)
        await fetchAssets() // Atualizar ativos após avanço no tempo
        await fetchPositions() // Atualizar posições após avanço no tempo
      }
    } catch (error) {
      console.error("Error advancing simulation:", error)
    } finally {
      setAdvancing(false)
    }
  }

  const fetchAssets = useCallback(async () => {
    if (!selectedSim) return

    setLoadingAssets(true)
    try {
      // Buscar ativos BRL e USD usando a data da simulação
      const simulationDate = selectedSim.currentDate
      console.log("📊 Buscando oportunidades para data:", simulationDate)

      const [brlResponse, usdResponse] = await Promise.all([
        fetch(
          `/api/opportunities?currency=BRL&limit=50&simulationDate=${simulationDate}`
        ),
        fetch(
          `/api/opportunities?currency=USD&limit=50&simulationDate=${simulationDate}`
        ),
      ])

      console.log(
        "📊 Response status - BRL:",
        brlResponse.status,
        "USD:",
        usdResponse.status
      )

      const brlData = await brlResponse.json()
      const usdData = await usdResponse.json()

      console.log("📊 BRL Data:", brlData)
      console.log("📊 USD Data:", usdData)

      const allAssets = [
        ...(brlData.opportunities || []),
        ...(usdData.opportunities || []),
      ]

      console.log("📊 Total assets found:", allAssets.length)

      // Ordenar por proximidade da mínima (melhor oportunidade primeiro)
      const sortedAssets = allAssets.sort((a, b) => a.proximity - b.proximity)

      setAssets(sortedAssets)
    } catch (error) {
      console.error("Error fetching assets:", error)
    } finally {
      setLoadingAssets(false)
    }
  }, [selectedSim])

  const fetchPositions = useCallback(async () => {
    if (!selectedSim) return

    setLoadingPositions(true)
    try {
      const response = await fetch(
        `/api/simulations/${selectedSim.id}/positions`
      )
      const data = await response.json()

      if (response.ok) {
        setPositions(data.positions || [])
        setPositionsSummary(data.summary || null)
        console.log("💰 Saldos em caixa:", data.summary)
      }
    } catch (error) {
      console.error("Error fetching positions:", error)
    } finally {
      setLoadingPositions(false)
    }
  }, [selectedSim])

  const handleDeleteSimulation = async () => {
    if (!deleteConfirmation.simulationId) return

    try {
      const response = await fetch(
        `/api/simulations/${deleteConfirmation.simulationId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        console.log("🗑️ Simulação excluída:", deleteConfirmation.simulationName)

        // If the deleted simulation was selected, clear selection completely
        if (selectedSim?.id === deleteConfirmation.simulationId) {
          console.log("🔄 Limpando simulação selecionada após exclusão")
          setSelectedSim(null)
          setAssets([])
          setPositions([])
          // Also clear any modal states that might reference the deleted simulation
          setTransactionModal({ isOpen: false, mode: "buy" })
          setChartModal({ isOpen: false, asset: null })
        }

        // Refresh simulations list
        await fetchSimulations(true)
      } else {
        console.error("Erro ao excluir simulação")
      }
    } catch (error) {
      console.error("Erro ao excluir simulação:", error)
    } finally {
      setDeleteConfirmation({
        isOpen: false,
        simulationId: null,
        simulationName: null,
      })
    }
  }

  useEffect(() => {
    if (session) {
      fetchSimulations()
    } else {
      // If no session, stop loading state to show the appropriate UI
      setLoading(false)
    }
  }, [session, fetchSimulations])

  useEffect(() => {
    console.log(
      "🔄 useEffect triggered with selectedSim:",
      selectedSim?.id,
      selectedSim?.currentDate
    )
    if (selectedSim && selectedSim.id && selectedSim.currentDate) {
      console.log(
        "🔄 Carregando dados para simulação:",
        selectedSim.name,
        selectedSim.currentDate
      )
      fetchAssets()
      fetchPositions()
    } else if (selectedSim) {
      console.warn(
        "⚠️ Simulação selecionada com dados incompletos:",
        selectedSim
      )
      setSelectedSim(null) // Limpar simulação inválida
    } else {
      console.log("🔄 Nenhuma simulação selecionada")
    }
  }, [selectedSim?.id, selectedSim?.currentDate, fetchAssets, fetchPositions]) // Remove setSelectedSim as it doesn't need to be a dependency

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando simulações...</p>
        </div>
      </div>
    )
  }

  if (simulations.length === 0) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium">
              Nenhuma simulação encontrada
            </h3>
            <p className="text-muted-foreground">
              Crie sua primeira simulação para testar estratégias de
              investimento com dados históricos.
            </p>
            <Button onClick={() => setNewSimulationModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Simulação
            </Button>
          </div>
        </div>

        {/* Modals */}
        <NewSimulationModal
          isOpen={newSimulationModal}
          onClose={() => setNewSimulationModal(false)}
          onSuccess={() => fetchSimulations(true)}
        />

        <TransactionModal
          isOpen={transactionModal.isOpen}
          onClose={() => setTransactionModal({ isOpen: false, mode: "buy" })}
          onSuccess={() => fetchSimulations(true)}
          mode={transactionModal.mode}
          simulationId={transactionModal.simulationId}
          simulationDate={selectedSim?.currentDate}
          initialTicker={transactionModal.initialTicker}
        />

        <AssetChartModal
          isOpen={chartModal.isOpen}
          onClose={() => setChartModal({ isOpen: false, asset: null })}
          asset={chartModal.asset}
          simulationDate={selectedSim?.currentDate}
        />
      </>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulador</h1>
          <p className="text-muted-foreground">
            Teste estratégias de investimento com dados históricos
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchSimulations(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setNewSimulationModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Simulação
          </Button>
        </div>
      </div>

      {/* Dashboard da Simulação Ativa */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor BRL</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSim?.currentValueBRL || 0, "BRL")}
            </div>
            <p className="text-xs text-muted-foreground">
              Inicial: {formatCurrency(selectedSim?.initialCashBRL || 0, "BRL")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor USD</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(selectedSim?.currentValueUSD || 0, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">
              Inicial: {formatCurrency(selectedSim?.initialCashUSD || 0, "USD")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retorno Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                getPercentageColor(selectedSim?.totalReturn || 0)
              )}
            >
              {formatPercentage(selectedSim?.totalReturn || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(selectedSim?.totalCurrentValue || 0) >
              (selectedSim?.totalInitialValue || 0)
                ? "+"
                : ""}
              {formatCurrency(
                (selectedSim?.totalCurrentValue || 0) -
                  (selectedSim?.totalInitialValue || 0),
                "USD"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Decorrido
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedSim?.monthsElapsed || 0}M
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedSim?.startDate
                ? `Desde ${formatDate(selectedSim.startDate)}`
                : "Nenhuma simulação selecionada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Atual</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedSim?.currentDate
                ? formatDate(selectedSim.currentDate, {
                    month: "short",
                    year: "2-digit",
                    day: "numeric",
                  })
                : "Selecione uma simulação"}
            </div>
            <p className="text-xs text-muted-foreground">Tempo da simulação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posições</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">Posições ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Simulação */}
      <Card>
        <CardHeader>
          <CardTitle>Controles da Simulação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Controle a progressão do tempo e tome decisões de investimento
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => advanceTime("day", 1)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              +1 Dia
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceTime("week", 1)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              +1 Semana
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceTime("month", 1)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              +1 Mês
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceTime("month", 3)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FastForward className="mr-2 h-4 w-4" />
              )}
              +3 Meses
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceTime("month", 6)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FastForward className="mr-2 h-4 w-4" />
              )}
              +6 Meses
            </Button>
            <Button
              variant="outline"
              onClick={() => advanceTime("year", 1)}
              disabled={advancing || !selectedSim}
            >
              {advancing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FastForward className="mr-2 h-4 w-4" />
              )}
              +1 Ano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posições Ativas */}
      {selectedSim && (
        <Card>
          <CardHeader>
            <CardTitle>Posições Ativas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Seus investimentos atuais na simulação
            </p>
          </CardHeader>
          <CardContent>
            {/* Saldo em Caixa */}
            {positionsSummary && (
              <div className="mb-6 p-4 bg-accent/50 rounded-lg border">
                <h3 className="font-medium mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Saldo em Caixa
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      🇧🇷 Real (BRL):
                    </span>
                    <span className="font-mono font-medium">
                      {formatCurrency(
                        positionsSummary.brl?.cashBalance || 0,
                        "BRL"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      🇺🇸 Dólar (USD):
                    </span>
                    <span className="font-mono font-medium">
                      {formatCurrency(
                        positionsSummary.usd?.cashBalance || 0,
                        "USD"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loadingPositions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando posições...</span>
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>Nenhuma posição ativa</p>
                <p className="text-sm">
                  Compre alguns ativos para começar a investir
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {positions.map((position) => (
                    <div
                      key={position.ticker}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setChartModal({
                                isOpen: true,
                                asset: {
                                  ticker: position.ticker,
                                  name: position.name,
                                  currency: position.currency,
                                },
                              })
                            }
                            className="font-semibold hover:text-primary hover:underline transition-colors"
                          >
                            {position.ticker}
                          </button>
                          <Badge
                            variant={
                              position.currency === "BRL"
                                ? "default"
                                : "outline"
                            }
                          >
                            {position.currency}
                          </Badge>
                        </div>
                        <div
                          className={cn(
                            "font-medium",
                            getPercentageColor(position.profitLossPercent)
                          )}
                        >
                          {formatPercentage(position.profitLossPercent)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Qtd:</span>{" "}
                          {position.quantity}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            P. Médio:
                          </span>{" "}
                          {formatCurrency(position.avgPrice, position.currency)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            P. Atual:
                          </span>{" "}
                          {formatCurrency(
                            position.currentPrice,
                            position.currency
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>{" "}
                          {formatCurrency(
                            position.currentValue,
                            position.currency
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            setTransactionModal({
                              isOpen: true,
                              mode: "buy",
                              simulationId: selectedSim.id,
                              initialTicker: position.ticker,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Comprar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setTransactionModal({
                              isOpen: true,
                              mode: "sell",
                              simulationId: selectedSim.id,
                              initialTicker: position.ticker,
                            })
                          }
                        >
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Vender
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            console.log(
                              "❌ Encerrar posição clicked for:",
                              position.ticker
                            )
                            setTransactionModal({
                              isOpen: true,
                              mode: "close",
                              simulationId: selectedSim.id,
                              initialTicker: position.ticker,
                              currentPosition: {
                                quantity: position.quantity,
                                ticker: position.ticker,
                              },
                            })
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Encerrar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Ativo</th>
                        <th className="text-right p-3 font-medium">Qtd</th>
                        <th className="text-right p-3 font-medium">P. Médio</th>
                        <th className="text-right p-3 font-medium">P. Atual</th>
                        <th className="text-right p-3 font-medium">
                          Valor Atual
                        </th>
                        <th className="text-right p-3 font-medium">
                          Resultado
                        </th>
                        <th className="text-center p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => (
                        <tr
                          key={position.ticker}
                          className="border-b hover:bg-accent/50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <button
                                  onClick={() =>
                                    setChartModal({
                                      isOpen: true,
                                      asset: {
                                        ticker: position.ticker,
                                        name: position.name,
                                        currency: position.currency,
                                      },
                                    })
                                  }
                                  className="font-semibold hover:text-primary hover:underline transition-colors text-left"
                                >
                                  {position.ticker}
                                </button>
                                <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                                  {position.name}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  position.currency === "BRL"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {position.currency}
                              </Badge>
                            </div>
                          </td>
                          <td className="text-right p-3">
                            {position.quantity}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(
                              position.avgPrice,
                              position.currency
                            )}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {formatCurrency(
                              position.currentPrice,
                              position.currency
                            )}
                          </td>
                          <td className="text-right p-3 font-mono font-bold">
                            {formatCurrency(
                              position.currentValue,
                              position.currency
                            )}
                          </td>
                          <td
                            className={cn(
                              "text-right p-3 font-mono",
                              getPercentageColor(position.profitLossPercent)
                            )}
                          >
                            <div>
                              {formatPercentage(position.profitLossPercent)}
                            </div>
                            <div className="text-xs">
                              {formatCurrency(
                                position.profitLoss,
                                position.currency
                              )}
                            </div>
                          </td>
                          <td className="text-center p-3">
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                onClick={() =>
                                  setTransactionModal({
                                    isOpen: true,
                                    mode: "buy",
                                    simulationId: selectedSim.id,
                                    initialTicker: position.ticker,
                                  })
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  setTransactionModal({
                                    isOpen: true,
                                    mode: "sell",
                                    simulationId: selectedSim.id,
                                    initialTicker: position.ticker,
                                  })
                                }
                              >
                                <TrendingDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  console.log(
                                    "❌ Encerrar posição clicked for:",
                                    position.ticker
                                  )
                                  setTransactionModal({
                                    isOpen: true,
                                    mode: "close",
                                    simulationId: selectedSim.id,
                                    initialTicker: position.ticker,
                                    currentPosition: {
                                      quantity: position.quantity,
                                      ticker: position.ticker,
                                    },
                                  })
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Ativos - Oportunidades de Investimento */}
      {selectedSim && (
        <Card>
          <CardHeader>
            <CardTitle>Oportunidades de Investimento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ativos ordenados por proximidade da mínima histórica (melhor
              oportunidade primeiro)
            </p>
          </CardHeader>
          <CardContent>
            {loadingAssets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando oportunidades...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum ativo encontrado</p>
                <p className="text-xs mt-2">
                  Debug: selectedSim: {selectedSim?.id}, loadingAssets:{" "}
                  {loadingAssets.toString()}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mobile View */}
                <div className="md:hidden space-y-3 overflow-hidden">
                  {assets.slice(0, 20).map((asset) => (
                    <div
                      key={asset.ticker}
                      className="p-3 rounded-lg border hover:bg-accent/50 transition-colors w-full"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{asset.ticker}</h3>
                          <Badge
                            variant={
                              asset.currency === "BRL" ? "default" : "outline"
                            }
                            className={
                              asset.currency === "USD"
                                ? "border-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                                : ""
                            }
                          >
                            {asset.currency}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">
                            {formatCurrency(asset.price, asset.currency)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          console.log(
                            "📊 Chart link clicked for asset:",
                            asset.ticker,
                            asset.name
                          )
                          setChartModal({
                            isOpen: true,
                            asset: {
                              ticker: asset.ticker,
                              name: asset.name,
                              currency: asset.currency,
                            },
                          })
                        }}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors text-left mb-2 block truncate w-full"
                      >
                        {asset.name}
                      </button>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span
                              className={cn(
                                "font-medium",
                                asset.proximity <= 10
                                  ? "text-green-600"
                                  : asset.proximity <= 25
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              )}
                            >
                              +{formatPercentage(asset.proximity)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Prox. Mínima
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span
                              className={cn(
                                "font-medium",
                                getPercentageColor(asset.potential)
                              )}
                            >
                              +{formatPercentage(asset.potential)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Potencial
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            console.log(
                              "🛒 Buy button clicked for asset:",
                              asset.ticker,
                              asset.name
                            )
                            setTransactionModal({
                              isOpen: true,
                              mode: "buy",
                              simulationId: selectedSim.id,
                              initialTicker: asset.ticker,
                            })
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Comprar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            setTransactionModal({
                              isOpen: true,
                              mode: "sell",
                              simulationId: selectedSim.id,
                              initialTicker: asset.ticker,
                            })
                          }
                        >
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Vender
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block space-y-3">
                  {assets.slice(0, 20).map((asset) => (
                    <div
                      key={asset.ticker}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold">{asset.ticker}</h3>
                            <button
                              onClick={() =>
                                setChartModal({
                                  isOpen: true,
                                  asset: {
                                    ticker: asset.ticker,
                                    name: asset.name,
                                    currency: asset.currency,
                                  },
                                })
                              }
                              className="text-sm text-muted-foreground truncate max-w-[200px] hover:text-primary hover:underline transition-colors text-left"
                            >
                              {asset.name}
                            </button>
                          </div>
                          <Badge
                            variant={
                              asset.currency === "BRL" ? "default" : "outline"
                            }
                            className={
                              asset.currency === "USD"
                                ? "border-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                                : ""
                            }
                          >
                            {asset.currency}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div className="min-w-[80px]">
                          <p className="font-bold">
                            {formatCurrency(asset.price, asset.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Preço Atual
                          </p>
                        </div>

                        <div className="min-w-[90px]">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            <span
                              className={cn(
                                "font-medium text-sm",
                                asset.proximity <= 10
                                  ? "text-green-600"
                                  : asset.proximity <= 25
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              )}
                            >
                              +{formatPercentage(asset.proximity)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Prox. Mínima
                          </p>
                        </div>

                        <div className="min-w-[90px]">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span
                              className={cn(
                                "font-medium text-sm",
                                getPercentageColor(asset.potential)
                              )}
                            >
                              +{formatPercentage(asset.potential)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Potencial
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setTransactionModal({
                                isOpen: true,
                                mode: "buy",
                                simulationId: selectedSim.id,
                                initialTicker: asset.ticker,
                              })
                            }
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Comprar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setTransactionModal({
                                isOpen: true,
                                mode: "sell",
                                simulationId: selectedSim.id,
                                initialTicker: asset.ticker,
                              })
                            }
                          >
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Vender
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Simulações */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Simulações</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie e compare diferentes estratégias de investimento
          </p>
        </CardHeader>
        <CardContent>
          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {simulations.map((simulation) => (
              <Card
                key={simulation.id}
                variant={
                  selectedSim?.id === simulation.id ? "elevated" : "outline"
                }
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedSim?.id === simulation.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedSim(simulation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{simulation.name}</h3>
                      {simulation.isActive && (
                        <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedSim(simulation)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Iniciado:</span>
                      <div>{formatDate(simulation.startDate)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duração:</span>
                      <div>{simulation.monthsElapsed} meses</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <div>
                        {formatCurrency(simulation.totalCurrentValue, "USD")}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Retorno:</span>
                      <div
                        className={getPercentageColor(simulation.totalReturn)}
                      >
                        {formatPercentage(simulation.totalReturn)}
                      </div>
                    </div>
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
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Data Início</th>
                  <th className="text-right p-3 font-medium">Duração</th>
                  <th className="text-right p-3 font-medium">Inicial</th>
                  <th className="text-right p-3 font-medium">Valor Atual</th>
                  <th className="text-right p-3 font-medium">Retorno Total</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {simulations.map((simulation) => (
                  <tr
                    key={simulation.id}
                    className={cn(
                      "border-b hover:bg-accent/50 cursor-pointer",
                      selectedSim?.id === simulation.id && "bg-accent/25"
                    )}
                    onClick={() => setSelectedSim(simulation)}
                  >
                    <td className="p-3 font-medium">{simulation.name}</td>
                    <td className="p-3">
                      {simulation.isActive ? (
                        <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                          Ativa
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                          Pausada
                        </span>
                      )}
                    </td>
                    <td className="text-right p-3">
                      {formatDate(simulation.startDate)}
                    </td>
                    <td className="text-right p-3">
                      {simulation.monthsElapsed}M
                    </td>
                    <td className="text-right p-3">
                      {formatCurrency(simulation.totalInitialValue, "USD")}
                    </td>
                    <td className="text-right p-3 font-medium">
                      {formatCurrency(simulation.totalCurrentValue, "USD")}
                    </td>
                    <td
                      className={cn(
                        "text-right p-3 font-medium",
                        getPercentageColor(simulation.totalReturn)
                      )}
                    >
                      {formatPercentage(simulation.totalReturn)}
                    </td>
                    <td className="text-center p-3">
                      <div className="flex justify-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSim(simulation)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log(
                              "🗑️ Delete button clicked for simulation:",
                              simulation.name
                            )
                            setDeleteConfirmation({
                              isOpen: true,
                              simulationId: simulation.id,
                              simulationName: simulation.name,
                            })
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {newSimulationModal && (
        <Suspense
          fallback={
            <ModalSkeleton
              isOpen={newSimulationModal}
              title="Carregando nova simulação..."
            />
          }
        >
          <NewSimulationModal
            isOpen={newSimulationModal}
            onClose={() => setNewSimulationModal(false)}
            onSuccess={() => fetchSimulations(true)}
          />
        </Suspense>
      )}

      {transactionModal.isOpen && (
        <Suspense
          fallback={
            <ModalSkeleton
              isOpen={transactionModal.isOpen}
              title="Carregando transação..."
            />
          }
        >
          <TransactionModal
            isOpen={transactionModal.isOpen}
            onClose={() => setTransactionModal({ isOpen: false, mode: "buy" })}
            onSuccess={() => {
              console.log(
                "✅ Transação realizada com sucesso, atualizando dados..."
              )
              fetchSimulations(true)
              if (selectedSim) {
                fetchAssets()
                fetchPositions()
              }
            }}
            mode={transactionModal.mode}
            simulationId={transactionModal.simulationId}
            simulationDate={selectedSim?.currentDate}
            initialTicker={transactionModal.initialTicker}
            currentPosition={transactionModal.currentPosition}
            availableCash={positionsSummary}
          />
        </Suspense>
      )}

      {chartModal.isOpen && (
        <Suspense fallback={<ChartModalSkeleton isOpen={chartModal.isOpen} />}>
          <AssetChartModal
            isOpen={chartModal.isOpen}
            onClose={() => setChartModal({ isOpen: false, asset: null })}
            asset={chartModal.asset}
            simulationDate={selectedSim?.currentDate}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) =>
          !open &&
          setDeleteConfirmation({
            isOpen: false,
            simulationId: null,
            simulationName: null,
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir a simulação{" "}
              <strong>{deleteConfirmation.simulationName}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta ação não pode ser desfeita e todos os dados da simulação
              serão perdidos.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirmation({
                  isOpen: false,
                  simulationId: null,
                  simulationName: null,
                })
              }
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSimulation}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Simulação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
