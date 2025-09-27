"use client"

import { useState, useEffect } from "react"
// useSession import removed as it's unused
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, DollarSign, TrendingUp, Search } from "lucide-react"
import { formatPrice, roundPrice, calculateTotal } from "@/lib/format"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialTicker?: string
  mode?: "buy" | "sell" | "close"
  simulationId?: string
  simulationDate?: string
  currentPosition?: {
    quantity: number
    ticker: string
  }
  prefilledAsset?: {
    ticker: string
    name: string
    currency: string
    price?: number
    decimals?: number
  }
  availableCash?: {
    brl?: { cashBalance: number }
    usd?: { cashBalance: number }
  }
}

interface Asset {
  ticker: string
  name: string
  price: number
  currency: "BRL" | "USD"
  market: string
  decimals: number
  minLotSize: number
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialTicker = "",
  mode = "buy",
  simulationId,
  simulationDate,
  currentPosition,
  prefilledAsset,
  availableCash,
}: TransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    ticker: initialTicker,
    quantity: "",
    price: "",
  })

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedAsset(null)
    setAssets([])
    setError(null)
    setFormData({
      ticker: initialTicker,
      quantity: "",
      price: "",
    })
    onClose()
  }

  const searchAssets = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAssets([])
      return
    }

    setSearching(true)
    try {
      const url = simulationDate
        ? `/api/assets/search?q=${encodeURIComponent(searchTerm)}&simulationDate=${simulationDate}`
        : `/api/assets/search?q=${encodeURIComponent(searchTerm)}`
      const response = await fetch(url)
      const data = await response.json()
      setAssets((data.assets || []) as Asset[])
    } catch (error) {
      console.error("Error searching assets:", error)
      setAssets([])
    } finally {
      setSearching(false)
    }
  }

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    const defaultQuantity =
      mode === "close" && currentPosition
        ? currentPosition.quantity.toString()
        : asset.minLotSize.toString()

    setFormData((prev) => ({
      ...prev,
      ticker: asset.ticker,
      price: roundPrice(asset.price, asset.decimals).toString(),
      quantity: defaultQuantity,
    }))
  }

  // Pré-preencher ativo quando modal abrir
  useEffect(() => {
    if (isOpen && prefilledAsset && !selectedAsset) {
      // Buscar dados completos do ativo
      const fetchPrefilledAsset = async () => {
        try {
          const url = simulationDate
            ? `/api/assets/search?q=${encodeURIComponent(prefilledAsset.ticker)}&simulationDate=${simulationDate}`
            : `/api/assets/search?q=${encodeURIComponent(prefilledAsset.ticker)}`
          const response = await fetch(url)
          const data = await response.json()
          const asset = (data.assets || []).find(
            (a: Asset) => a.ticker === prefilledAsset.ticker
          )

          if (asset) {
            handleAssetSelect(asset)
          } else if (prefilledAsset.price !== undefined) {
            // Usar preço pré-preenchido se disponível
            setFormData((prev) => ({
              ...prev,
              ticker: prefilledAsset.ticker,
              quantity: "1",
              price: prefilledAsset.price?.toString() || "",
            }))
            // Criar asset temporário com dados disponíveis
            setSelectedAsset({
              ticker: prefilledAsset.ticker,
              name: prefilledAsset.name,
              currency: prefilledAsset.currency as "BRL" | "USD",
              market: "",
              price: prefilledAsset.price || 0,
              decimals: prefilledAsset.decimals || 2,
              minLotSize: 1,
            })
          } else {
            // Fallback: criar um ativo básico com os dados disponíveis
            setFormData((prev) => ({
              ...prev,
              ticker: prefilledAsset.ticker,
              quantity: "1",
              price: "",
            }))
          }
        } catch (error) {
          console.error("Error fetching prefilled asset:", error)
        }
      }

      fetchPrefilledAsset()
    }
  }, [isOpen, prefilledAsset, simulationDate, selectedAsset, handleAssetSelect])

  // Auto-select asset if initialTicker is provided
  useEffect(() => {
    if (initialTicker && isOpen) {
      setFormData((prev) => ({ ...prev, ticker: initialTicker }))
      searchAssets(initialTicker).then(() => {
        // Auto-select first result if it matches exactly
        setTimeout(() => {
          const exactMatch = assets.find(
            (asset) => asset.ticker === initialTicker
          )
          if (exactMatch) {
            handleAssetSelect(exactMatch)
          }
        }, 500)
      })
    }
  }, [initialTicker, isOpen, assets, handleAssetSelect, searchAssets])

  // Auto-select exact match when assets are loaded
  useEffect(() => {
    if (initialTicker && assets.length > 0 && !selectedAsset) {
      const exactMatch = assets.find((asset) => asset.ticker === initialTicker)
      if (exactMatch) {
        handleAssetSelect(exactMatch)
      }
    }
  }, [assets, initialTicker, selectedAsset, handleAssetSelect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAsset || !formData.quantity || !formData.price) {
      return
    }

    // Validar saldo disponível para compras no modo simulação
    if (mode === "buy" && simulationId && availableCash) {
      const totalCost = Number(formData.price) * Number(formData.quantity)
      const availableBalance =
        selectedAsset.currency === "BRL"
          ? availableCash.brl?.cashBalance || 0
          : availableCash.usd?.cashBalance || 0

      if (totalCost > availableBalance) {
        alert(
          `Saldo insuficiente! Você tem ${formatCurrency(availableBalance, selectedAsset.currency)} disponível, mas a compra custa ${formatCurrency(totalCost, selectedAsset.currency)}.`
        )
        return
      }
    }

    setLoading(true)
    setError(null) // Clear previous errors

    try {
      const endpoint = simulationId
        ? `/api/simulations/${simulationId}/transactions`
        : "/api/portfolio"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: selectedAsset.ticker,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
          currency: selectedAsset.currency,
          type: mode === "close" ? "sell" : mode,
        }),
      })

      if (response.ok) {
        onSuccess?.()
        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Erro ao processar transação")
        console.error("Transaction error:", errorData)
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
      console.error("Transaction error:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalValue =
    selectedAsset && formData.quantity && formData.price
      ? calculateTotal(
          Number(formData.price),
          Number(formData.quantity),
          selectedAsset.decimals
        )
      : 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            {mode === "buy"
              ? "Comprar Ação"
              : mode === "close"
                ? "Encerrar Posição"
                : "Vender Ação"}
            {simulationId && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                Simulação
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "buy"
              ? "Selecione um ativo e configure os detalhes da compra"
              : mode === "close"
                ? "Confirme o encerramento completo da posição"
                : "Configure os detalhes da venda do ativo selecionado"}
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Search */}
          <div className="space-y-2">
            <Label htmlFor="ticker">Ativo</Label>
            <div className="relative">
              <Input
                id="ticker"
                placeholder="Digite o código do ativo (ex: PETR4, AAPL)"
                value={formData.ticker}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase()
                  setFormData((prev) => ({ ...prev, ticker: value }))
                  searchAssets(value)
                }}
                className="pr-10"
              />
              {searching ? (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Asset Search Results */}
            {assets.length > 0 && !selectedAsset && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {assets.map((asset: Asset) => (
                  <button
                    key={asset.ticker}
                    type="button"
                    onClick={() => handleAssetSelect(asset)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-accent transition-colors border-b last:border-b-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{asset.ticker}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {asset.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {asset.market} • {asset.currency}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatPrice(
                            asset.price,
                            asset.decimals,
                            asset.currency
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Asset Info */}
          {selectedAsset && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedAsset.ticker}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAsset.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAsset.market} • {selectedAsset.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatPrice(
                        selectedAsset.price,
                        selectedAsset.decimals,
                        selectedAsset.currency
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Preço atual</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Details */}
          {selectedAsset && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={
                      mode === "close"
                        ? currentPosition?.quantity
                        : selectedAsset.minLotSize
                    }
                    max={
                      mode === "close" ? currentPosition?.quantity : undefined
                    }
                    step={selectedAsset.minLotSize}
                    placeholder={selectedAsset.minLotSize.toString()}
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    required
                    disabled={mode === "close"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {mode === "close"
                      ? `Encerrando posição: ${currentPosition?.quantity} ações`
                      : `Lote mínimo: ${selectedAsset.minLotSize} ações`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">
                    Preço por Ação
                    {simulationDate && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Preço fixo da simulação)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0.01"
                    step={`0.${"0".repeat(selectedAsset.decimals - 1)}1`}
                    placeholder={`0.${"0".repeat(selectedAsset.decimals)}`}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    readOnly={!!simulationDate}
                    disabled={!!simulationDate}
                    className={
                      simulationDate ? "bg-muted cursor-not-allowed" : ""
                    }
                    required
                  />
                  {simulationDate && (
                    <p className="text-xs text-muted-foreground">
                      Preço baseado na data da simulação: {simulationDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Transaction Summary */}
              {totalValue > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-medium">Total da Transação</span>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {formatPrice(totalValue, 2, selectedAsset.currency)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {formData.quantity} ações ×{" "}
                      {formatPrice(
                        Number(formData.price),
                        selectedAsset.decimals,
                        selectedAsset.currency
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Cash - only show for buy mode in simulation */}
              {mode === "buy" &&
                simulationId &&
                availableCash &&
                selectedAsset && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Saldo Disponível</span>
                        </div>
                        <div className="text-lg font-bold">
                          {formatCurrency(
                            selectedAsset.currency === "BRL"
                              ? availableCash.brl?.cashBalance || 0
                              : availableCash.usd?.cashBalance || 0,
                            selectedAsset.currency
                          )}
                        </div>
                      </div>
                      {totalValue > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Após a compra:{" "}
                          {formatCurrency(
                            (selectedAsset.currency === "BRL"
                              ? availableCash.brl?.cashBalance || 0
                              : availableCash.usd?.cashBalance || 0) -
                              totalValue,
                            selectedAsset.currency
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {mode === "sell" && currentPosition && (
              <Button
                type="button"
                variant="destructive"
                disabled={loading}
                onClick={async () => {
                  if (!selectedAsset || !currentPosition) return

                  setLoading(true)
                  try {
                    const endpoint = simulationId
                      ? `/api/simulations/${simulationId}/transactions`
                      : "/api/portfolio"

                    const response = await fetch(endpoint, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        ticker: selectedAsset.ticker,
                        quantity: currentPosition.quantity,
                        price: Number(formData.price),
                        currency: selectedAsset.currency,
                        type: "sell",
                      }),
                    })

                    if (response.ok) {
                      onSuccess?.()
                      handleClose()
                    } else {
                      const error = await response.json()
                      console.error("Close position error:", error)
                    }
                  } catch (error) {
                    console.error("Close position error:", error)
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Encerrar Posição
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !selectedAsset ||
                !formData.quantity ||
                !formData.price ||
                loading
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "buy" ? "Comprar" : "Vender"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
