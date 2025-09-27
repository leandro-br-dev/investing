"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Briefcase,
  Play,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  History,
  Shield,
  TrendingUp
} from "lucide-react"

import { useTheme } from "@/lib/theme-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Painel",
    href: "/",
    icon: BarChart3,
    description: "Oportunidades de investimento"
  },
  {
    name: "Carteira",
    href: "/portfolio",
    icon: Briefcase,
    description: "Gestão de carteira"
  },
  {
    name: "Simulador",
    href: "/simulator",
    icon: Play,
    description: "Simulações de estratégia"
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Shield,
    description: "Yahoo Finance API"
  },
  {
    name: "Configurações",
    href: "/settings",
    icon: Settings,
    description: "Configurações do sistema"
  },
]

interface MainNavProps {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname()
  const { theme, setTheme, actualTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  const getThemeIcon = () => {
    if (theme === "light") return <Sun className="h-4 w-4" />
    if (theme === "dark") return <Moon className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-72 lg:bg-card lg:border-r",
        className
      )}>
        {/* Logo/Header */}
        <div className="flex h-16 shrink-0 items-center border-b px-6">
          <Link href="/" className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gradient">Investing</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs opacity-75">{item.description}</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>

        {/* Theme Toggle & Footer */}
        <div className="border-t p-6">
          <Button
            variant="outline"
            size="sm"
            onClick={cycleTheme}
            className="w-full justify-start"
          >
            {getThemeIcon()}
            <span className="ml-2">
              Theme: {theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}
            </span>
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40">
        <div className="flex h-12 items-center justify-between border-b bg-background/95 backdrop-blur px-3">
          <Link href="/" className="flex items-center space-x-1.5">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-base font-bold text-gradient">Investing</span>
          </Link>

          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={cycleTheme} className="h-8 w-8 p-0">
              {getThemeIcon()}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="relative z-50 lg:hidden">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
            <div className="fixed inset-0 flex">
              <div className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-6 w-6 text-foreground" />
                  </button>
                </div>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <span className="ml-2 text-xl font-bold">Investing</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={cn(
                                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                  )}
                                >
                                  <item.icon className="h-6 w-6 shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{item.name}</span>
                                    <span className="text-xs opacity-75">{item.description}</span>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur safe-area-inset-bottom">
        <nav className="flex">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center py-2 px-1 text-xs transition-colors min-h-[3rem]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}