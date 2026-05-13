import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatArea(sqm) {
  if (!sqm) return '—'
  const n = parseFloat(sqm)
  return n >= 10000 ? `${(n / 10000).toFixed(2)} ha` : `${n.toLocaleString()} m²`
}
