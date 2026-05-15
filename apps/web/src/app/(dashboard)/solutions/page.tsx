'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { solutionsApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, Lightbulb, Clock, DollarSign, X,
  Calculator, Layers, FileText, ArrowRight, CheckCircle2,
  RefreshCw, Globe, Lock, AlertCircle, Tag,
} from 'lucide-react'

// ── All 13 categories from Prisma SolutionCategory enum ────────────────────
const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'E_SERVICES_CITOYENS', label: 'e-Services Citoyens' },
  { value: 'DIGITALISATION_ARCHIVES', label: 'Digitalisation & Archives' },
  { value: 'PLATEFORME_PAIEMENT', label: 'Plateforme de Paiement' },
  { value: 'SYSTEME_SANTE', label: 'Système Santé' },
  { value: 'GESTION_SCOLAIRE', label: 'Gestion Scolaire' },
  { value: 'ENTREPRENEURIAT_NUMERIQUE', label: 'Entrepreneuriat Numérique' },
  { value: 'GESTION_SUBVENTIONS', label: 'Gestion Subventions' },
  { value: 'EMPLOI_PUBLIC', label: 'Emploi Public' },
  { value: 'IDENTITE_NUMERIQUE', label: 'Identité Numérique' },
  { value: 'PLATEFORME_SERA', label: 'Plateforme SERA' },
  { value: 'GESTION_IMPOTS', label: 'Gestion Impôts & Taxes' },
  { value: 'SUIVI_PROJETS', label: 'Suivi de Projets' },
  { value: 'AUTRE', label: 'Autre' },
]

// Map category values to display labels for badges
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter((c) => c.value).map((c) => [c.value, c.label]),
)

// Category color mapping for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  E_SERVICES_CITOYENS: 'bg-blue-100 text-blue-700',
  DIGITALISATION_ARCHIVES: 'bg-purple-100 text-purple-700',
  PLATEFORME_PAIEMENT: 'bg-green-100 text-green-700',
  SYSTEME_SANTE: 'bg-red-100 text-red-700',
  GESTION_SCOLAIRE: 'bg-indigo-100 text-indigo-700',
  ENTREPRENEURIAT_NUMERIQUE: 'bg-orange-100 text-orange-700',
  GESTION_SUBVENTIONS: 'bg-yellow-100 text-yellow-800',
  EMPLOI_PUBLIC: 'bg-teal-100 text-teal-700',
  IDENTITE_NUMERIQUE: 'bg-cyan-100 text-cyan-700',
  PLATEFORME_SERA: 'bg-pink-100 text-pink-700',
  GESTION_IMPOTS: 'bg-amber-100 text-amber-700',
  SUIVI_PROJETS: 'bg-lime-100 text-lime-700',
  AUTRE: 'bg-gray-100 text-gray-600',
}

// ── Estimation Modal ─────────────────────────────────────────────────────────
function EstimationModal({ solution, onClose }: { solution: any; onClose: () => void }) {
  const router = useRouter()
  const [config, setConfig] = useState({
    nbUtilisateurs: 500,
    nbAgences: 5,
    dureeAnsMaintenance: 1,
    hebergementCloud: true,
    formationIncluse: true,
  })
  const [estimation, setEstimation] = useState<any>(null)

  const estimerMutation = useMutation({
    mutationFn: () => solutionsApi.estimer(solution.id, config),
    onSuccess: (res) => setEstimation(res.data),
    onError: () => toast.error('Erreur lors de l\'estimation'),
  })

  const ouvrirAOs = () => {
    toast.info('Sélectionnez un appel d\'offres pour y associer ce template', { duration: 4000 })
    router.push('/appels-offres')
  }

  const categoryColor = CATEGORY_COLORS[solution.categorie] || 'bg-gray-100 text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-gray-900 truncate">{solution.nom}</h2>
              {solution.isPublic ? (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0">
                  <Globe className="w-3 h-3" />
                  Template
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex-shrink-0">
                  <Lock className="w-3 h-3" />
                  Organisation
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${categoryColor}`}>
                {CATEGORY_LABELS[solution.categorie] || solution.categorie}
              </span>
              <span className="text-xs text-gray-400">v{solution.version || '1.0.0'}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Description */}
          <p className="text-sm text-gray-600">{solution.description}</p>

          {/* Architecture description */}
          {solution.archDescription && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                Architecture
              </h3>
              <p className="text-sm text-gray-600">{solution.archDescription}</p>
            </div>
          )}

          {/* Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Nombre d&apos;utilisateurs cibles
              </label>
              <input
                type="number"
                value={config.nbUtilisateurs}
                onChange={(e) => setConfig((c) => ({ ...c, nbUtilisateurs: +e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                min={50} step={50}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Nombre de sites / agences
              </label>
              <input
                type="number"
                value={config.nbAgences}
                onChange={(e) => setConfig((c) => ({ ...c, nbAgences: +e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Maintenance post-déploiement (années)
              </label>
              <select
                value={config.dureeAnsMaintenance}
                onChange={(e) => setConfig((c) => ({ ...c, dureeAnsMaintenance: +e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value={0}>Sans maintenance</option>
                <option value={1}>1 an</option>
                <option value={2}>2 ans</option>
                <option value={3}>3 ans</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hebergementCloud}
                  onChange={(e) => setConfig((c) => ({ ...c, hebergementCloud: e.target.checked }))}
                  className="rounded"
                />
                Hébergement cloud inclus
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.formationIncluse}
                  onChange={(e) => setConfig((c) => ({ ...c, formationIncluse: e.target.checked }))}
                  className="rounded"
                />
                Formation des équipes incluse
              </label>
            </div>
          </div>

          <button
            onClick={() => estimerMutation.mutate()}
            disabled={estimerMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            {estimerMutation.isPending ? 'Calcul en cours...' : 'Calculer l\'estimation'}
          </button>

          {/* Résultat estimation */}
          {estimation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Estimation budgétaire
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Coût minimum</p>
                  <p className="text-lg font-bold text-green-700">
                    {estimation.coutMin
                      ? `${(Number(estimation.coutMin) / 1_000_000).toFixed(0)}M GNF`
                      : '—'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Coût maximum</p>
                  <p className="text-lg font-bold text-orange-600">
                    {estimation.coutMax
                      ? `${(Number(estimation.coutMax) / 1_000_000).toFixed(0)}M GNF`
                      : '—'}
                  </p>
                </div>
              </div>

              {estimation.delaiMois && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Délai estimé : <strong>{estimation.delaiMois} mois</strong>
                </p>
              )}

              {estimation.details && (
                <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-green-200">
                  {Object.entries(estimation.details).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tech Stack */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              Stack technique
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {solution.techStack?.map((tech: string) => (
                <span key={tech} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                  {tech}
                </span>
              ))}
              {(!solution.techStack || solution.techStack.length === 0) && (
                <span className="text-xs text-gray-400">Non spécifié</span>
              )}
            </div>
          </div>

          {/* Tags */}
          {solution.tags?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {solution.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
            Fermer
          </button>
          <button
            onClick={ouvrirAOs}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Utiliser pour un appel d&apos;offres
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SolutionsPage() {
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('')
  const [selectedSolution, setSelectedSolution] = useState<any>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['solutions', { search, categorie }],
    queryFn: () => solutionsApi.list({ search, categorie }).then((r) => r.data),
  })

  const solutions: any[] = data?.data ?? []
  const total = data?.meta?.total ?? solutions.length

  return (
    <div className="space-y-5">
      {selectedSolution && (
        <EstimationModal
          solution={selectedSolution}
          onClose={() => setSelectedSolution(null)}
        />
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bibliothèque de Solutions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Templates SaaS pré-architecturés — cliquez sur une solution pour obtenir une estimation budgétaire
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border rounded-lg transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
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
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Compteur */}
      {!isLoading && !isError && (
        <p className="text-sm text-gray-500">
          {total} solution{total !== 1 ? 's' : ''} trouvée{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Erreur */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="font-medium text-red-800">Erreur de chargement</p>
          <p className="text-sm text-red-600 mt-1">
            {(error as any)?.response?.data?.message || (error as Error)?.message || 'Une erreur inattendue s\'est produite'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Chargement */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
              <div className="w-3/4 h-5 bg-gray-200 rounded mb-2" />
              <div className="w-full h-3 bg-gray-100 rounded mb-1" />
              <div className="w-2/3 h-3 bg-gray-100 rounded mb-4" />
              <div className="flex gap-1.5 mb-4">
                <div className="w-12 h-5 bg-gray-100 rounded" />
                <div className="w-14 h-5 bg-gray-100 rounded" />
                <div className="w-10 h-5 bg-gray-100 rounded" />
              </div>
              <div className="w-1/2 h-4 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      )}

      {/* Grille solutions */}
      {!isLoading && !isError && solutions.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutions.map((solution: any) => {
            const catColor = CATEGORY_COLORS[solution.categorie] || 'bg-gray-100 text-gray-600'
            return (
              <div
                key={solution.id}
                className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-200 transition-all group cursor-pointer"
                onClick={() => setSelectedSolution(solution)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <Lightbulb className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {solution.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                        <Globe className="w-3 h-3" />
                        Template
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                        <Lock className="w-3 h-3" />
                        Org
                      </span>
                    )}
                  </div>
                </div>

                {/* Category badge */}
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full mb-2 ${catColor}`}>
                  {CATEGORY_LABELS[solution.categorie] || solution.categorie}
                </span>

                <h3 className="font-semibold text-gray-900 mb-1.5">{solution.nom}</h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{solution.description}</p>

                {/* Cost estimate */}
                {solution.estimCoutMin && (
                  <div className="flex items-center gap-1 text-xs text-green-700 mb-3">
                    <DollarSign className="w-3 h-3" />
                    {(Number(solution.estimCoutMin) / 1_000_000).toFixed(0)}M –{' '}
                    {(Number(solution.estimCoutMax) / 1_000_000).toFixed(0)}M GNF
                    {solution.estimDelaiMois && (
                      <>
                        <span className="text-gray-300 mx-1">·</span>
                        <Clock className="w-3 h-3" />
                        {solution.estimDelaiMois} mois
                      </>
                    )}
                  </div>
                )}

                {/* Tech stack */}
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

                {/* Estimer CTA */}
                <div className="flex items-center justify-center gap-2 text-sm text-primary-600 font-medium group-hover:text-primary-700 pt-3 border-t border-gray-100">
                  <Calculator className="w-4 h-4" />
                  Estimer le budget
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && solutions.length === 0 && (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">Aucune solution trouvée</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || categorie
              ? 'Modifiez vos filtres pour élargir la recherche'
              : 'Aucune solution n\'a encore été ajoutée à la bibliothèque'}
          </p>
          {(search || categorie) && (
            <button
              onClick={() => { setSearch(''); setCategorie('') }}
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  )
}
