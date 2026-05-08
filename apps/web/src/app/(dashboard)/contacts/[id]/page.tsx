'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft, Mail, Phone, Flame, Thermometer, Snowflake,
  MessageSquare, Video, FileText, Users, Send, Tag,
  Plus, Clock, CheckCircle2, Pencil, X,
} from 'lucide-react'

const INTERACTION_TYPES = [
  { value: 'REUNION', label: 'Réunion', icon: Users },
  { value: 'APPEL_TELEPHONIQUE', label: 'Appel téléphonique', icon: Phone },
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'EVENEMENT', label: 'Événement', icon: Video },
  { value: 'DOCUMENT_REMIS', label: 'Document remis', icon: FileText },
  { value: 'NOTE', label: 'Note interne', icon: MessageSquare },
]

function ProximiteLabel({ score }: { score: number }) {
  if (score >= 70) return (
    <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
      <Flame className="w-4 h-4" /> Contact chaud
    </span>
  )
  if (score >= 30) return (
    <span className="flex items-center gap-1 text-orange-500 text-sm font-medium">
      <Thermometer className="w-4 h-4" /> Contact tiède
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-blue-500 text-sm font-medium">
      <Snowflake className="w-4 h-4" /> Contact froid
    </span>
  )
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [interactionForm, setInteractionForm] = useState({
    type: 'REUNION',
    description: '',
    resultat: '',
  })

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.get(id).then((r) => r.data),
  })

  const interactionMutation = useMutation({
    mutationFn: () => contactsApi.addInteraction(id, interactionForm),
    onSuccess: () => {
      toast.success('Interaction enregistrée')
      qc.invalidateQueries({ queryKey: ['contact', id] })
      setShowInteractionForm(false)
      setInteractionForm({ type: 'REUNION', description: '', resultat: '' })
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!contact) return null

  const initiales = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux contacts
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 flex-shrink-0">
            {initiales}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {[contact.titre, contact.prenom, contact.nom].filter(Boolean).join(' ')}
                </h1>
                {contact.poste && <p className="text-gray-500 mt-0.5">{contact.poste}</p>}
                {contact.entite && (
                  <p className="text-sm text-gray-400 mt-0.5">{contact.entite.nom}</p>
                )}
              </div>
              <ProximiteLabel score={contact.scoreProximite ?? 0} />
            </div>

            {/* Coordonnées */}
            <div className="flex flex-wrap gap-4 mt-4">
              {contact.email?.[0] && (
                <a
                  href={`mailto:${contact.email[0]}`}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  {contact.email[0]}
                </a>
              )}
              {contact.telephone?.[0] && (
                <a
                  href={`tel:${contact.telephone[0]}`}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {contact.telephone[0]}
                </a>
              )}
            </div>

            {/* Tags */}
            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {contact.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {contact.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 whitespace-pre-line">{contact.notes}</p>
          </div>
        )}
      </div>

      {/* Score de proximité */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Score de proximité</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                (contact.scoreProximite ?? 0) >= 70 ? 'bg-red-500' :
                (contact.scoreProximite ?? 0) >= 30 ? 'bg-orange-400' : 'bg-blue-400'
              }`}
              style={{ width: `${contact.scoreProximite ?? 0}%` }}
            />
          </div>
          <span className="text-lg font-bold text-gray-900 w-12 text-right">
            {contact.scoreProximite ?? 0}/100
          </span>
        </div>
        {contact.derniereInteraction && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Dernière interaction : {format(new Date(contact.derniereInteraction), 'dd MMM yyyy', { locale: fr })}
          </p>
        )}
      </div>

      {/* Historique des interactions */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">
            Historique des interactions
            {contact.interactions?.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({contact.interactions.length})
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowInteractionForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </div>

        {/* Formulaire nouvelle interaction */}
        {showInteractionForm && (
          <div className="p-5 bg-orange-50 border-b">
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {INTERACTION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setInteractionForm((f) => ({ ...f, type: t.value }))}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      interactionForm.type === t.value
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <t.icon className="w-3 h-3" />
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={interactionForm.description}
                onChange={(e) => setInteractionForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Décrivez l'interaction : contexte, points discutés..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <input
                value={interactionForm.resultat}
                onChange={(e) => setInteractionForm((f) => ({ ...f, resultat: e.target.value }))}
                placeholder="Résultat / prochaine étape"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowInteractionForm(false)}
                  className="text-sm text-gray-500 px-3 py-1.5 border rounded-lg hover:bg-white"
                >
                  Annuler
                </button>
                <button
                  onClick={() => interactionMutation.mutate()}
                  disabled={!interactionForm.description || interactionMutation.isPending}
                  className="text-sm bg-primary-500 text-white px-4 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {interactionMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste interactions */}
        {contact.interactions?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune interaction enregistrée</p>
            <p className="text-xs mt-1">Ajoutez votre premier contact avec cette personne</p>
          </div>
        ) : (
          <div className="divide-y">
            {contact.interactions?.map((interaction: any) => {
              const typeConfig = INTERACTION_TYPES.find((t) => t.value === interaction.type)
              const Icon = typeConfig?.icon ?? MessageSquare
              return (
                <div key={interaction.id} className="flex gap-4 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{typeConfig?.label ?? interaction.type}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(interaction.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{interaction.description}</p>
                    {interaction.resultat && (
                      <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {interaction.resultat}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
