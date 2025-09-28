import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Usuário já existe com este email" },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar o usuário
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

    console.log(`✅ Novo usuário criado: ${user.email}`)

    return NextResponse.json({
      message: "Usuário criado com sucesso",
      user
    })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)

    // Verificar se é erro de banco de dados (tabela inexistente)
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: "Sistema em configuração. Tente novamente em alguns minutos." },
        { status: 503 }
      )
    }

    // Erro de duplicação de usuário
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "Usuário já existe com este email" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}