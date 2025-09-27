"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Rocket, Calendar, DollarSign, Settings } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface NewSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function NewSimulationModal({
  isOpen,
  onClose,
  onSuccess
}: NewSimulationModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    startDate: "2022-01-01",
    initialCashBRL: "",
    initialCashUSD: "",
    monthlyDepositBRL: "",
    monthlyDepositUSD: "",
    minPurchaseIntervalDays: 90
  })

  // Load user preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadUserSettings = async () => {
        setLoadingSettings(true)
        try {
          const response = await fetch('/api/settings')
          if (response.ok) {
            const settings = await response.json()
            setFormData(prev => ({
              ...prev,
              minPurchaseIntervalDays: settings.minPurchaseIntervalDays || 90
            }))
          }
        } catch (error) {
          console.error('Error loading user settings:', error)
        } finally {
          setLoadingSettings(false)
        }
      }
      loadUserSettings()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.startDate) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/simulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          startDate: formData.startDate,
          initialCashBRL: Number(formData.initialCashBRL) || 0,
          initialCashUSD: Number(formData.initialCashUSD) || 0,
          monthlyDepositBRL: Number(formData.monthlyDepositBRL) || 0,
          monthlyDepositUSD: Number(formData.monthlyDepositUSD) || 0,
          minPurchaseIntervalDays: Number(formData.minPurchaseIntervalDays) || 90
        }),
      })

      if (response.ok) {
        onSuccess?.()
        onClose()
        setFormData({
          name: "",
          startDate: "2022-01-01",
          initialCashBRL: "",
          initialCashUSD: "",
          monthlyDepositBRL: "",
          monthlyDepositUSD: "",
          minPurchaseIntervalDays: 90
        })
      } else {
        const error = await response.json()
        console.error('Simulation creation error:', error)
      }
    } catch (error) {
      console.error('Simulation creation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalInitial = (Number(formData.initialCashBRL) || 0) + (Number(formData.initialCashUSD) || 0)
  const totalMonthly = (Number(formData.monthlyDepositBRL) || 0) + (Number(formData.monthlyDepositUSD) || 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Rocket className="mr-2 h-5 w-5" />
            Nova Simulação
          </DialogTitle>
          <DialogDescription>
            Configure uma nova simulação de investimentos com dados históricos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Simulação</Label>
              <Input
                id="name"
                placeholder="Ex: Estratégia Conservadora, Growth Agressivo..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-xs text-muted-foreground">
                A simulação começará nesta data usando preços históricos
              </p>
            </div>
          </div>

          {/* Initial Capital */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Capital Inicial</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Pelo menos uma moeda deve ter capital inicial maior que zero
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialCashBRL">Capital BRL</Label>
                <Input
                  id="initialCashBRL"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.initialCashBRL}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialCashBRL: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialCashUSD">Capital USD</Label>
                <Input
                  id="initialCashUSD"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.initialCashUSD}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialCashUSD: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Monthly Deposits */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Aportes Mensais (Opcional)</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyDepositBRL">Aporte BRL</Label>
                <Input
                  id="monthlyDepositBRL"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monthlyDepositBRL}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyDepositBRL: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyDepositUSD">Aporte USD</Label>
                <Input
                  id="monthlyDepositUSD"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monthlyDepositUSD}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyDepositUSD: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Strategy Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Configurações da Estratégia</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Regras específicas para esta simulação (baseadas nas suas preferências globais)
            </p>

            <div className="space-y-2">
              <Label htmlFor="minPurchaseIntervalDays">Intervalo Mínimo Entre Compras (dias)</Label>
              <Input
                id="minPurchaseIntervalDays"
                type="number"
                min="0"
                max="365"
                value={formData.minPurchaseIntervalDays}
                onChange={(e) => setFormData(prev => ({ ...prev, minPurchaseIntervalDays: Number(e.target.value) || 90 }))}
                disabled={loadingSettings}
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo em dias antes de comprar novamente o mesmo ativo. 0 = sem limite, 90 dias = ~3 meses.
                Esta configuração só se aplica enquanto você possui o ativo.
              </p>
            </div>
          </div>

          {/* Summary */}
          {totalInitial > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Capital Inicial Total</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalInitial, "USD")}
                    </span>
                  </div>
                  {totalMonthly > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Aportes Mensais</span>
                      <span className="font-medium">
                        {formatCurrency(totalMonthly, "USD")}/mês
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!formData.name || !formData.startDate || (Number(formData.initialCashBRL || 0) === 0 && Number(formData.initialCashUSD || 0) === 0) || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Simulação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}