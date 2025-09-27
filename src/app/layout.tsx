import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-provider"
import { AuthProvider } from "@/components/providers/session-provider"
import { AppLayout } from "@/components/layout/app-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Investing - Sistema de Análise de Investimentos",
    template: "%s | Investing"
  },
  description: "Sistema moderno de análise e simulação de investimentos para estratégias de Value Investing. Dashboard de oportunidades, simulações históricas e gestão de carteira profissional.",
  keywords: ["investimentos", "value investing", "análise financeira", "simulação", "carteira", "dashboard", "bolsa de valores"],
  authors: [{ name: "Investing Team" }],
  creator: "Investing Platform",
  publisher: "Investing",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    title: 'Investing - Sistema de Análise de Investimentos',
    description: 'Sistema moderno de análise e simulação de investimentos para estratégias de Value Investing.',
    siteName: 'Investing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Investing - Sistema de Análise de Investimentos',
    description: 'Sistema moderno de análise e simulação de investimentos para estratégias de Value Investing.',
  },
  robots: {
    index: false, // Private application
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AppLayout>
              {children}
            </AppLayout>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
