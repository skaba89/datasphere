'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { solutionsApi, dossiersApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, Lightbulb, Clock, DollarSign, X,
  Calculator, Layers, FileText, ArrowRight, CheckCircle2,
} from 'lucide-react'

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

  const dossierMutation = useMutation({
    mutationFn: () => dossiersApi.create({
      titre: `Dossier — ${solution.nom}`,
      solutionId: solution.id,
    }),
    onSuccess: (res) => {
      toast.success('Dossier créé depuis ce template')
      router.push('/dossiers')
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{solution.nom}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Estimation budgétaire personnalisée</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Nombre d'utilisateurs cibles
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
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-orange-600 disabled:opacity-50"
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

          {/* Description & Stack */}
          <div className="space-y-3">
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
              </div>
            </div>
            <p className="text-sm text-gray-600">{solution.description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
            Fermer
          </button>
          <button
            onClick={() => dossierMutation.mutate()}
            disabled={dossierMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {dossierMutation.isPending ? 'Création...' : 'Créer un dossier depuis ce template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SolutionsPage() {
  const [search, setSearch] = useState('')
  const [categorie, setCategorie] = useState('')
  const [selectedSolution, setSelectedSolution] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['solutions', { search, categorie }],
    queryFn: () => solutionsApi.list({ search, categorie }).then((r) => r.data),
  })

  return (
    <div className="space-y-5">
      {selectedSolution && (
        <EstimationModal
          solution={selectedSolution}
          onClose={() => setSelectedSolution(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bibliothèque de Solutions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Templates SaaS pré-architecturés — cliquez sur une solution pour obtenir une estimation budgétaire
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
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
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
            <div
              key={solution.id}
              className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-primary-200 transition-all group cursor-pointer"
              onClick={() => setSelectedSolution(solution)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
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

              {solution.estimCoutMin && (
                <div className="flex items-center gap-1 text-xs text-green-700 mb-3">
                  <DollarSign className="w-3 h-3" />
                  {(Number(solution.estimCoutMin) / 1_000_000).toFixed(0)}M –{' '}
                  {(Number(solution.estimCoutMax) / 1_000_000).toFixed(0)}M GNF
                </div>
              )}

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

              <div className="flex items-center justify-center gap-2 text-sm text-primary-600 font-medium group-hover:text-primary-700">
                <Calculator className="w-4 h-4" />
                Estimer le budget
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data?.data?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune solution trouvée</p>
        </div>
      )}
    </div>
  )
}
