import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes safely
 * Combines clsx with tailwind-merge to handle conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values for display
 * Safe for SSR/hydration
 */
export function formatCurrency(
  value: number,
  currency: "BRL" | "USD" = "USD",
  options: Intl.NumberFormatOptions = {}
): string {
  // Validate input
  if (typeof value !== "number" || isNaN(value)) {
    return currency === "BRL" ? "R$ 0,00" : "$0.00"
  }

  const defaults: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }

  const locale = currency === "BRL" ? "pt-BR" : "en-US"

  try {
    return new Intl.NumberFormat(locale, { ...defaults, ...options }).format(value)
  } catch (error) {
    // Fallback for SSR or formatting errors
    const symbol = currency === "BRL" ? "R$" : "$"
    return `${symbol} ${value.toFixed(2)}`
  }
}

/**
 * Format percentage values for display
 */
export function formatPercentage(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const defaults: Intl.NumberFormatOptions = {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }

  return new Intl.NumberFormat("en-US", { ...defaults, ...options }).format(value / 100)
}

/**
 * Format numbers for display
 */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  const defaults = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }

  return new Intl.NumberFormat("en-US", { ...defaults, ...options }).format(value)
}

/**
 * Format dates for display
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const defaults = {
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
  }

  let dateObj: Date

  if (typeof date === "string") {
    // Se for uma string, tentar diferentes formatos
    if (date.includes("/")) {
      // Formato DD/MM/YYYY ou MM/DD/YYYY
      dateObj = new Date(date)
    } else if (date.includes("-")) {
      // Formato YYYY-MM-DD (ISO)
      dateObj = new Date(date + "T00:00:00")
    } else {
      // Tentar parsing direto
      dateObj = new Date(date)
    }
  } else {
    dateObj = date
  }

  // Validar se a data é válida
  if (!dateObj || isNaN(dateObj.getTime())) {
    console.warn('Invalid date passed to formatDate:', date, 'parsed as:', dateObj)
    return 'Data inválida'
  }

  return new Intl.DateTimeFormat("pt-BR", { ...defaults, ...options }).format(dateObj)
}

/**
 * Format dates for API/database usage (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  // Validar se a data é válida
  if (!dateObj || isNaN(dateObj.getTime())) {
    console.warn('Invalid date passed to formatDateISO:', date)
    return new Date().toISOString().split("T")[0] // Retorna data atual como fallback
  }

  return dateObj.toISOString().split("T")[0]
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a random ID (simple implementation)
 * Uses crypto.randomUUID when available to avoid hydration issues
 */
export function generateId(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  // Fallback for server-side or older browsers
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate percentage change between two values
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Calculate weighted average price (for portfolio)
 */
export function calculateWeightedAverage(
  currentQuantity: number,
  currentPrice: number,
  newQuantity: number,
  newPrice: number
): number {
  const totalQuantity = currentQuantity + newQuantity
  if (totalQuantity === 0) return 0

  return ((currentQuantity * currentPrice) + (newQuantity * newPrice)) / totalQuantity
}

/**
 * Validate if a string is a valid ticker symbol
 */
export function isValidTicker(ticker: string): boolean {
  // Basic validation: 2-5 uppercase letters/numbers
  const tickerRegex = /^[A-Z0-9]{2,5}$/
  return tickerRegex.test(ticker.toUpperCase())
}

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currency: "BRL" | "USD"): string {
  const symbols = {
    BRL: "R$",
    USD: "$",
  }
  return symbols[currency]
}

/**
 * Get color class for percentage values (positive/negative)
 */
export function getPercentageColor(value: number): string {
  if (value > 0) return "text-success"
  if (value < 0) return "text-error"
  return "text-muted-foreground"
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + "..."
}

/**
 * Check if device is mobile based on screen width
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < 768
}

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === "undefined") return defaultValue

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Silent fail
    }
  },

  remove: (key: string): void => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.removeItem(key)
    } catch {
      // Silent fail
    }
  },
}
