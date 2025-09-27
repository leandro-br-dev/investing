"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Play, Calendar, DollarSign, Target } from "lucide-react"

interface SimulationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SimulationModal({ isOpen, onClose }: SimulationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    startDate: "2023-01-01",
    initialBalance: "100000",
    strategy: "conservative",
    description: ""
  })

  const strategies = [
    { id: "conservative", name: "Conservative", description: "Low risk, steady growth" },
    { id: "balanced", name: "Balanced", description: "Moderate risk and return" },
    { id: "aggressive", name: "Aggressive", description: "High risk, high potential return" },
    { id: "value", name: "Value Investing", description: "Buy undervalued assets" },
    { id: "growth", name: "Growth", description: "Focus on growth stocks" }
  ]

  const handleSubmit = () => {
    const newSimulation = {
      ...formData,
      initialBalance: parseFloat(formData.initialBalance),
      createdAt: new Date().toISOString(),
      currentDate: formData.startDate,
      isActive: false
    }

    console.log("New Simulation:", newSimulation)
    onClose()
  }

  const isValid = formData.name.trim() && parseFloat(formData.initialBalance) > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Simulation"
      size="lg"
    >
      <div className="space-y-6">
        {/* Simulation Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Simulation Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Investment Strategy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium mb-2">Initial Balance (USD)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={formData.initialBalance}
              onChange={(e) => setFormData(prev => ({ ...prev, initialBalance: e.target.value }))}
              placeholder="100000"
              min="1000"
              step="1000"
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Minimum: {formatCurrency(1000, "USD")}
          </p>
        </div>

        {/* Strategy Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Investment Strategy</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map((strategy) => (
              <Card
                key={strategy.id}
                variant={formData.strategy === strategy.id ? "elevated" : "outline"}
                className={`cursor-pointer transition-colors ${
                  formData.strategy === strategy.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setFormData(prev => ({ ...prev, strategy: strategy.id }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start">
                    <Target className="mr-2 h-4 w-4 mt-0.5 text-primary" />
                    <div>
                      <h4 className="font-medium">{strategy.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {strategy.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your simulation goals and approach..."
            className="w-full p-3 border border-border rounded-md bg-background text-foreground resize-none h-20"
          />
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <Play className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">Simulation Summary</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date:</span>
                <span>{formatDate(formData.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Initial Balance:</span>
                <span className="font-medium">
                  {formatCurrency(parseFloat(formData.initialBalance) || 0, "USD")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strategy:</span>
                <span>
                  {strategies.find(s => s.id === formData.strategy)?.name || "Not selected"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1"
          >
            <Play className="mr-2 h-4 w-4" />
            Create Simulation
          </Button>
        </div>
      </div>
    </Modal>
  )
}