"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Construction, BarChart3, TrendingUp, Target, Shield, ArrowLeft, Home } from 'lucide-react'

export default function AnalysisPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Análise Fundamentalista</h1>
          <p className="text-muted-foreground">
            Sistema avançado de análise fundamentalista para Value Investing
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Construction Alert */}
      <Alert className="border-yellow-500 bg-yellow-50 text-yellow-800">
        <Construction className="h-4 w-4" />
        <AlertDescription>
          <strong>Página em Construção</strong> - O sistema de análise fundamentalista está sendo desenvolvido.
          Em breve você poderá analisar ativos usando métricas avançadas de Value Investing.
        </AlertDescription>
      </Alert>

      {/* Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Score Geral
            </CardTitle>
            <CardDescription>Análise completa do ativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">--/100</div>
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Valor Intrínseco
            </CardTitle>
            <CardDescription>Baseado em Graham & Lynch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ --,--</div>
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Recomendação
            </CardTitle>
            <CardDescription>BUY, HOLD ou SELL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">--</div>
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Nível de Risco
            </CardTitle>
            <CardDescription>LOW, MEDIUM ou HIGH</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">--</div>
            <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Features Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-5 h-5" />
            Funcionalidades em Desenvolvimento
          </CardTitle>
          <CardDescription>
            O que estará disponível em breve no sistema de análise fundamentalista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📊 Métricas Fundamentalistas</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• P/E (Preço/Lucro)</li>
                <li>• P/VP (Preço/Valor Patrimonial)</li>
                <li>• ROE, ROA e ROIC</li>
                <li>• Dividend Yield</li>
                <li>• Margem de Segurança</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🎯 Value Investing</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Número de Graham</li>
                <li>• Valor Justo Peter Lynch</li>
                <li>• Fluxo de Caixa Descontado</li>
                <li>• Análise Comparativa do Setor</li>
                <li>• Score de Qualidade da Empresa</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📈 Análise Técnica</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Tendências de Crescimento</li>
                <li>• Saúde Financeira</li>
                <li>• Estabilidade dos Lucros</li>
                <li>• Crescimento de Receita</li>
                <li>• Análise de Dívidas</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">⚠️ Gestão de Riscos</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Classificação de Risco</li>
                <li>• Catalisadores de Crescimento</li>
                <li>• Riscos Identificados</li>
                <li>• Pontos Fortes e Fracos</li>
                <li>• Recomendações Automáticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center">
        <Link href="/dashboard">
          <Button size="lg">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}