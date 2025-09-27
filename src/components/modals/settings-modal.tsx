"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-provider"
import { Settings, User, Palette, Save, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [formData, setFormData] = useState({
    displayName: "Investor",
    email: "investor@example.com",
    buyPeriod: "12",
    sellPeriod: "24",
    defaultCurrency: "BRL",
    notifications: {
      opportunities: true,
      portfolio: false,
      simulations: true
    }
  })

  const [showDangerZone, setShowDangerZone] = useState(false)

  const handleSave = () => {
    console.log("Settings saved:", formData)
    onClose()
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data? This action cannot be undone.")) {
      console.log("Data reset confirmed")
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Theme Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Palette className="mr-2 h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium">Theme Preference</label>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                >
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <User className="mr-2 h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Investment Strategy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Settings className="mr-2 h-4 w-4" />
              Investment Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Buy Period (Months)</label>
                <Input
                  type="number"
                  value={formData.buyPeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyPeriod: e.target.value }))}
                  min="1"
                  max="60"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Period for minimum price calculation
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Sell Period (Months)</label>
                <Input
                  type="number"
                  value={formData.sellPeriod}
                  onChange={(e) => setFormData(prev => ({ ...prev, sellPeriod: e.target.value }))}
                  min="1"
                  max="120"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Period for maximum price calculation
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Default Currency</label>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant={formData.defaultCurrency === "BRL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, defaultCurrency: "BRL" }))}
                >
                  🇧🇷 BRL
                </Button>
                <Button
                  variant={formData.defaultCurrency === "USD" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, defaultCurrency: "USD" }))}
                >
                  🇺🇸 USD
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "opportunities", label: "Investment Opportunities", description: "Notify when assets reach buying opportunities" },
              { key: "portfolio", label: "Portfolio Updates", description: "Daily portfolio performance summary" },
              { key: "simulations", label: "Simulation Alerts", description: "Notifications from active simulations" }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      [item.key]: !prev.notifications[item.key as keyof typeof prev.notifications]
                    }
                  }))}
                  className={cn(
                    formData.notifications[item.key as keyof typeof formData.notifications]
                      ? "bg-primary text-primary-foreground"
                      : ""
                  )}
                >
                  {formData.notifications[item.key as keyof typeof formData.notifications] ? "Enabled" : "Disabled"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive text-base">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Advanced Options</p>
                  <p className="text-sm text-muted-foreground">
                    Access data management and account deletion options
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDangerZone(!showDangerZone)}
                >
                  {showDangerZone ? "Hide" : "Show"}
                </Button>
              </div>

              {showDangerZone && (
                <div className="pt-3 border-t border-destructive/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Reset All Data</p>
                      <p className="text-sm text-muted-foreground">
                        This will delete all your portfolio and simulation data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleReset}>
                      <AlertTriangle className="mr-2 h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  )
}