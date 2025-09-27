import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter ao menos uma letra minúscula")
    .regex(/\d/, "Senha deve conter ao menos um número")
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validar dados de entrada
    const validatedData = registerSchema.parse(body)
    const { name, email, password } = validatedData

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "Este email já está cadastrado" },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    })

    // Criar configurações padrão do usuário
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        buyPeriodMonths: 12,
        sellPeriodMonths: 24,
        theme: "system"
      }
    })

    // Criar carteira padrão
    await prisma.portfolio.create({
      data: {
        userId: user.id,
        name: "Carteira Principal"
      }
    })

    return NextResponse.json(
      {
        message: "Usuário criado com sucesso",
        user
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}