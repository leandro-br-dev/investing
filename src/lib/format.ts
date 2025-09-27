// Função para formatar preços com base no número de decimais do asset
export function formatPrice(price: number | string, decimals: number = 2, currency: string = 'BRL'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price

  if (isNaN(numPrice)) return '0.00'

  const symbol = currency === 'BRL' ? 'R$' : '$'

  return `${symbol} ${numPrice.toFixed(decimals)}`
}

// Função para formatar números com separador de milhares
export function formatNumber(value: number | string, decimals: number = 2): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) return '0.00'

  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Função para formatar porcentagem
export function formatPercentage(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0.00%'

  return `${value.toFixed(decimals)}%`
}

// Função para arredondar preço com base nos decimais do asset
export function roundPrice(price: number | string, decimals: number = 2): number {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price

  if (isNaN(numPrice)) return 0

  return Math.round(numPrice * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// Função para calcular valor total com arredondamento correto
export function calculateTotal(price: number, quantity: number, decimals: number = 2): number {
  const total = price * quantity
  return roundPrice(total, 2) // Total sempre com 2 decimais para valores monetários
}