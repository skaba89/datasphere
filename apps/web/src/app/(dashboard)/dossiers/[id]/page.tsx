'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dossiersApi } from '@/lib/api'
import { joursRestants } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Brain, Send, CheckCircle2, XCircle, Clock,
  AlertTriangle, X, MessageSquare, Shield, Upload, FileText,
  ChevronRight, Users, Calendar, Tag, History, Download,
  Edit3, Save,
} from 'lucide-react'

type DossierStatus = 'BROUILLON' | 'EN_COURS' | 'EN_VALIDATION' | 'VALIDE' | 'REJETE' | 'SOUMIS' | 'ARCHIVE'

const STATUS_CONFIG: Record<DossierStatus, { label: string; color: string; bg: string }> = {
  BROUILLON:     { label: 'Brouillon',     color: 'text-gray-600',   bg: 'bg-gray-100' },
  EN_COURS:      { label: 'En cours',      color: 'text-blue-700',   bg: 'bg-blue-100' },
  EN_VALIDATION: { label: 'En validation', color: 'text-orange-700', bg: 'bg-orange-100' },
  VALIDE:        { label: 'Validé ✓',      color: 'text-green-700',  bg: 'bg-green-100' },
  REJETE:        { label: 'Rejeté',        color: 'text-red-700',    bg: 'bg-red-100' },
  SOUMIS:        { label: 'Soumis',        color: 'text-purple-700', bg: 'bg-purple-100' },
  ARCHIVE:       { label: 'Archivé',       color: 'text-gray-500',   bg: 'bg-gray-50' },
}

type Tab = 'mem' | 'offre' | 'planning' | 'team' | 'risques' | 'pieces'

const TABS: { id: Tab; label: string; field: string }[] = [
  { id: 'mem',      label: 'Mémoire technique',   field: 'memTechnique' },
  { id: 'offre',    label: 'Offre financière',     field: 'offreFinanciere' },
  { id: 'planning', label: 'Planning',             field: 'planning' },
  { id: 'team',     label: 'Équipe',               field: 'team' },
  { id: 'risques',  label: 'Risques',              field: 'risques' },
  { id: 'pieces',   label: 'Pièces admin.',        field: 'piecesAdmin' },
]

const CHECKLIST_ITEMS = [
  'Mémoire technique complète et cohérente',
  'Offre financière détaillée et justifiée',
  'CV des experts clés joints',
  'Références techniques vérifiées',
  'Pièces administratives valides',
  'Planning réaliste et détaillé',
  'Conformité aux critères du cahier des charges',
]

function extractText(json: any): string {
  if (!json) return ''
  if (typeof json === 'string') return json
  if (json.content && typeof json.content === 'string') return json.content
  if (json.content && typeof json.content === 'object') return extractText(json.content)
  return JSON.stringify(json, null, 2)
}

function ContentSection({ data, fieldName, dossierStatus, dossierId, onSaved }: {
  data: any
  fieldName: string
  dossierStatus: DossierStatus
  dossierId: string
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const qc = useQueryClient()

  const text = extractText(data)
  const isEmpty = !text || text === '{}' || text === 'null'
  const isEditable = !['EN_VALIDATION', 'SOUMIS', 'ARCHIVE'].includes(dossierStatus)

  const saveMutation = useMutation({
    mutationFn: () => dossiersApi.update(dossierId, { [fieldName]: { content: draft } }),
    onSuccess: () => {
      toast.success('Contenu enregistré')
      qc.invalidateQueries({ queryKey: ['dossier', dossierId] })
      setEditing(false)
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  if (editing) {
    return (
      <div className="space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none resize-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 text-sm text-gray-500 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <X className="w-4 h-4" /> Annuler
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Section vide — utilisez &quot;Générer avec IA&quot; pour remplir automatiquement</p>
        {isEditable && (
          <button
            onClick={() => { setDraft(''); setEditing(true) }}
            className="mt-3 text-xs text-primary-600 hover:underline"
          >
            Rédiger manuellement →
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        {isEditable && (
          <button
            onClick={() => { setDraft(text); setEditing(true) }}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 border rounded-lg hover:bg-gray-50"
          >
            <Edit3 className="w-3.5 h-3.5" /> Modifier
          </button>
        )}
      </div>
      <div className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans bg-gray-50 rounded-xl p-5 border">
          {text}
        </pre>
      </div>
    </div>
  )
}

function ValidationModal({ dossierId, titre, mode, onClose }: {
  dossierId: string; titre: string; mode: 'valider' | 'rejeter' | 'soumettre_validation' | 'soumettre_final'; onClose: () => void
}) {
  const [commentaire, setCommentaire] = useState('')
  const [reference, setReference] = useState('')
  const [checklist, setChecklist] = useState<string[]>([])
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'valider') return dossiersApi.valider(dossierId, { commentaire, checklistOk: checklist })
      if (mode === 'rejeter') return dossiersApi.rejeter(dossierId, { commentaire })
      if (mode === 'soumettre_validation') return dossiersApi.soumettrePourValidation(dossierId)
      return dossiersApi.soumettre(dossierId, reference || undefined)
    },
    onSuccess: () => {
      const msgs = {
        valider: 'Dossier validé — le rédacteur a été notifié',
        rejeter: 'Dossier rejeté avec commentaires',
        soumettre_validation: 'Dossier envoyé en validation',
        soumettre_final: 'Dossier soumis officiellement !',
      }
      toast.success(msgs[mode])
      qc.invalidateQueries({ queryKey: ['dossier', dossierId] })
      qc.invalidateQueries({ queryKey: ['dossiers'] })
      onClose()
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const canSubmit = mode === 'rejeter' ? commentaire.trim().length >= 10 : true

  const TITLES = {
    valider: 'Valider le dossier',
    rejeter: 'Rejeter le dossier',
    soumettre_validation: 'Envoyer en validation',
    soumettre_final: 'Soumettre officiellement',
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">{TITLES[mode]}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border">{titre}</p>

          {mode === 'valider' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Checklist de validation :</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item} className="flex items-center gap-2.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-green-600"
                      checked={checklist.includes(item)}
                      onChange={(e) =>
                        setChecklist((prev) => e.target.checked ? [...prev, item] : prev.filter((i) => i !== item))
                      }
                    />
                    {item}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{checklist.length}/{CHECKLIST_ITEMS.length} points cochés</p>
            </div>
          )}

          {mode === 'soumettre_final' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Référence de soumission (optionnel)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex : ARMP/2026/001"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {(mode === 'valider' || mode === 'rejeter') && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Commentaire {mode === 'rejeter' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder={mode === 'rejeter' ? 'Corrections à apporter (min. 10 caractères)...' : 'Remarques optionnelles...'}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          )}

          {mode === 'soumettre_validation' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <p className="font-medium mb-1">Ce qui va se passer :</p>
              <ul className="space-y-0.5 text-orange-700 text-xs">
                <li>• Le dossier passera en statut <strong>En validation</strong></li>
                <li>• Les managers / admins seront notifiés par email</li>
                <li>• Le dossier sera verrouillé durant la validation</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
              mode === 'rejeter' ? 'bg-red-600 hover:bg-red-700' :
              mode === 'valider' ? 'bg-green-600 hover:bg-green-700' :
              'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {mutation.isPending ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mem')
  const [modal, setModal] = useState<'valider' | 'rejeter' | 'soumettre_validation' | 'soumettre_final' | null>(null)

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['dossier', id],
    queryFn: () => dossiersApi.get(id).then((r) => r.data),
  })

  const { data: validationsData } = useQuery({
    queryKey: ['dossier-validations', id],
    queryFn: () => dossiersApi.historiqueValidations(id).then((r) => r.data),
    enabled: !!dossier,
  })

  const genererMutation = useMutation({
    mutationFn: () => dossiersApi.genererIA(id),
    onSuccess: () => {
      toast.success('Dossier généré par IA !')
      qc.invalidateQueries({ queryKey: ['dossier', id] })
    },
    onError: () => toast.error('Erreur lors de la génération IA'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!dossier) return null

  const status = (dossier.status ?? 'BROUILLON') as DossierStatus
  const cfg = STATUS_CONFIG[status]
  const jours = dossier.ao?.dateLimite ? joursRestants(dossier.ao.dateLimite) : null
  const validations: any[] = validationsData ?? []

  const tabData: Record<Tab, any> = {
    mem:      dossier.memTechnique,
    offre:    dossier.offreFinanciere,
    planning: dossier.planning,
    team:     dossier.team,
    risques:  dossier.risques,
    pieces:   dossier.piecesAdmin,
  }

  const tabFields: Record<Tab, string> = {
    mem:      'memTechnique',
    offre:    'offreFinanciere',
    planning: 'planning',
    team:     'team',
    risques:  'risques',
    pieces:   'piecesAdmin',
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {modal && (
        <ValidationModal
          dossierId={id}
          titre={dossier.titre}
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux dossiers
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              {dossier.generatedByAI && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Généré par IA
                </span>
              )}
              <span className="text-xs text-gray-400">v{dossier.version}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{dossier.titre}</h1>
            {dossier.ao && (
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {dossier.ao.entiteAdj ?? dossier.ao.titre}
              </p>
            )}
          </div>

          {jours !== null && (
            <div className={`text-right flex-shrink-0 ${jours <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                {jours > 0 ? `${jours}j` : 'Expiré'}
              </div>
              <div className="text-xs text-gray-400">échéance AO</div>
            </div>
          )}
        </div>

        {/* Rejet note */}
        {status === 'REJETE' && dossier.validationNote && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <MessageSquare className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Corrections demandées :</p>
              <p className="text-red-600 mt-0.5">{dossier.validationNote}</p>
            </div>
          </div>
        )}

        {/* Validation note */}
        {status === 'VALIDE' && dossier.validationNote && (
          <div className="mt-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-700">Note du valideur :</p>
              <p className="text-green-600 mt-0.5">{dossier.validationNote}</p>
            </div>
          </div>
        )}

        {/* Soumis info */}
        {status === 'SOUMIS' && (
          <div className="mt-4 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              Soumis officiellement
              {dossier.soumisAt && ` le ${format(new Date(dossier.soumisAt), 'dd MMMM yyyy', { locale: fr })}`}
              {dossier.referenceSoumission && ` — Réf. ${dossier.referenceSoumission}`}
            </span>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
          {dossier.createdBy && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Créé par {dossier.createdBy.prenom} {dossier.createdBy.nom}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Modifié {format(new Date(dossier.updatedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
          </span>
          {dossier._count?.collaborateurs > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {dossier._count.collaborateurs} collaborateur(s)
            </span>
          )}
          {dossier.solution && (
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Template : {dossier.solution.nom}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {['BROUILLON', 'EN_COURS', 'REJETE'].includes(status) && !dossier.generatedByAI && (
          <button
            onClick={() => genererMutation.mutate()}
            disabled={genererMutation.isPending}
            className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            <Brain className="w-4 h-4" />
            {genererMutation.isPending ? 'Génération IA...' : 'Générer avec IA'}
          </button>
        )}

        {['BROUILLON', 'EN_COURS', 'REJETE'].includes(status) && (
          <button
            onClick={() => setModal('soumettre_validation')}
            className="flex items-center gap-2 text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
          >
            <Send className="w-4 h-4" />
            Envoyer en validation
          </button>
        )}

        {status === 'EN_VALIDATION' && (
          <>
            <button
              onClick={() => setModal('valider')}
              className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              <CheckCircle2 className="w-4 h-4" />
              Valider
            </button>
            <button
              onClick={() => setModal('rejeter')}
              className="flex items-center gap-2 text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
            >
              <XCircle className="w-4 h-4" />
              Rejeter
            </button>
          </>
        )}

        {status === 'VALIDE' && (
          <button
            onClick={() => setModal('soumettre_final')}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            <Upload className="w-4 h-4" />
            Soumettre officiellement
          </button>
        )}

        {dossier.exportPdfUrl && (
          <a
            href={dossier.exportPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Download className="w-4 h-4" />
            Télécharger PDF
          </a>
        )}
      </div>

      {/* Tabs content */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {TABS.map((tab) => {
            const hasContent = (() => {
              const d = tabData[tab.id]
              if (!d) return false
              const t = extractText(d)
              return t && t !== '{}' && t !== 'null'
            })()

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {hasContent && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                )}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          <ContentSection
            data={tabData[activeTab]}
            fieldName={tabFields[activeTab]}
            dossierStatus={status}
            dossierId={id}
            onSaved={() => qc.invalidateQueries({ queryKey: ['dossier', id] })}
          />
        </div>
      </div>

      {/* Historique des validations */}
      {validations.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b">
            <History className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Historique des validations</h2>
            <span className="text-sm text-gray-400">({validations.length})</span>
          </div>
          <div className="divide-y">
            {validations.map((v: any) => (
              <div key={v.id} className="flex gap-4 p-5">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  v.decision === 'APPROUVE' ? 'bg-green-100' : v.decision === 'REJETE' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {v.decision === 'APPROUVE'
                    ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                    : v.decision === 'REJETE'
                    ? <XCircle className="w-4 h-4 text-red-600" />
                    : <Shield className="w-4 h-4 text-gray-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {v.decision === 'APPROUVE' ? 'Validé' : v.decision === 'REJETE' ? 'Rejeté' : v.decision}
                      {v.valideur && ` par ${v.valideur.prenom} ${v.valideur.nom}`}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(v.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {v.commentaire && (
                    <p className="text-sm text-gray-600">{v.commentaire}</p>
                  )}
                  {v.checklistOk?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{v.checklistOk.length} points de checklist cochés</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Versions */}
      {dossier.versions?.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="flex items-center gap-2 p-5 border-b">
            <History className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Versions précédentes</h2>
            <span className="text-sm text-gray-400">({dossier.versions.length})</span>
          </div>
          <div className="divide-y">
            {dossier.versions.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">v{v.numero}</span>
                  <span className="text-gray-500">
                    {format(new Date(v.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                  {v.commentaire && <span className="text-gray-400">— {v.commentaire}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
