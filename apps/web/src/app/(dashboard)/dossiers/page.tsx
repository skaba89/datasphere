'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dossiersApi } from '@/lib/api'
import { joursRestants } from '@/lib/utils'
import { toast } from 'sonner'
import {
  FileText, Brain, Send, CheckCircle2, XCircle, Clock,
  AlertTriangle, ChevronRight, X, MessageSquare, Shield,
  Upload,
} from 'lucide-react'

type DossierStatus = 'BROUILLON' | 'EN_COURS' | 'EN_VALIDATION' | 'VALIDE' | 'REJETE' | 'SOUMIS' | 'ARCHIVE'

const STATUS_CONFIG: Record<DossierStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  BROUILLON:     { label: 'Brouillon',    color: 'text-gray-600',   bg: 'bg-gray-100',   icon: <FileText className="w-3.5 h-3.5" /> },
  EN_COURS:      { label: 'En cours',     color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Clock className="w-3.5 h-3.5" /> },
  EN_VALIDATION: { label: 'En validation',color: 'text-orange-700', bg: 'bg-orange-100', icon: <Shield className="w-3.5 h-3.5" /> },
  VALIDE:        { label: 'Validé ✓',     color: 'text-green-700',  bg: 'bg-green-100',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJETE:        { label: 'Rejeté',       color: 'text-red-700',    bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  SOUMIS:        { label: 'Soumis',       color: 'text-purple-700', bg: 'bg-purple-100', icon: <Send className="w-3.5 h-3.5" /> },
  ARCHIVE:       { label: 'Archivé',      color: 'text-gray-500',   bg: 'bg-gray-50',    icon: <FileText className="w-3.5 h-3.5" /> },
}

type ModalMode = 'valider' | 'rejeter' | 'soumettre_validation' | 'soumettre_final'

interface ModalProps {
  dossierId: string
  titre: string
  mode: ModalMode
  onClose: () => void
}

const CHECKLIST_ITEMS = [
  'Mémoire technique complète et cohérente',
  'Offre financière détaillée et justifiée',
  'CV des experts clés joints',
  'Références techniques vérifiées',
  'Pièces administratives valides',
  'Planning réaliste et détaillé',
  'Conformité aux critères du cahier des charges',
]

function ValidationModal({ dossierId, titre, mode, onClose }: ModalProps) {
  const [commentaire, setCommentaire] = useState('')
  const [reference, setReference] = useState('')
  const [checklist, setChecklist] = useState<string[]>([])
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'valider') return dossiersApi.post(`/${dossierId}/valider`, { commentaire, checklistOk: checklist }).then(r => r.data)
      if (mode === 'rejeter') return dossiersApi.post(`/${dossierId}/rejeter`, { commentaire }).then(r => r.data)
      if (mode === 'soumettre_validation') return dossiersApi.post(`/${dossierId}/soumettre-validation`).then(r => r.data)
      return dossiersApi.post(`/${dossierId}/soumettre`, { reference }).then(r => r.data)
    },
    onSuccess: () => {
      const msgs: Record<ModalMode, string> = {
        valider: 'Dossier validé — le rédacteur a été notifié par email',
        rejeter: 'Dossier rejeté avec commentaires',
        soumettre_validation: 'Dossier envoyé en validation — les managers ont été notifiés',
        soumettre_final: 'Dossier soumis officiellement !',
      }
      toast.success(msgs[mode])
      qc.invalidateQueries({ queryKey: ['dossiers'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const TITLES: Record<ModalMode, string> = {
    valider: '✅ Valider le dossier',
    rejeter: '❌ Rejeter le dossier',
    soumettre_validation: '🔍 Envoyer en validation',
    soumettre_final: '🚀 Soumettre officiellement',
  }

  const canSubmit = mode === 'rejeter'
    ? commentaire.trim().length >= 10
    : mode === 'valider'
    ? commentaire.trim().length >= 0
    : true

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">{TITLES[mode]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <span className="font-medium">Dossier :</span> {titre}
          </p>

          {/* Checklist pour validation manager */}
          {mode === 'valider' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Checklist de validation :</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {CHECKLIST_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-green-600 accent-green-600"
                      checked={checklist.includes(item)}
                      onChange={e =>
                        setChecklist(prev => e.target.checked ? [...prev, item] : prev.filter(i => i !== item))
                      }
                    />
                    {item}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{checklist.length}/{CHECKLIST_ITEMS.length} points cochés</p>
            </div>
          )}

          {/* Référence soumission finale */}
          {mode === 'soumettre_final' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Référence de soumission (optionnel)</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Ex : ARMP/2026/001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {/* Commentaire valider/rejeter */}
          {(mode === 'valider' || mode === 'rejeter') && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Commentaire {mode === 'rejeter' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder={mode === 'rejeter' ? 'Expliquez les corrections à apporter (obligatoire)...' : 'Remarques pour le rédacteur (optionnel)...'}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              {mode === 'rejeter' && commentaire.trim().length < 10 && commentaire.length > 0 && (
                <p className="text-xs text-red-500 mt-1">Minimum 10 caractères</p>
              )}
            </div>
          )}

          {/* Info box soumission validation */}
          {mode === 'soumettre_validation' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <p className="font-medium mb-2">Ce qui va se passer :</p>
              <ul className="space-y-1 text-orange-700">
                <li>• Le dossier passera en statut <strong>En validation</strong></li>
                <li>• Tous les managers / admins seront notifiés par email</li>
                <li>• Vous recevrez la décision par email</li>
                <li>• Le dossier sera verrouillé durant la validation</li>
              </ul>
            </div>
          )}

          {/* Info box soumission finale */}
          {mode === 'soumettre_final' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium mb-2">Soumission officielle :</p>
              <ul className="space-y-1 text-green-700">
                <li>• Le dossier sera marqué <strong>Soumis</strong></li>
                <li>• L&apos;appel d&apos;offres passera en statut Soumis</li>
                <li>• Cette action est irréversible</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors ${
              mode === 'rejeter' ? 'bg-red-600 hover:bg-red-700' :
              mode === 'valider' ? 'bg-green-600 hover:bg-green-700' :
              'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {mutation.isPending ? 'En cours...' : TITLES[mode]}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DossiersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ dossierId: string; titre: string; mode: ModalMode } | null>(null)
  // En production, récupérer depuis useAuthStore()
  const userRole = 'MANAGER'

  const { data, isLoading } = useQuery({
    queryKey: ['dossiers'],
    queryFn: () => dossiersApi.get('/').then(r => r.data),
  })

  const genererMutation = useMutation({
    mutationFn: (id: string) => dossiersApi.post(`/${id}/generer-ia`).then(r => r.data),
    onSuccess: () => { toast.success('Dossier IA généré !'); qc.invalidateQueries({ queryKey: ['dossiers'] }) },
    onError: () => toast.error('Erreur lors de la génération IA'),
  })

  const dossiers = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers de réponse</h1>
          <p className="text-gray-500 mt-1">Gestion et validation avant soumission officielle</p>
        </div>
      </div>

      {/* Pipeline visuel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Workflow de validation</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
          {(['BROUILLON', 'EN_COURS', 'EN_VALIDATION', 'VALIDE', 'SOUMIS'] as DossierStatus[]).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`}>
                {STATUS_CONFIG[s].icon}
                {STATUS_CONFIG[s].label}
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
            </div>
          ))}
          <div className="flex items-center gap-2 flex-shrink-0 opacity-60">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_CONFIG.REJETE.bg} ${STATUS_CONFIG.REJETE.color}`}>
              {STATUS_CONFIG.REJETE.icon}
              Rejeté (→ corrections)
            </div>
          </div>
        </div>
      </div>

      {/* Dossiers */}
      {dossiers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun dossier de réponse</p>
          <p className="text-sm text-gray-400 mt-1">Créez un dossier depuis un appel d&apos;offres qualifié</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dossiers.map((d: any) => {
            const status = (d.status ?? 'BROUILLON') as DossierStatus
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.BROUILLON
            const jours = d.ao?.dateLimite ? joursRestants(d.ao.dateLimite) : null

            return (
              <div
                key={d.id}
                className={`bg-white rounded-xl border p-5 transition-shadow ${
                  status === 'EN_VALIDATION' ? 'border-orange-300 shadow-md shadow-orange-50' :
                  status === 'REJETE' ? 'border-red-300' :
                  status === 'VALIDE' ? 'border-green-300' :
                  'border-gray-200'
                }`}
              >
                {/* Commentaire de rejet */}
                {status === 'REJETE' && d.validationNote && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
                    <MessageSquare className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-700">Corrections demandées :</p>
                      <p className="text-red-600 mt-0.5">{d.validationNote}</p>
                    </div>
                  </div>
                )}

                {/* Validé */}
                {status === 'VALIDE' && d.validationNote && (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700">Note du valideur :</p>
                      <p className="text-green-600 mt-0.5">{d.validationNote}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {d.generatedByAI && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Brain className="w-3 h-3" />IA
                        </span>
                      )}
                      <span className="text-xs text-gray-400">v{d.version}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{d.titre}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{d.ao?.entiteAdj ?? '—'}</p>
                  </div>

                  {jours !== null && (
                    <div className={`text-right flex-shrink-0 ${jours <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <AlertTriangle className={`w-3.5 h-3.5 ${jours <= 7 ? 'text-red-500' : 'text-gray-400'}`} />
                        {jours > 0 ? `${jours}j` : 'Expiré'}
                      </div>
                      <div className="text-xs text-gray-400">échéance</div>
                    </div>
                  )}
                </div>

                {/* Actions selon statut */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {/* Générer IA */}
                  {['BROUILLON', 'EN_COURS', 'REJETE'].includes(status) && !d.generatedByAI && (
                    <button
                      onClick={() => genererMutation.mutate(d.id)}
                      disabled={genererMutation.isPending}
                      className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Générer avec IA
                    </button>
                  )}

                  {/* Envoyer en validation */}
                  {['BROUILLON', 'EN_COURS', 'REJETE'].includes(status) && (
                    <button
                      onClick={() => setModal({ dossierId: d.id, titre: d.titre, mode: 'soumettre_validation' })}
                      className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer en validation
                    </button>
                  )}

                  {/* Actions manager (valider / rejeter) */}
                  {status === 'EN_VALIDATION' && ['ADMIN', 'MANAGER'].includes(userRole) && (
                    <>
                      <button
                        onClick={() => setModal({ dossierId: d.id, titre: d.titre, mode: 'valider' })}
                        className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        onClick={() => setModal({ dossierId: d.id, titre: d.titre, mode: 'rejeter' })}
                        className="flex items-center gap-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter avec commentaires
                      </button>
                    </>
                  )}

                  {/* Soumettre officiellement (après validation) */}
                  {status === 'VALIDE' && (
                    <button
                      onClick={() => setModal({ dossierId: d.id, titre: d.titre, mode: 'soumettre_final' })}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Soumettre officiellement
                    </button>
                  )}

                  {/* Soumis */}
                  {status === 'SOUMIS' && (
                    <span className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Soumis{d.soumisAt ? ` le ${new Date(d.soumisAt).toLocaleDateString('fr-FR')}` : ''}
                      {d.referenceSoumission ? ` — Réf. ${d.referenceSoumission}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal validation */}
      {modal && <ValidationModal {...modal} onClose={() => setModal(null)} />}
    </div>
  )
}
