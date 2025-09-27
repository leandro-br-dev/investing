"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, User, Palette, Database, Shield, Bell, Loader2 } from "lucide-react"
import { useTheme } from "@/lib/theme-provider"
import { cn } from "@/lib/utils"
import { UserSettings } from "@/types"

export default function SettingsPage() {
  const { data: session } = useSession()
  const { theme, setTheme, actualTheme } = useTheme()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    buyPeriodMonths: 12,
    sellPeriodMonths: 24,
    minPurchaseIntervalDays: 90,
    defaultCurrency: "BRL" as "BRL" | "USD"
  })
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: ""
  })

  useEffect(() => {
    fetchSettings()
    if (session?.user) {
      setUserProfile({
        name: session.user.name || "",
        email: session.user.email || ""
      })
    }
  }, [session])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings: UserSettings = await response.json()
        setUserSettings(settings)
        setFormData({
          buyPeriodMonths: settings.buyPeriodMonths,
          sellPeriodMonths: settings.sellPeriodMonths,
          minPurchaseIntervalDays: settings.minPurchaseIntervalDays || 90,
          defaultCurrency: settings.defaultCurrency
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setUserSettings(updatedSettings)
        console.log('✅ Configurações salvas com sucesso')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e configurações da aplicação
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 lg:max-w-4xl">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Aparência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Preferência de Tema</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Tema atual: {actualTheme === 'light' ? 'claro' : actualTheme === 'dark' ? 'escuro' : 'sistema'} (preferência: {theme === 'light' ? 'claro' : theme === 'dark' ? 'escuro' : 'sistema'})
              </p>
              <div className="flex space-x-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  Claro
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  Escuro
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                >
                  Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Estratégia de Investimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando configurações...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Período de Compra (Meses)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Período para cálculo do preço mínimo de referência
                    </p>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.buyPeriodMonths}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        buyPeriodMonths: parseInt(e.target.value) || 12
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Período de Venda (Meses)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Período para cálculo do preço máximo de referência
                    </p>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.sellPeriodMonths}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        sellPeriodMonths: parseInt(e.target.value) || 24
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Intervalo Entre Compras (Dias)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Tempo mínimo entre compras do mesmo ativo para preço médio
                    </p>
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      value={formData.minPurchaseIntervalDays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        minPurchaseIntervalDays: parseInt(e.target.value) || 90
                      }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      0 = sem limite, 90 = ~3 meses (recomendado)
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Moeda Padrão</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Moeda preferida para novas operações
                  </p>
                  <div className="flex space-x-2">
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
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="min-w-32"
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {saving ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Perfil do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome de Exibição</Label>
              <Input value={userProfile.name} className="mt-1" disabled />
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input value={userProfile.email} className="mt-1" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar essas informações, entre em contato com o suporte ou gerencie sua conta através do provedor de autenticação.
            </p>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Gestão de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Atualizar Dados do Mercado</p>
                <p className="text-sm text-muted-foreground">
                  Última atualização: 2 horas atrás
                </p>
              </div>
              <Button variant="outline">Atualizar Agora</Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Exportar Dados da Carteira</p>
                <p className="text-sm text-muted-foreground">
                  Baixe sua carteira em formato CSV
                </p>
              </div>
              <Button variant="outline">Exportar</Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Importar Dados Históricos</p>
                <p className="text-sm text-muted-foreground">
                  Importe posições de outras plataformas
                </p>
              </div>
              <Button variant="outline">Importar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Oportunidades de Investimento</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando ativos atingirem oportunidades de compra
                </p>
              </div>
              <Button variant="outline" size="sm">
                Ativado
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Atualizações da Carteira</p>
                <p className="text-sm text-muted-foreground">
                  Resumo diário do desempenho da carteira
                </p>
              </div>
              <Button variant="outline" size="sm">
                Desativado
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Alertas de Simulação</p>
                <p className="text-sm text-muted-foreground">
                  Notificações de simulações ativas
                </p>
              </div>
              <Button variant="outline" size="sm">
                Ativado
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Alterar Senha</Label>
              <div className="space-y-2 mt-2">
                <Input type="password" placeholder="Senha atual" disabled />
                <Input type="password" placeholder="Nova senha" disabled />
                <Input type="password" placeholder="Confirmar nova senha" disabled />
              </div>
              <Button className="mt-3" disabled>Atualizar Senha</Button>
              <p className="text-xs text-muted-foreground mt-2">
                A alteração de senha deve ser feita através do seu provedor de autenticação.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Resetar Todos os Dados</p>
                <p className="text-sm text-muted-foreground">
                  Isso excluirá todos os dados da sua carteira e simulações
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Resetar
              </Button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Excluir Conta</p>
                <p className="text-sm text-muted-foreground">
                  Excluir permanentemente sua conta e todos os dados associados
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}