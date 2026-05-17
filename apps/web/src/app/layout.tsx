import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'GuineaTender AI — Plateforme de veille et réponse aux AOs',
    template: '%s | GuineaTender AI',
  },
  description:
    'Plateforme tout-en-un pour les entreprises tech qui répondent aux appels d\'offres de digitalisation en Guinée et en Afrique de l\'Ouest.',
  keywords: ['appels d\'offres', 'Guinée', 'marchés publics', 'IA', 'digitalisation', 'ARMP', 'TELEMO'],
  authors: [{ name: 'GuineaTender AI' }],
  openGraph: {
    title: 'GuineaTender AI',
    description: 'Remportez plus d\'appels d\'offres publics avec l\'IA',
    locale: 'fr_GN',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="guinea-banner" />
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
