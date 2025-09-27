"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { storage } from "./utils"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  actualTheme: "dark", // Default to dark based on old project
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "investing-theme",
  attribute = "class",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return storage.get(storageKey, defaultTheme)
    }
    return defaultTheme
  })

  const [actualTheme, setActualTheme] = useState<"dark" | "light">("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = window.document.documentElement

    // Remove previous theme classes
    root.classList.remove("light", "dark")

    let systemTheme: "dark" | "light" = "dark"

    if (theme === "system" && enableSystem) {
      systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    }

    const resolvedTheme = theme === "system" ? systemTheme : theme
    setActualTheme(resolvedTheme)

    if (attribute === "class") {
      root.classList.add(resolvedTheme)
    } else {
      root.setAttribute(attribute, resolvedTheme)
    }
  }, [theme, attribute, enableSystem, mounted])

  useEffect(() => {
    if (!mounted || !enableSystem) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light"
        setActualTheme(systemTheme)

        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        if (attribute === "class") {
          root.classList.add(systemTheme)
        } else {
          root.setAttribute(attribute, systemTheme)
        }
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, attribute, mounted, enableSystem])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      if (typeof window !== "undefined") {
        storage.set(storageKey, newTheme)
      }
      setTheme(newTheme)
    },
    actualTheme,
  }

  if (!mounted) {
    return null
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}