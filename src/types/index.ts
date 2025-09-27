// Basic types for the investing app
export type Currency = "BRL" | "USD"

export type AssetType = "stock" | "index"

export interface Asset {
  ticker: string
  name: string
  currency: Currency
  market: string
  type: AssetType
}

export interface HistoricalPrice {
  id: string
  ticker: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface Opportunity {
  ticker: string
  currentPrice: number
  currency: Currency
  minPrice: number
  maxPrice: number
  proximityPercentage: number // Distance from minimum
  returnPotential: number // Potential return to maximum
  lastUpdate: string
}

export interface PortfolioPosition {
  id: string
  userId: string
  ticker: string
  quantity: number
  averagePrice: number
  currency: Currency
  currentPrice?: number
  currentValue?: number
  profitLoss?: number
  profitLossPercentage?: number
  distanceToTarget?: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  userId: string
  ticker: string
  type: "buy" | "sell"
  quantity: number
  price: number
  currency: Currency
  date: string
  createdAt: string
}

export interface Simulation {
  id: string
  userId: string
  name: string
  startDate: string
  currentDate: string
  initialBalanceBRL: number
  initialBalanceUSD: number
  currentBalanceBRL: number
  currentBalanceUSD: number
  monthlyContributionBRL: number
  monthlyContributionUSD: number
  totalInvested: number
  totalValue: number
  totalReturn: number
  totalReturnPercentage: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SimulationPosition {
  id: string
  simulationId: string
  ticker: string
  quantity: number
  averagePrice: number
  currency: Currency
  createdAt: string
}

export interface SimulationTransaction {
  id: string
  simulationId: string
  ticker: string
  type: "buy" | "sell"
  quantity: number
  price: number
  currency: Currency
  date: string
  realizedGain?: number
  createdAt: string
}

export interface UserSettings {
  id: string
  userId: string
  buyPeriodMonths: number // Default: 12
  sellPeriodMonths: number // Default: 24
  minPurchaseIntervalDays: number // Default: 90 (minimum days between purchases of same asset)
  theme: "light" | "dark" | "system"
  defaultCurrency: Currency
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Component Props types
export interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends ComponentProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: "button" | "submit" | "reset"
}

export interface CardProps extends ComponentProps {
  variant?: "default" | "elevated" | "outline"
  padding?: "sm" | "md" | "lg"
}

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, item: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  emptyMessage?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (key: string) => void
  className?: string
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface BuyForm {
  ticker: string
  quantity: number
  price: number
  currency: Currency
}

export interface SellForm {
  ticker: string
  quantity: number
  price: number
}

export interface SimulationForm {
  name: string
  startDate: string
  initialBalanceBRL: number
  initialBalanceUSD: number
  monthlyContributionBRL: number
  monthlyContributionUSD: number
}

// Investment strategy types (from old project analysis)
export interface InvestmentStrategy {
  buyPeriodMonths: number
  sellPeriodMonths: number
  minProximityThreshold: number // Minimum distance from min to consider buying
  maxReturnThreshold: number // Minimum potential return to consider buying
}

// Chart data types
export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface ChartConfig {
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  color?: string
  currency?: Currency
}

// Dashboard types
export interface DashboardMetrics {
  totalValue: number
  totalInvested: number
  totalReturn: number
  totalReturnPercentage: number
  balanceBRL: number
  balanceUSD: number
  opportunitiesCount: number
  positionsCount: number
}

// Navigation types
export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  disabled?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

// Loading and error states
export interface LoadingState {
  loading: boolean
  error?: string
}

export interface AsyncState<T> extends LoadingState {
  data?: T
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>