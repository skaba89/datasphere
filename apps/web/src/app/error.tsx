'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('GuineaTender Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-9 h-9 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur s&apos;est produite</h2>
        <p className="text-gray-500 mb-2">{error.message || 'Une erreur inattendue est survenue.'}</p>
        <p className="text-xs text-gray-400 mb-8">Si le problème persiste, contactez le support.</p>
        <button
          onClick={reset}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-600 transition-colors mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    </div>
  )
}
