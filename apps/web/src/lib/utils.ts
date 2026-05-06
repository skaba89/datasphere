import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGNF(amount: number | bigint | null | undefined): string {
  if (!amount) return '—'
  const n = typeof amount === 'bigint' ? Number(amount) : amount
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mrd GNF`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M GNF`
  return `${n.toLocaleString('fr-FR')} GNF`
}

export function joursRestants(dateLimite: string | Date): number {
  return Math.floor((new Date(dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function scoreRecommandation(score: number): 'GO' | 'MAYBE' | 'NO_GO' {
  if (score >= 65) return 'GO'
  if (score >= 50) return 'MAYBE'
  return 'NO_GO'
}

export function scoreColor(score: number): string {
  if (score >= 65) return 'text-green-700 bg-green-100'
  if (score >= 50) return 'text-yellow-700 bg-yellow-100'
  return 'text-red-700 bg-red-100'
}
