import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { ticker, name, currency, market } = await req.json()

    if (!ticker || !name || !currency || !market) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verificar se já existe
    const existing = await prisma.asset.findUnique({
      where: { ticker }
    })

    if (existing) {
      return NextResponse.json(
        { message: "Asset already exists", asset: existing },
        { status: 200 }
      )
    }

    // Criar ativo
    const asset = await prisma.asset.create({
      data: {
        ticker,
        name,
        currency,
        market
      }
    })

    return NextResponse.json({
      message: "Asset created successfully",
      asset
    })

  } catch (error) {
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}