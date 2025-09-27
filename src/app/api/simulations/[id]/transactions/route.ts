import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session as unknown).user.id
    const simulationId = params.id
    const body = await req.json()
    const { ticker, quantity, price, currency, type = "buy" } = body

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

    // Verificar se a simulação pertence ao usuário
    const simulation = await prisma.simulation.findFirst({
      where: {
        id: simulationId,
        userId,
      },
    })

    if (!simulation) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 }
      )
    }

    // Verificar se o ativo existe
    const asset = await prisma.asset.findUnique({
      where: { ticker },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.currency !== currency) {
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 })
    }

    const totalCost = quantity * price

    if (type === "buy") {
      // Operação de compra
      const currentCash =
        currency === "BRL"
          ? simulation.currentCashBRL
          : simulation.currentCashUSD

      if (Number(currentCash) < totalCost) {
        return NextResponse.json(
          { error: "Insufficient cash for this transaction" },
          { status: 400 }
        )
      }

      // Verificar regra de intervalo mínimo entre compras (se possuir o ativo)
      const existingPosition = await prisma.simulationItem.findUnique({
        where: {
          simulationId_ticker: {
            simulationId,
            ticker,
          },
        },
      })

      if (existingPosition && simulation.minPurchaseIntervalDays > 0) {
        // Verificar última compra deste ativo
        const lastPurchase = await prisma.transaction.findFirst({
          where: {
            simulationId,
            ticker,
            type: "buy",
          },
          orderBy: {
            executedAt: "desc",
          },
        })

        if (lastPurchase) {
          const daysSinceLastPurchase = Math.floor(
            (new Date().getTime() -
              new Date(lastPurchase.executedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )

          if (daysSinceLastPurchase < simulation.minPurchaseIntervalDays) {
            const remainingDays =
              simulation.minPurchaseIntervalDays - daysSinceLastPurchase
            return NextResponse.json(
              {
                error: `Aguarde ${remainingDays} dia(s) antes de comprar ${ticker} novamente. Esta regra ajuda a evitar compras impulsivas e permite melhor aproveitamento das oportunidades.`,
              },
              { status: 400 }
            )
          }
        }
      }

      // Usar transação para garantir consistência
      await prisma.$transaction(async (tx) => {
        if (existingPosition) {
          // Atualizar posição existente (calcular novo preço médio)
          const newQuantity =
            Number(existingPosition.quantity) + Number(quantity)
          const newAvgPrice =
            (Number(existingPosition.quantity) *
              Number(existingPosition.avgPrice) +
              Number(quantity) * Number(price)) /
            newQuantity

          await tx.simulationItem.update({
            where: {
              simulationId_ticker: {
                simulationId,
                ticker,
              },
            },
            data: {
              quantity: newQuantity,
              avgPrice: Number(newAvgPrice.toFixed(2)),
            },
          })
        } else {
          // Criar nova posição
          await tx.simulationItem.create({
            data: {
              simulationId,
              ticker,
              quantity,
              avgPrice: price,
              currency,
            },
          })
        }

        // Atualizar cash da simulação
        const updateData =
          currency === "BRL"
            ? { currentCashBRL: Number(simulation.currentCashBRL) - totalCost }
            : { currentCashUSD: Number(simulation.currentCashUSD) - totalCost }

        await tx.simulation.update({
          where: { id: simulationId },
          data: updateData,
        })

        // Registrar transação
        await tx.transaction.create({
          data: {
            userId,
            simulationId,
            ticker,
            type: "buy",
            quantity,
            price,
            totalAmount: totalCost,
            currency,
          },
        })
      })

      return NextResponse.json(
        {
          message: "Buy transaction completed successfully",
          transaction: {
            type: "buy",
            ticker,
            quantity,
            price,
            currency,
            totalCost,
          },
        },
        { status: 201 }
      )
    } else if (type === "sell") {
      // Operação de venda
      const existingPosition = await prisma.simulationItem.findUnique({
        where: {
          simulationId_ticker: {
            simulationId,
            ticker,
          },
        },
      })

      if (!existingPosition) {
        return NextResponse.json(
          { error: "No position found for this asset" },
          { status: 400 }
        )
      }

      if (existingPosition.quantity < quantity) {
        return NextResponse.json(
          { error: "Insufficient quantity to sell" },
          { status: 400 }
        )
      }

      const totalReceived = quantity * price
      const soldCost = quantity * Number(existingPosition.avgPrice)
      const realizedProfit = totalReceived - soldCost

      // Usar transação para garantir consistência
      await prisma.$transaction(async (tx) => {
        if (existingPosition.quantity === quantity) {
          // Vender toda a posição
          await tx.simulationItem.delete({
            where: {
              simulationId_ticker: {
                simulationId,
                ticker,
              },
            },
          })
        } else {
          // Vender parte da posição
          await tx.simulationItem.update({
            where: {
              simulationId_ticker: {
                simulationId,
                ticker,
              },
            },
            data: {
              quantity: Number(existingPosition.quantity) - quantity,
            },
          })
        }

        // Atualizar cash e lucro realizado da simulação
        const updateData =
          currency === "BRL"
            ? {
                currentCashBRL:
                  Number(simulation.currentCashBRL) + totalReceived,
                realizedProfitBRL:
                  Number(simulation.realizedProfitBRL) + realizedProfit,
              }
            : {
                currentCashUSD:
                  Number(simulation.currentCashUSD) + totalReceived,
                realizedProfitUSD:
                  Number(simulation.realizedProfitUSD) + realizedProfit,
              }

        await tx.simulation.update({
          where: { id: simulationId },
          data: updateData,
        })

        // Registrar transação
        await tx.transaction.create({
          data: {
            userId,
            simulationId,
            ticker,
            type: "sell",
            quantity,
            price,
            totalAmount: totalReceived,
            currency,
          },
        })
      })

      return NextResponse.json(
        {
          message: "Sell transaction completed successfully",
          transaction: {
            type: "sell",
            ticker,
            quantity,
            price,
            currency,
            totalReceived,
            realizedProfit,
          },
        },
        { status: 201 }
      )
    } else {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error processing simulation transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
