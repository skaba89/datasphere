'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scrapingApi, aoApi, scoringApi } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Radio, RefreshCw, CheckCircle2, XCircle, Clock,
  Globe, TrendingUp, Zap, ExternalLink, FileSearch,
  AlertTriangle, ChevronRight,
} from 'lucide-react'
import { formatGNF, joursRestants, scoreColor } from '@/lib/utils'

type ScrapingResult = { source: string; nouveaux: number; contactsCreés: number; erreur?: string }

const SOURCE_META: Record<string, { icon: string; desc: string; color: string }> = {
  ARMP:           { icon: '🏛️', desc: 'Autorité de Régulation des Marchés Publics', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  JAO_GUINEE:     { icon: '📋', desc: 'Journal des Appels d\'Offres de Guinée',      color: 'text-green-700 bg-green-50 border-green-200' },
  BANQUE_MONDIALE:{ icon: '🌍', desc: 'World Bank Projects & Operations',             color: 'text-orange-700 bg-orange-50 border-orange-200' },
  TELEMO:         { icon: '📡', desc: 'Plateforme TELEMO',                             color: 'text-purple-700 bg-purple-50 border-purple-200' },
  PNUD:           { icon: '🌐', desc: 'Programme des Nations Unies pour le Développement', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  BAD:            { icon: '🏦', desc: 'Banque Africaine de Développement',            color: 'text-amber-700 bg-amber-50 border-amber-200' },
}

export default function VeillePage() {
  const qc = useQueryClient()
  const [lastResults, setLastResults] = useState<ScrapingResult[] | null>(null)
  const [sourceFilter, setSourceFilter] = useState('')

  const { data: sources } = useQuery({
    queryKey: ['scraping-sources'],
    queryFn: () => scrapingApi.sources().then(r => r.data),
  })

  const { data: nouveauxAOs, isLoading: loadingAOs } = useQuery({
    queryKey: ['ao-nouveaux', sourceFilter],
    queryFn: () => aoApi.list({
      status: 'NOUVEAU',
      sort: 'date',
      limit: 30,
      ...(sourceFilter && { source: sourceFilter }),
    }).then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: allStats } = useQuery({
    queryKey: ['ao-stats'],
    queryFn: () => aoApi.stats().then(r => r.data),
  })

  const lancerVeille = useMutation({
    mutationFn: () => scrapingApi.lancer().then(r => r.data),
    onMutate: () => toast.loading('Veille en cours…', { id: 'veille' }),
    onSuccess: (results: ScrapingResult[]) => {
      toast.dismiss('veille')
      const total = results.reduce((s, r) => s + r.nouveaux, 0)
      toast.success(`Veille terminée — ${total} nouvel(s) AO(s) découvert(s)`)
      setLastResults(results)
      qc.invalidateQueries({ queryKey: ['ao-nouveaux'] })
      qc.invalidateQueries({ queryKey: ['ao-stats'] })
      qc.invalidateQueries({ queryKey: ['appels-offres'] })
    },
    onError: (err: any) => {
      toast.dismiss('veille')
      toast.error(err?.response?.data?.message ?? 'Erreur lors de la veille')
    },
  })

  const calculerScore = useMutation({
    mutationFn: (aoId: string) => scoringApi.calculer(aoId).then(r => r.data),
    onSuccess: (data, aoId) => {
      toast.success(`Score calculé : ${data.scoreFinal}% — ${data.recommandation}`)
      qc.invalidateQueries({ queryKey: ['ao-nouveaux'] })
    },
    onError: () => toast.error('Erreur lors du calcul'),
  })

  const sourcesList: any[] = sources ?? []
  const activeSources = sourcesList.filter(s => s.actif)
  const inactiveSources = sourcesList.filter(s => !s.actif)
  const nouveaux = nouveauxAOs?.data ?? []
  const total = nouveauxAOs?.meta?.total ?? 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Radio className="w-6 h-6 text-orange-500" />
            Veille automatique
          </h1>
          <p className="text-gray-500 mt-1">Surveillance des sources officielles d&apos;appels d&apos;offres en Guinée et à l&apos;international</p>
        </div>
        <button
          onClick={() => lancerVeille.mutate()}
          disabled={lancerVeille.isPending}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${lancerVeille.isPending ? 'animate-spin' : ''}`} />
          {lancerVeille.isPending ? 'Veille en cours…' : 'Lancer la veille'}
        </button>
      </div>

      {/* Résultats du dernier scraping */}
      {lastResults && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Résultats de la dernière veille
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lastResults.map((r) => {
              const meta = SOURCE_META[r.source.replace(' ', '_').toUpperCase()] ?? { icon: '📄', desc: r.source, color: 'text-gray-700 bg-gray-50 border-gray-200' }
              return (
                <div key={r.source} className={`p-3 rounded-lg border text-sm ${r.erreur ? 'bg-red-50 border-red-200' : meta.color}`}>
                  <div className="flex items-center gap-1.5 font-medium mb-1">
                    <span>{meta.icon}</span>
                    {r.source}
                  </div>
                  {r.erreur ? (
                    <p className="text-red-600 text-xs">{r.erreur}</p>
                  ) : (
                    <p className="text-xs opacity-80">
                      <strong>{r.nouveaux}</strong> nouv. AO · <strong>{r.contactsCreés}</strong> contacts créés
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sources + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sources actives */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              Sources surveillées
            </h2>
            <div className="space-y-2">
              {activeSources.map((s: any) => {
                const meta = SOURCE_META[s.id] ?? { icon: '📄', desc: s.url, color: 'text-gray-700 bg-gray-50 border-gray-200' }
                return (
                  <div key={s.id} className="flex items-start gap-2 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <span>{meta.icon}</span>
                        {s.nom}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{s.url}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {inactiveSources.length > 0 && (
              <>
                <div className="border-t mt-3 pt-3">
                  <p className="text-xs text-gray-400 font-medium mb-2">Non configurées</p>
                  <div className="space-y-2">
                    {inactiveSources.map((s: any) => (
                      <div key={s.id} className="flex items-start gap-2 py-1 opacity-50">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-600">{s.nom}</div>
                          {s.note && <p className="text-xs text-gray-400">{s.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* KPIs globaux */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              Pipeline global
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Nouveaux à qualifier', value: allStats?.parStatus?.NOUVEAU ?? 0, color: 'bg-blue-500' },
                { label: 'Qualifiés / En cours', value: (allStats?.parStatus?.QUALIFIE ?? 0) + (allStats?.parStatus?.EN_COURS ?? 0), color: 'bg-purple-500' },
                { label: 'Soumis', value: allStats?.parStatus?.SOUMIS ?? 0, color: 'bg-orange-500' },
                { label: 'Remportés', value: allStats?.parStatus?.REMPORTE ?? 0, color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AOs nouveaux */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-orange-500" />
                  Nouveaux AOs à qualifier
                  {total > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{total}</span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">À scorer et qualifier pour intégrer au pipeline</p>
              </div>
              {/* Filtre source */}
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-orange-500 outline-none"
              >
                <option value="">Toutes sources</option>
                {activeSources.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>

            {loadingAOs ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full" />
              </div>
            ) : nouveaux.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Radio className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Aucun nouveau AO</p>
                <p className="text-xs mt-1">Lancez la veille pour découvrir de nouvelles opportunités</p>
                <button
                  onClick={() => lancerVeille.mutate()}
                  disabled={lancerVeille.isPending}
                  className="mt-4 text-sm text-orange-600 hover:underline font-medium"
                >
                  Lancer maintenant →
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {nouveaux.map((ao: any) => {
                  const jours = ao.dateLimite ? joursRestants(ao.dateLimite) : null
                  const score = ao.scoreFinal ?? ao.score
                  const sourceMeta = SOURCE_META[ao.source] ?? { icon: '📄', desc: '', color: '' }
                  return (
                    <div key={ao.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              {sourceMeta.icon} {ao.source}
                            </span>
                            {ao.secteur && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {ao.secteur}
                              </span>
                            )}
                            {jours !== null && (
                              <span className={`text-xs font-medium flex items-center gap-0.5 ${jours <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                                <Clock className="w-3 h-3" />
                                {jours > 0 ? `${jours}j` : 'Expiré'}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                            {ao.titre}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{ao.entiteAdj}</p>
                          {ao.budgetEstimeGNF && (
                            <p className="text-xs text-orange-600 font-medium mt-1">{formatGNF(ao.budgetEstimeGNF)}</p>
                          )}
                        </div>

                        {/* Score badge ou bouton scorer */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {score ? (
                            <div className={`text-sm font-bold px-2 py-0.5 rounded-lg ${scoreColor(score)}`}>
                              {score}%
                            </div>
                          ) : (
                            <button
                              onClick={() => calculerScore.mutate(ao.id)}
                              disabled={calculerScore.isPending}
                              className="text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <Zap className="w-3 h-3" />
                              Scorer
                            </button>
                          )}
                          <Link
                            href={`/appels-offres/${ao.id}`}
                            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5"
                          >
                            Ouvrir <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Alerte délai critique */}
                      {jours !== null && jours <= 3 && jours >= 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          Délai critique — seulement {jours} jour{jours > 1 ? 's' : ''} pour répondre
                        </div>
                      )}
                    </div>
                  )
                })}

                {total > 30 && (
                  <div className="p-4 text-center">
                    <Link
                      href="/appels-offres?status=NOUVEAU"
                      className="text-sm text-orange-600 hover:underline font-medium flex items-center gap-1 justify-center"
                    >
                      Voir tous les {total} nouveaux AOs
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
