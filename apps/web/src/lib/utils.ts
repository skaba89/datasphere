import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGNF(amount: number | bigint | string | null | undefined): string {
  if (!amount && amount !== 0) return '—'
  const n = typeof amount === 'bigint' ? Number(amount) : Number(amount)
  if (isNaN(n) || n === 0) return '—'
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mrd GNF`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M GNF`
  return `${n.toLocaleString('fr-FR')} GNF`
}

export function joursRestants(dateLimite: string | Date): number {
  return Math.floor((new Date(dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// Seuils de scoring — doivent correspondre au backend (scoring.service.ts)
// Le backend utilise config.seuilGo (default 65) et seuilGo - 15 pour MAYBE
const SCORING_THRESHOLDS = {
  go: 65,
  maybe: 50,
} as const

export function scoreRecommandation(score: number, seuilGo?: number): 'GO' | 'MAYBE' | 'NO_GO' {
  const go = seuilGo ?? SCORING_THRESHOLDS.go
  const maybe = go - 15
  if (score >= go) return 'GO'
  if (score >= maybe) return 'MAYBE'
  return 'NO_GO'
}

export function scoreColor(score: number, seuilGo?: number): string {
  const go = seuilGo ?? SCORING_THRESHOLDS.go
  const maybe = go - 15
  if (score >= go) return 'text-green-700 bg-green-100'
  if (score >= maybe) return 'text-yellow-700 bg-yellow-100'
  return 'text-red-700 bg-red-100'
}
