import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Log para debug
    console.log(`Middleware: ${req.nextUrl.pathname} - Token: ${!!req.nextauth.token}`)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rotas públicas que não precisam de autenticação
        const publicRoutes = [
          "/auth/signin",
          "/auth/signup",
          "/api/auth",
          "/api/test-yahoo",
          "/api/test-yahoo-historical",
          "/api/test-update-status",
          "/api/test-quote-single",
          "/api/debug-assets",
          "/api/test-all-assets-status",
          "/api/test-bulk-historical",
          "/api/load-historical-20years",
          "/api/yahoo-finance/bulk-historical-20years",
        ]

        const { pathname } = req.nextUrl

        // Permitir acesso às rotas públicas
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }

        // Redirecionar usuários não autenticados para a página de login
        if (!token) {
          console.log(`Usuário não autenticado tentando acessar: ${pathname}`)
          return false // Isso vai redirecionar para a página de signin
        }

        // Usuário autenticado pode acessar todas as outras rotas
        return true
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

export const config = {
  matcher: [
    // Proteger todas as rotas exceto as listadas
    "/((?!api/auth|auth/signin|auth/signup|_next/static|_next/image|favicon.ico).*)",
  ],
}