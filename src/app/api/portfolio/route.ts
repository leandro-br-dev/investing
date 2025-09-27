import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const currency = searchParams.get("currency")

    // Buscar carteira do usuário
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: (session as any).user.id },
      include: {
        items: {
          where: currency ? { currency } : undefined,
          include: {
            asset: {
              include: {
                historicalPrices: {
                  orderBy: { date: 'desc' },
                  take: 1
                }
              }
            }
          }
        }
      }
    })

    if (!portfolio) {
      return NextResponse.json({ positions: [], summary: null })
    }

    // Calcular dados das posições
    const positions = portfolio.items.map(item => {
      const currentPrice = Number(item.asset.historicalPrices[0]?.close || item.avgPrice)
      const quantity = Number(item.quantity)
      const avgPrice = Number(item.avgPrice)
      const currentValue = quantity * currentPrice
      const investedAmount = quantity * avgPrice
      const profitLoss = currentValue - investedAmount
      const profitLossPercent = (profitLoss / investedAmount) * 100

      return {
        ticker: item.ticker,
        name: item.asset.name,
        quantity,
        averagePrice: avgPrice,
        currentPrice,
        currentValue,
        investedAmount,
        profitLoss,
        profitLossPercent: Number(profitLossPercent.toFixed(2)),
        currency: item.currency,
        lastUpdate: item.asset.historicalPrices[0]?.date || item.updatedAt.toISOString().split('T')[0]
      }
    })

    // Calcular resumo
    const totalCurrentValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0)
    const totalInvested = positions.reduce((sum, pos) => sum + pos.investedAmount, 0)
    const totalProfitLoss = totalCurrentValue - totalInvested
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

    const summary = {
      totalCurrentValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercent: Number(totalProfitLossPercent.toFixed(2)),
      positionsCount: positions.length,
      currency
    }

    return NextResponse.json({
      positions,
      summary,
      portfolioId: portfolio.id
    })

  } catch (error) {
    console.error('Error fetching portfolio:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as any).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { ticker, quantity, price, currency, type } = body

    // Validações básicas
    if (!ticker || !quantity || !price || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (quantity <= 0 || price <= 0) {
      return NextResponse.json(
        { error: "Quantity and price must be positive" },
        { status: 400 }
      )
    }

    // Verificar tipo de transação válido
    if (!type || !['buy', 'sell'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type. Must be 'buy' or 'sell'" },
        { status: 400 }
      )
    }

    // Verificar se o ativo existe
    const asset = await prisma.asset.findUnique({
      where: { ticker }
    })

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      )
    }

    if (asset.currency !== currency) {
      return NextResponse.json(
        { error: "Currency mismatch" },
        { status: 400 }
      )
    }

    // Buscar carteira do usuário
    let portfolio = await prisma.portfolio.findFirst({
      where: { userId: (session as any).user.id }
    })

    if (!portfolio) {
      // Verificar se o usuário existe
      const userExists = await prisma.user.findUnique({
        where: { id: (session as any).user.id }
      })

      if (!userExists) {
        return NextResponse.json(
          { error: "User not found in database" },
          { status: 400 }
        )
      }

      // Criar carteira se não existir
      portfolio = await prisma.portfolio.create({
        data: {
          userId: (session as any).user.id,
          name: "Carteira Principal"
        }
      })
    }

    // Verificar se já existe posição para este ativo
    const existingPosition = await prisma.portfolioItem.findFirst({
      where: {
        portfolioId: portfolio.id,
        ticker
      }
    })

    // Verificar regra de intervalo mínimo entre compras (apenas para compras e se possuir o ativo)
    if (type === 'buy' && existingPosition) {
      // Buscar configurações do usuário
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: (session as any).user.id }
      })

      if (userSettings && userSettings.minPurchaseIntervalDays > 0) {
        // Verificar última compra deste ativo
        const lastPurchase = await prisma.transaction.findFirst({
          where: {
            userId: (session as any).user.id,
            portfolioId: portfolio.id,
            ticker,
            type: "buy"
          },
          orderBy: {
            executedAt: "desc"
          }
        })

        if (lastPurchase) {
          const daysSinceLastPurchase = Math.floor(
            (new Date().getTime() - new Date(lastPurchase.executedAt).getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSinceLastPurchase < userSettings.minPurchaseIntervalDays) {
            const remainingDays = userSettings.minPurchaseIntervalDays - daysSinceLastPurchase
            return NextResponse.json(
              {
                error: `Aguarde ${remainingDays} dia(s) antes de comprar ${ticker} novamente. Esta regra ajuda a evitar compras impulsivas e permite melhor aproveitamento das oportunidades.`
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      let portfolioResult

      if (type === 'buy') {
        if (existingPosition) {
          // Atualizar posição existente (calcular novo preço médio)
          const newQuantity = Number(existingPosition.quantity) + Number(quantity)
          const newAvgPrice = (
            (Number(existingPosition.quantity) * Number(existingPosition.avgPrice)) +
            (Number(quantity) * Number(price))
          ) / newQuantity

          portfolioResult = await tx.portfolioItem.update({
            where: {
              id: existingPosition.id
            },
            data: {
              quantity: Number(newQuantity),
              avgPrice: Number(newAvgPrice.toFixed(2))
            }
          })
        } else {
          // Verificar se o ativo existe na tabela Asset
          const assetExists = await tx.asset.findUnique({
            where: { ticker }
          })

          if (!assetExists) {
            throw new Error(`Asset ${ticker} not found in database. Please ensure the asset is properly registered.`)
          }

          // Criar nova posição
          portfolioResult = await tx.portfolioItem.create({
            data: {
              portfolioId: portfolio.id,
              ticker,
              quantity: Number(quantity),
              avgPrice: Number(price.toFixed(2)),
              currency
            }
          })
        }
      } else if (type === 'sell') {
        if (!existingPosition) {
          throw new Error(`No position found for ${ticker}. Cannot sell what you don't own.`)
        }

        if (Number(existingPosition.quantity) < Number(quantity)) {
          throw new Error(`Insufficient quantity. You have ${existingPosition.quantity} but trying to sell ${quantity}.`)
        }

        const newQuantity = Number(existingPosition.quantity) - Number(quantity)

        if (newQuantity === 0) {
          // Remover posição se quantidade chegar a zero
          await tx.portfolioItem.delete({
            where: { id: existingPosition.id }
          })
          portfolioResult = null
        } else {
          // Atualizar quantidade (preço médio permanece o mesmo)
          portfolioResult = await tx.portfolioItem.update({
            where: { id: existingPosition.id },
            data: {
              quantity: Number(newQuantity.toFixed(8))
            }
          })
        }
      }

      // Registrar transação
      await tx.transaction.create({
        data: {
          userId: (session as any).user.id,
          portfolioId: portfolio.id,
          ticker,
          type,
          quantity: Number(quantity),
          price: Number(price.toFixed(2)),
          totalAmount: Number((quantity * price).toFixed(2)),
          currency
        }
      })

      return portfolioResult
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Error creating portfolio position:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}