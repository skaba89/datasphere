'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aoApi, scoringApi, aiApi, dossiersApi, contactsApi } from '@/lib/api'
import { formatGNF, joursRestants, scoreColor, scoreRecommandation } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft, Zap, FileText, Brain, Calendar, Building2,
  TrendingUp, Users, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, Download, ExternalLink, Phone, Mail,
} from 'lucide-react'

const STATUS_PIPELINE = [
  { value: 'NOUVEAU',  label: 'Nouveau',   color: 'text-blue-700',   bg: 'bg-blue-100' },
  { value: 'QUALIFIE', label: 'Qualifié',  color: 'text-purple-700', bg: 'bg-purple-100' },
  { value: 'EN_COURS', label: 'En cours',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  { value: 'SOUMIS',   label: 'Soumis',   color: 'text-orange-700', bg: 'bg-orange-100' },
  { value: 'REMPORTE', label: 'Remporté',  color: 'text-green-700',  bg: 'bg-green-100' },
  { value: 'PERDU',    label: 'Perdu',    color: 'text-red-700',    bg: 'bg-red-100' },
]

const DIMENSIONS_LABELS: Record<string, string> = {
  'Alignement sectoriel': 'Alignement sectoriel',
  'Capacité financière': 'Capacité financière',
  'Critères d\'éligibilité': 'Éligibilité',
  'Concurrence estimée': 'Concurrence',
  'Relation institutionnelle': 'Relation institutionnelle',
  'Délai de réponse': 'Délai réaliste',
}

const DIMENSIONS_ICONS: Record<string, React.ReactNode> = {
  'Alignement sectoriel': <TrendingUp className="w-4 h-4" />,
  'Capacité financière': <Building2 className="w-4 h-4" />,
  'Critères d\'éligibilité': <CheckCircle2 className="w-4 h-4" />,
  'Concurrence estimée': <Users className="w-4 h-4" />,
  'Relation institutionnelle': <Users className="w-4 h-4" />,
  'Délai de réponse': <Clock className="w-4 h-4" />,
}

export default function AODetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: ao, isLoading, isError } = useQuery({
    queryKey: ['ao', id],
    queryFn: () => aoApi.get(id).then(r => r.data),
    retry: 1,
  })

  const { data: scoring } = useQuery({
    queryKey: ['scoring', id],
    queryFn: () => scoringApi.get(id).then(r => r.data).catch(() => null),
    enabled: !!ao,
    retry: false,
  })

  const { data: contactsData } = useQuery({
    queryKey: ['ao-contacts', ao?.entiteAdj],
    queryFn: () => contactsApi.list({ search: ao!.entiteAdj, limit: 5 }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: !!ao?.entiteAdj,
    retry: false,
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
    onSuccess: () => {
      toast.success('Résumé IA généré')
      qc.invalidateQueries({ queryKey: ['ao', id] })
    },
    onError: () => toast.error('Erreur lors de la génération du résumé IA'),
  })

  const dossierMutation = useMutation({
    mutationFn: () => dossiersApi.create({ aoId: id, titre: `Dossier — ${ao?.titre}` }).then(r => r.data),
    onSuccess: () => {
      toast.success('Dossier créé avec succès')
      router.push('/dossiers')
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => aoApi.updateStatus(id, newStatus).then(r => r.data),
    onSuccess: (_, newStatus) => {
      const label = STATUS_PIPELINE.find(s => s.value === newStatus)?.label ?? newStatus
      toast.success(`Statut mis à jour : ${label}`)
      qc.invalidateQueries({ queryKey: ['ao', id] })
      qc.invalidateQueries({ queryKey: ['appels-offres'] })
    },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError || !ao) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-semibold text-gray-800">Impossible de charger cet appel d&apos;offres</h2>
        <p className="text-sm text-gray-500">L&apos;AO est introuvable ou une erreur serveur s&apos;est produite.</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-orange-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </button>
      </div>
    )
  }

  const contacts: any[] = contactsData?.data ?? []
  const jours = ao.dateLimite ? joursRestants(ao.dateLimite) : null
  const score = ao.score ?? scoring?.scoreFinal
  const recommandation = score ? scoreRecommandation(score) : null
  const dimensions = scoring?.dimensions ?? []
  const currentStatusCfg = STATUS_PIPELINE.find(s => s.value === ao.status) ?? STATUS_PIPELINE[0]

  const ScoreIcon = recommandation === 'GO' ? CheckCircle2 :
    recommandation === 'MAYBE' ? AlertCircle : XCircle
  const scoreIconColor = recommandation === 'GO' ? 'text-green-600' :
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
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                {ao.source}
              </span>
              {ao.sourceId && <span className="text-xs text-gray-400">Réf: {ao.sourceId}</span>}

              {/* Status selector */}
              <div className="relative">
                <select
                  value={ao.status ?? 'NOUVEAU'}
                  onChange={(e) => statusMutation.mutate(e.target.value)}
                  disabled={statusMutation.isPending}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ${currentStatusCfg.bg} ${currentStatusCfg.color} focus:ring-2 focus:ring-primary-500 outline-none`}
                >
                  {STATUS_PIPELINE.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 pointer-events-none opacity-60" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ao.titre}</h1>
            <p className="text-gray-500 mt-1">{ao.entiteAdj}</p>
          </div>

          {score && (
            <div className="flex-shrink-0 text-center">
              <div className={`text-4xl font-bold ${scoreColor(score).split(' ')[0]}`}>{score}%</div>
              <div className={`flex items-center gap-1 justify-center mt-1 text-sm font-medium ${scoreIconColor}`}>
                <ScoreIcon className="w-4 h-4" />
                {recommandation}
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Valeur estimée</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatGNF(ao.budgetEstimeGNF)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Secteur</p>
            <p className="font-semibold text-gray-900 mt-0.5">{ao.secteur ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Statut</p>
            <p className="font-semibold text-gray-900 mt-0.5">{currentStatusCfg.label}</p>
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

      {/* Documents source + Contact adjudicateur */}
      {(ao.documentUrls?.length > 0 || ao.entiteAdj || ao.sourceUrl) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents téléchargeables */}
          {ao.documentUrls?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-500" />
                Documents source ({ao.documentUrls.length})
              </h2>
              <ul className="space-y-2">
                {ao.documentUrls.map((url: string, i: number) => {
                  const label = url.split('/').pop()?.split('?')[0] || `Document ${i + 1}`
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        <Download className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{decodeURIComponent(label)}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Contact adjudicateur */}
          {(ao.entiteAdj || ao.sourceUrl || contacts.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                Contact adjudicateur
              </h2>
              <div className="space-y-3">
                {/* Entité */}
                {ao.entiteAdj && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Entité adjudicatrice</p>
                      <p className="text-sm font-medium text-gray-900">{ao.entiteAdj}</p>
                    </div>
                  </div>
                )}

                {/* Contacts CRM liés */}
                {contacts.length > 0 && (
                  <div className="mt-2 space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Contacts ({contacts.length})
                    </p>
                    {contacts.map((c: any) => (
                      <div key={c.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-orange-700">
                            {c.prenom?.[0]}{c.nom?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {c.prenom} {c.nom}
                          </p>
                          {c.poste && <p className="text-xs text-gray-500 truncate">{c.poste}</p>}
                          {c.email?.length > 0 && (
                            <a href={`mailto:${c.email[0]}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5">
                              <Mail className="w-3 h-3" /> {c.email[0]}
                            </a>
                          )}
                          {c.telephone?.length > 0 && (
                            <a href={`tel:${c.telephone[0]}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Phone className="w-3 h-3" /> {c.telephone[0]}
                            </a>
                          )}
                        </div>
                        {c.enrichiAuto && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">auto</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Lien source officielle */}
                {ao.sourceUrl && (
                  <div className="pt-2 border-t border-gray-100">
                    <a
                      href={ao.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-800 font-medium hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Voir l&apos;annonce officielle
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
                    <span className="text-sm font-semibold text-gray-900">{dim.score}/{Math.round(dim.poids * 100)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        dim.score / (dim.poids * 100) >= 0.65 ? 'bg-green-500' :
                        dim.score / (dim.poids * 100) >= 0.50 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${(dim.score / (dim.poids * 100)) * 100}%` }}
                    />
                  </div>
                  {dim.raison && <p className="text-xs text-gray-400 mt-0.5">{dim.raison}</p>}
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
          {ao.objet ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{ao.objet}</p>
          ) : ao.resumeIA ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{ao.resumeIA}</p>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune description disponible.</p>
              <button
                onClick={() => resumeMutation.mutate()}
                className="mt-3 text-xs text-orange-600 hover:underline"
              >
                Générer un résumé IA →
              </button>
            </div>
          )}

          {ao.criteresEligibilite && typeof ao.criteresEligibilite === 'object' && Object.keys(ao.criteresEligibilite).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Critères d&apos;éligibilité</h3>
              {Array.isArray(ao.criteresEligibilite) ? (
                <ul className="space-y-1">
                  {ao.criteresEligibilite.map((c: any, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                      {typeof c === 'string' ? c : c.critere || c.label || JSON.stringify(c)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {typeof ao.criteresEligibilite === 'string' ? ao.criteresEligibilite : JSON.stringify(ao.criteresEligibilite, null, 2)}
                </p>
              )}
            </div>
          )}

          {ao.criteresEvaluation && typeof ao.criteresEvaluation === 'object' && Object.keys(ao.criteresEvaluation).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Critères d&apos;évaluation</h3>
              {Array.isArray(ao.criteresEvaluation) ? (
                <ul className="space-y-1">
                  {ao.criteresEvaluation.map((c: any, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                      {typeof c === 'string' ? c : c.critere || c.label || JSON.stringify(c)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {typeof ao.criteresEvaluation === 'string' ? ao.criteresEvaluation : JSON.stringify(ao.criteresEvaluation, null, 2)}
                </p>
              )}
            </div>
          )}

          {ao.documentParsed && typeof ao.documentParsed === 'object' && Object.keys(ao.documentParsed).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Documents requis</h3>
              {ao.documentParsed.documentsRequis ? (
                <ul className="space-y-1">
                  {(Array.isArray(ao.documentParsed.documentsRequis) ? ao.documentParsed.documentsRequis : []).map((doc: string, i: number) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {JSON.stringify(ao.documentParsed, null, 2)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
