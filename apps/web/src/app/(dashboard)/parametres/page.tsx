'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, documentsApi } from '@/lib/api'
import { Building2, Users, FileCheck, CreditCard, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter — 150 000 GNF/mois',
  PRO: 'Pro — 450 000 GNF/mois',
  ENTERPRISE: 'Enterprise',
}

export default function ParametresPage() {
  const qc = useQueryClient()

  const { data: org } = useQuery({
    queryKey: ['organisation'],
    queryFn: () => orgApi.get().then((r) => r.data),
  })

  const { data: docs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then((r) => r.data),
  })

  const { data: alertesDocs } = useQuery({
    queryKey: ['documents-alertes'],
    queryFn: () => documentsApi.alertes().then((r) => r.data),
  })

  const STATUT_DOC: Record<string, { label: string; icon: any; color: string }> = {
    VALIDE: { label: 'Valide', icon: CheckCircle2, color: 'text-green-600' },
    EXPIRE_BIENTOT: { label: 'Expire bientôt', icon: Clock, color: 'text-orange-600' },
    EXPIRE: { label: 'Expiré', icon: AlertTriangle, color: 'text-red-600' },
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Profil entreprise */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Profil de l'entreprise</h2>
        </div>
        {org && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Nom</span>
              <p className="font-medium text-gray-900 mt-0.5">{org.nom}</p>
            </div>
            <div>
              <span className="text-gray-500">Plan actuel</span>
              <p className="font-medium text-gray-900 mt-0.5">{PLAN_LABELS[org.plan] || org.plan}</p>
            </div>
            <div>
              <span className="text-gray-500">RCCM</span>
              <p className="font-medium text-gray-900 mt-0.5">{org.rccm || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">IFU</span>
              <p className="font-medium text-gray-900 mt-0.5">{org.ifu || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Effectif</span>
              <p className="font-medium text-gray-900 mt-0.5">{org.effectif || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Secteurs</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {org.secteurs?.join(', ') || '—'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Abonnement */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Abonnement</h2>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            org?.planStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            org?.planStatus === 'TRIALING' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {org?.planStatus === 'ACTIVE' ? 'Actif' :
             org?.planStatus === 'TRIALING' ? 'Période d\'essai' : 'Inactif'}
          </span>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Plan : <strong>{org?.plan}</strong>
          {org?.planExpiresAt && (
            <> · Expire le {format(new Date(org.planExpiresAt), 'dd MMMM yyyy', { locale: fr })}</>
          )}
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600">
            Mettre à niveau vers Pro
          </button>
          <button className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">
            Payer par Orange Money
          </button>
        </div>
      </section>

      {/* Documents administratifs */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Documents administratifs</h2>
          </div>
          {alertesDocs?.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              {alertesDocs.length} expir(ent) bientôt
            </span>
          )}
        </div>
        <div className="space-y-2">
          {docs?.map((doc: any) => {
            const conf = STATUT_DOC[doc.statut] || STATUT_DOC.VALIDE
            const Icon = conf.icon
            return (
              <div key={doc.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${conf.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{doc.nom}</p>
                  <p className="text-xs text-gray-500">{doc.type}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium ${conf.color}`}>{conf.label}</span>
                  {doc.dateExpiration && (
                    <p className="text-xs text-gray-400">
                      {format(new Date(doc.dateExpiration), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {docs?.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun document enregistré. Ajoutez vos pièces administratives pour accélérer la constitution des dossiers.
            </p>
          )}
        </div>
        <button className="mt-4 text-sm text-primary-600 hover:underline">
          + Ajouter un document
        </button>
      </section>
    </div>
  )
}
