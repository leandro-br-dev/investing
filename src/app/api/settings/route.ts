import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: (session as unknown).user.id },
    })

    if (!userSettings) {
      // Create default settings if they don't exist
      const defaultSettings = await prisma.userSettings.create({
        data: {
          userId: (session as unknown).user.id,
          buyPeriodMonths: 12,
          sellPeriodMonths: 24,
          minPurchaseIntervalDays: 90,
          theme: "system",
        },
      })
      return NextResponse.json(defaultSettings)
    }

    return NextResponse.json(userSettings)
  } catch (error) {
    console.error("Error fetching user settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !(session as unknown).user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      buyPeriodMonths,
      sellPeriodMonths,
      minPurchaseIntervalDays,
      theme,
      defaultCurrency,
    } = body

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: (session as unknown).user.id },
      update: {
        ...(buyPeriodMonths !== undefined && { buyPeriodMonths }),
        ...(sellPeriodMonths !== undefined && { sellPeriodMonths }),
        ...(minPurchaseIntervalDays !== undefined && {
          minPurchaseIntervalDays,
        }),
        ...(theme !== undefined && { theme }),
      },
      create: {
        userId: (session as unknown).user.id,
        buyPeriodMonths: buyPeriodMonths || 12,
        sellPeriodMonths: sellPeriodMonths || 24,
        minPurchaseIntervalDays: minPurchaseIntervalDays || 90,
        theme: theme || "system",
      },
    })

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("Error updating user settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
