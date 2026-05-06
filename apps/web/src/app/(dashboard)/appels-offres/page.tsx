'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aoApi, scoringApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search, Filter, Plus, Star, Clock, Building2,
  TrendingUp, RefreshCw, Eye, FileText, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { clsx } from 'clsx'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'NOUVEAU', label: 'Nouveaux' },
  { value: 'QUALIFIE', label: 'Qualifiés' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'REMPORTE', label: 'Remportés' },
  { value: 'PERDU', label: 'Perdus' },
]

const SOURCE_LABELS: Record<string, string> = {
  TELEMO: 'TELEMO',
  ARMP: 'ARMP',
  JAO_GUINEE: 'JAO',
  BANQUE_MONDIALE: 'Banque Mondiale',
  ANDE: 'ANDE',
  BAD: 'BAD',
  PNUD: 'PNUD',
  AUTRE: 'Autre',
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (!score) return <span className="text-xs text-gray-400">Non scoré</span>
  const color = score >= 65 ? 'score-go' : score >= 50 ? 'score-maybe' : 'score-nogo'
  const label = score >= 65 ? '✅ GO' : score >= 50 ? '⚠️ MAYBE' : '❌ NO GO'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label} {score}/100
    </span>
  )
}

function JoursRestants({ dateLimite }: { dateLimite: string }) {
  const jours = Math.floor((new Date(dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (jours < 0) return <span className="text-xs text-gray-400">Expiré</span>
  const color = jours <= 3 ? 'text-red-600 font-bold' : jours <= 7 ? 'text-orange-600 font-medium' : 'text-gray-600'
  return <span className={`text-xs ${color}`}>{jours}j restants</span>
}

export default function AppelsOffresPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['appels-offres', { search, status, page }],
    queryFn: () => aoApi.list({ search, status, page, limit: 15 }).then((r) => r.data),
  })

  const scorerMutation = useMutation({
    mutationFn: (aoId: string) => scoringApi.calculer(aoId),
    onSuccess: (res) => {
      const s = res.data
      toast.success(`Score calculé : ${s.scoreFinal}/100 — ${s.recommandation}`)
      qc.invalidateQueries({ queryKey: ['appels-offres'] })
    },
    onError: () => toast.error('Erreur lors du calcul du score'),
  })

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appels d'Offres</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.meta?.total ?? 0} opportunités collectées
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter manuellement
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border p-4 flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher par titre, entité..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['appels-offres'] })}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            Chargement des appels d'offres...
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun appel d'offres trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres ou lancez une veille</p>
          </div>
        ) : (
          <div className="divide-y">
            {data?.data?.map((ao: any) => (
              <div key={ao.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Source badge */}
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                      {SOURCE_LABELS[ao.source] || ao.source}
                    </span>
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/appels-offres/${ao.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600 line-clamp-1"
                    >
                      {ao.titre}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="w-3 h-3" />
                        {ao.entiteAdj}
                      </span>
                      {ao.budgetEstimeGNF && (
                        <span className="text-xs text-gray-500">
                          {(Number(ao.budgetEstimeGNF) / 1_000_000).toFixed(0)}M GNF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ao.objet}</p>
                  </div>

                  {/* Droite */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <ScoreBadge score={ao.score} />
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <JoursRestants dateLimite={ao.dateLimite} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => scorerMutation.mutate(ao.id)}
                        disabled={scorerMutation.isPending}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        Scorer
                      </button>
                      <Link
                        href={`/appels-offres/${ao.id}`}
                        className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.meta?.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <span className="text-sm text-gray-600">
              Page {data.meta.page} sur {data.meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-white"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-white"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
