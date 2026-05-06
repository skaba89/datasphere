'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { solutionsApi } from '@/lib/api'
import { Search, Lightbulb, Clock, DollarSign, Code2, ArrowRight } from 'lucide-react'

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'E_SERVICES_CITOYENS', label: 'e-Services Citoyens' },
  { value: 'DIGITALISATION_ARCHIVES', label: 'Digitalisation Archives' },
  { value: 'PLATEFORME_SERA', label: 'Plateforme SERA' },
  { value: 'GESTION_SUBVENTIONS', label: 'Gestion Subventions' },
  { value: 'ENTREPRENEURIAT_NUMERIQUE', label: 'Entrepreneuriat' },
  { value: 'SYSTEME_SANTE', label: 'Santé' },
  { value: 'GESTION_SCOLAIRE', label: 'Éducation' },
  { value: 'GESTION_IMPOTS', label: 'Impôts & Taxes' },
]

export default function SolutionsPage() {
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', { search, categorie }],
    queryFn: () => solutionsApi.list({ search, categorie }).then((r) => r.data),
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bibliothèque de Solutions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Templates SaaS pré-architecturés pour vos réponses aux AOs de digitalisation
        </p>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-xl p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une solution..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <select
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Grille solutions */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-500 text-sm">Chargement...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map((solution: any) => (
            <div key={solution.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-primary-600" />
                </div>
                {solution.estimDelaiMois && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {solution.estimDelaiMois} mois
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{solution.nom}</h3>
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">{solution.description}</p>

              {/* Estimation coût */}
              {solution.estimCoutMin && (
                <div className="flex items-center gap-1 text-xs text-green-700 mb-3">
                  <DollarSign className="w-3 h-3" />
                  {(Number(solution.estimCoutMin) / 1_000_000).toFixed(0)}M –{' '}
                  {(Number(solution.estimCoutMax) / 1_000_000).toFixed(0)}M GNF
                </div>
              )}

              {/* Stack tech */}
              <div className="flex flex-wrap gap-1 mb-4">
                {solution.techStack?.slice(0, 4).map((tech: string) => (
                  <span key={tech} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {tech}
                  </span>
                ))}
                {solution.techStack?.length > 4 && (
                  <span className="text-xs text-gray-400">+{solution.techStack.length - 4}</span>
                )}
              </div>

              <button className="w-full flex items-center justify-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700 group-hover:underline">
                Utiliser ce template
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
