'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aoApi, scoringApi, aiApi, dossiersApi } from '@/lib/api'
import { formatGNF, joursRestants, scoreColor, scoreRecommandation } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft, Zap, FileText, Brain, Calendar, Building2,
  TrendingUp, Users, Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'

const DIMENSIONS_LABELS: Record<string, string> = {
  alignementSectoriel: 'Alignement sectoriel',
  capaciteFinanciere: 'Capacité financière',
  eligibilite: 'Éligibilité',
  concurrence: 'Concurrence',
  relationInstitutionnelle: 'Relation institutionnelle',
  delai: 'Délai réaliste',
}

const DIMENSIONS_ICONS: Record<string, React.ReactNode> = {
  alignementSectoriel: <TrendingUp className="w-4 h-4" />,
  capaciteFinanciere: <Building2 className="w-4 h-4" />,
  eligibilite: <CheckCircle2 className="w-4 h-4" />,
  concurrence: <Users className="w-4 h-4" />,
  relationInstitutionnelle: <Users className="w-4 h-4" />,
  delai: <Clock className="w-4 h-4" />,
}

export default function AODetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: ao, isLoading } = useQuery({
    queryKey: ['ao', id],
    queryFn: () => aoApi.get(`/${id}`).then(r => r.data),
  })

  const { data: scoring } = useQuery({
    queryKey: ['scoring', id],
    queryFn: () => scoringApi.get(id).then(r => r.data),
    enabled: !!ao,
  })

  const scoreMutation = useMutation({
    mutationFn: () => scoringApi.calculer(id).then(r => r.data),
    onSuccess: () => {
      toast.success('Score calculé avec succès')
      qc.invalidateQueries({ queryKey: ['scoring', id] })
      qc.invalidateQueries({ queryKey: ['ao', id] })
    },
    onError: () => toast.error('Erreur lors du calcul du score'),
  })

  const resumeMutation = useMutation({
    mutationFn: () => aiApi.resumer(id).then(r => r.data),
    onSuccess: () => toast.success('Résumé IA généré'),
  })

  const dossierMutation = useMutation({
    mutationFn: () => dossiersApi.create({ appelOffreId: id, titre: `Dossier — ${ao?.titre}` }).then(r => r.data),
    onSuccess: () => {
      toast.success('Dossier créé — génération IA en cours')
      router.push(`/dossiers`)
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!ao) return null

  const jours = ao.dateLimite ? joursRestants(ao.dateLimite) : null
  const score = ao.scoreFinal ?? scoring?.scoreFinal
  const recommandation = score ? scoreRecommandation(score) : null
  const dimensions = scoring?.dimensions ?? []

  const StatusIcon = recommandation === 'GO' ? CheckCircle2 :
    recommandation === 'MAYBE' ? AlertCircle : XCircle
  const statusColor = recommandation === 'GO' ? 'text-green-600' :
    recommandation === 'MAYBE' ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux appels d&apos;offres
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                {ao.source}
              </span>
              <span className="text-xs text-gray-400">{ao.reference}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ao.titre}</h1>
            <p className="text-gray-500 mt-1">{ao.entitePublique}</p>
          </div>

          {score && (
            <div className="flex-shrink-0 text-center">
              <div className={`text-4xl font-bold ${scoreColor(score).split(' ')[0]}`}>{score}%</div>
              <div className={`flex items-center gap-1 justify-center mt-1 text-sm font-medium ${statusColor}`}>
                <StatusIcon className="w-4 h-4" />
                {recommandation}
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Valeur estimée</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatGNF(ao.montantEstime)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Secteur</p>
            <p className="font-semibold text-gray-900 mt-0.5">{ao.secteur ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Statut</p>
            <p className="font-semibold text-gray-900 mt-0.5">{ao.statut?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Échéance</p>
            {jours !== null ? (
              <p className={`font-semibold mt-0.5 flex items-center gap-1 ${jours <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
                <Calendar className="w-3.5 h-3.5" />
                {jours > 0 ? `${jours}j restants` : `Expiré il y a ${Math.abs(jours)}j`}
              </p>
            ) : <p className="font-semibold text-gray-400 mt-0.5">—</p>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => scoreMutation.mutate()}
          disabled={scoreMutation.isPending}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <Zap className="w-4 h-4" />
          {scoreMutation.isPending ? 'Calcul en cours...' : 'Recalculer le score IA'}
        </button>
        <button
          onClick={() => dossierMutation.mutate()}
          disabled={dossierMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Créer un dossier de réponse
        </button>
        <button
          onClick={() => resumeMutation.mutate()}
          disabled={resumeMutation.isPending}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
        >
          <Brain className="w-4 h-4" />
          Résumé IA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scoring Dimensions */}
        {dimensions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Analyse scoring — 6 dimensions</h2>
            <div className="space-y-3">
              {dimensions.map((dim: any) => (
                <div key={dim.nom}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-gray-400">
                        {DIMENSIONS_ICONS[dim.nom] ?? <TrendingUp className="w-4 h-4" />}
                      </span>
                      {DIMENSIONS_LABELS[dim.nom] ?? dim.nom}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{dim.score}/{dim.poids}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        dim.score / dim.poids >= 0.65 ? 'bg-green-500' :
                        dim.score / dim.poids >= 0.50 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${(dim.score / dim.poids) * 100}%` }}
                    />
                  </div>
                  {dim.detail && <p className="text-xs text-gray-400 mt-0.5">{dim.detail}</p>}
                </div>
              ))}
            </div>

            {scoring?.alertes?.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-medium text-yellow-800 mb-2">Points d&apos;attention :</p>
                <ul className="space-y-1">
                  {scoring.alertes.map((a: string, i: number) => (
                    <li key={i} className="text-xs text-yellow-700 flex gap-1.5">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Description / Résumé */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Description</h2>
          {ao.description ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{ao.description}</p>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune description.</p>
              <button
                onClick={() => resumeMutation.mutate()}
                className="mt-3 text-xs text-orange-600 hover:underline"
              >
                Générer un résumé IA →
              </button>
            </div>
          )}

          {ao.criteres && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Critères de sélection</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{ao.criteres}</p>
            </div>
          )}

          {ao.documentsRequis?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Documents requis</h3>
              <ul className="space-y-1">
                {ao.documentsRequis.map((doc: string, i: number) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
