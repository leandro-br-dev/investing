"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Construction, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TransactionsPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Construction className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Página em Construção</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            A página de histórico de transações está sendo desenvolvida.
            Em breve você poderá visualizar todo o histórico de suas
            operações de compra e venda.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Funcionalidades previstas:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Histórico completo de transações</li>
              <li>• Filtros por período e tipo</li>
              <li>• Exportação de dados</li>
              <li>• Análise de performance</li>
            </ul>
          </div>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}