"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface GridTemplateProps {
  children: ReactNode
  className?: string
}

export function DashboardGrid({ children, className }: GridTemplateProps) {
  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-4",
      "xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

export function PortfolioGrid({ children, className }: GridTemplateProps) {
  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-1",
      className
    )}>
      {children}
    </div>
  )
}

export function SettingsGrid({ children, className }: GridTemplateProps) {
  return (
    <div className={cn(
      "grid gap-6",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-1",
      "lg:max-w-4xl",
      className
    )}>
      {children}
    </div>
  )
}

export function OpportunitiesGrid({ children, className }: GridTemplateProps) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3",
      "xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

export function SimulationGrid({ children, className }: GridTemplateProps) {
  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveTableProps {
  headers: string[]
  children: ReactNode
  className?: string
}

export function ResponsiveTable({ headers, children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Mobile View - Stack */}
      <div className="md:hidden space-y-4">
        {children}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {headers.map((header, index) => (
                <th key={index} className="text-left p-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ResponsiveContainerProps {
  children: ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "sm" | "md" | "lg"
  className?: string
}

export function ResponsiveContainer({
  children,
  maxWidth = "full",
  padding = "md",
  className
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-full"
  }

  const paddingClasses = {
    sm: "p-2 md:p-4",
    md: "p-4 md:p-6 lg:p-8",
    lg: "p-6 md:p-8 lg:p-12"
  }

  return (
    <div className={cn(
      "mx-auto w-full",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

interface FlexGridProps {
  children: ReactNode
  minItemWidth?: string
  gap?: "sm" | "md" | "lg"
  className?: string
}

export function FlexGrid({
  children,
  minItemWidth = "300px",
  gap = "md",
  className
}: FlexGridProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6"
  }

  return (
    <div
      className={cn(
        "grid auto-fit-grid",
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
      }}
    >
      {children}
    </div>
  )
}

interface SidebarLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  sidebarWidth?: "sm" | "md" | "lg"
  className?: string
}

export function SidebarLayout({
  sidebar,
  main,
  sidebarWidth = "md",
  className
}: SidebarLayoutProps) {
  const sidebarWidths = {
    sm: "w-64",
    md: "w-72",
    lg: "w-80"
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0",
        sidebarWidths[sidebarWidth]
      )}>
        {sidebar}
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1",
        "lg:pl-72" // Adjust based on default sidebar width
      )}>
        {main}
      </div>
    </div>
  )
}

interface StackLayoutProps {
  children: ReactNode
  spacing?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function StackLayout({
  children,
  spacing = "md",
  className
}: StackLayoutProps) {
  const spacingClasses = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
    xl: "space-y-8"
  }

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  )
}

interface CenterLayoutProps {
  children: ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function CenterLayout({
  children,
  maxWidth = "lg",
  className
}: CenterLayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl"
  }

  return (
    <div className={cn(
      "flex items-center justify-center min-h-screen p-4",
      className
    )}>
      <div className={cn("w-full", maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </div>
  )
}