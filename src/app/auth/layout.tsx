import { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Layout simples para páginas de autenticação, sem AppLayout
  return (
    <div className="auth-layout">
      {children}
    </div>
  )
}