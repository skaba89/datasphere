'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aoApi, scoringApi, scrapingApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Search, Plus, Clock, Building2,
  TrendingUp, RefreshCw, Eye, FileText, Radio, CheckCircle2, X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const SOURCES = [
  { value: 'ARMP', label: 'ARMP Guinée' },
  { value: 'JAO_GUINEE', label: 'JAO Guinée' },
  { value: 'BANQUE_MONDIALE', label: 'Banque Mondiale' },
  { value: 'TELEMO', label: 'TELEMO' },
  { value: 'PNUD', label: 'PNUD' },
  { value: 'BAD', label: 'BAD' },
  { value: 'ANDE', label: 'ANDE' },
  { value: 'AUTRE', label: 'Autre' },
]

const SECTEURS = [
  { value: 'NUMERIQUE', label: 'Numérique / IT' },
  { value: 'SANTE', label: 'Santé' },
  { value: 'EDUCATION', label: 'Éducation' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'ENERGIE', label: 'Énergie' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'GOUVERNANCE', label: 'Gouvernance' },
  { value: 'AUTRE', label: 'Autre' },
]

function NouvelAOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    titre: '', objet: '', entiteAdj: '',
    source: 'ARMP', secteur: 'NUMERIQUE',
    budgetEstimeGNF: '', datePublication: today,
    dateLimite: '', sourceUrl: '',
  })

  const mutation = useMutation({
    mutationFn: () => aoApi.create({
      ...form,
      budgetEstimeGNF: form.budgetEstimeGNF ? Number(form.budgetEstimeGNF) : undefined,
    }),
    onSuccess: () => {
      toast.success('Appel d\'offres ajouté')
      qc.invalidateQueries({ queryKey: ['appels-offres'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const canSubmit = form.titre && form.objet && form.entiteAdj && form.dateLimite

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-900">Nouvel appel d'offres</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Titre *</label>
            <input
              value={form.titre}
              onChange={(e) => set('titre', e.target.value)}
              placeholder="Développement d'une plateforme de gestion..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Objet / Description *</label>
            <textarea
              value={form.objet}
              onChange={(e) => set('objet', e.target.value)}
              rows={3}
              placeholder="Décrivez l'objet du marché..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Entité adjudicatrice *</label>
              <input
                value={form.entiteAdj}
                onChange={(e) => set('entiteAdj', e.target.value)}
                placeholder="Ministère de..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Source</label>
              <select
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Secteur</label>
              <select
                value={form.secteur}
                onChange={(e) => set('secteur', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {SECTEURS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Budget estimé (GNF)</label>
              <input
                type="number"
                value={form.budgetEstimeGNF}
                onChange={(e) => set('budgetEstimeGNF', e.target.value)}
                placeholder="500000000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Date de publication</label>
              <input
                type="date"
                value={form.datePublication}
                onChange={(e) => set('datePublication', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Date limite *</label>
              <input
                type="date"
                value={form.dateLimite}
                onChange={(e) => set('dateLimite', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">URL source (optionnel)</label>
            <input
              value={form.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://armp.gov.gn/ao/..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
          >
            {mutation.isPending ? 'Création...' : 'Créer l\'appel d\'offres'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '')
  const [page, setPage] = useState(1)
  const [showAOModal, setShowAOModal] = useState(false)

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setStatus(s)
  }, [searchParams])

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

  const veillerMutation = useMutation({
    mutationFn: () => scrapingApi.lancer(),
    onSuccess: (res) => {
      const resultats: any[] = res.data
      const total = resultats.reduce((acc, r) => acc + r.nouveaux, 0)
      const contacts = resultats.reduce((acc, r) => acc + (r.contactsCreés || 0), 0)
      toast.success(
        `Veille terminée — ${total} nouveaux AOs${contacts > 0 ? `, ${contacts} contacts créés` : ''}`,
        { duration: 5000 }
      )
      qc.invalidateQueries({ queryKey: ['appels-offres'] })
    },
    onError: () => toast.error('Erreur lors de la veille'),
  })

  return (
    <div className="space-y-5">
      {showAOModal && <NouvelAOModal onClose={() => setShowAOModal(false)} />}
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appels d'Offres</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.meta?.total ?? 0} opportunités collectées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => veillerMutation.mutate()}
            disabled={veillerMutation.isPending}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {veillerMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            {veillerMutation.isPending ? 'Veille en cours...' : 'Lancer la veille'}
          </button>
          <button
            onClick={() => setShowAOModal(true)}
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
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
