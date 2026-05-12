'use client'

import Link from 'next/link'
import { Brain, ArrowLeft, FileSearch } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Brain className="w-9 h-9 text-orange-500" />
        </div>
        <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page introuvable</h2>
        <p className="text-gray-500 mb-8">
          Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;URL ou retournez au tableau de bord.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link
            href="/appels-offres"
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            Appels d&apos;offres
          </Link>
        </div>
      </div>
    </div>
  )
}
