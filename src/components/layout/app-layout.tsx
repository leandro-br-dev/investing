"use client"

import { ReactNode } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { MainNav } from "@/components/navigation/main-nav"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Não mostrar navegação em páginas de autenticação
  const isAuthPage = pathname?.startsWith("/auth")

  // Se for página de auth, mostrar apenas o conteúdo
  if (isAuthPage) {
    return <>{children}</>
  }

  // Se não estiver autenticado e não for página de auth, mostrar apenas conteúdo
  // O middleware redirecionará para login
  if (status === "loading") {
    return (
      <div className="h-screen-safe flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return <>{children}</>
  }

  // Layout completo para usuários autenticados
  return (
    <div className="h-screen-safe flex flex-col lg:flex-row">
      {/* Navigation */}
      <MainNav />

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-72">
        {/* Mobile spacing for header + bottom nav */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-background",
          "pt-12 pb-16 lg:pt-0 lg:pb-0", // Space for header + bottom nav on mobile
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}