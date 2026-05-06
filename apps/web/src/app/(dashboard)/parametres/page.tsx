'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, documentsApi, aiApi } from '@/lib/api'
import {
  Building2, FileCheck, CreditCard, AlertTriangle,
  CheckCircle2, Clock, Brain, ChevronDown, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter — 150 000 GNF/mois',
  PRO: 'Pro — 450 000 GNF/mois',
  ENTERPRISE: 'Enterprise',
}

const PROVIDER_ICONS: Record<string, string> = {
  anthropic:  '🟣',
  openrouter: '🔀',
  groq:       '⚡',
  glm:        '🌐',
  qwen:       '🧠',
}

export default function ParametresPage() {
  const qc = useQueryClient()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedHeavy, setSelectedHeavy] = useState('')
  const [selectedLight, setSelectedLight] = useState('')

  const { data: org } = useQuery({
    queryKey: ['organisation'],
    queryFn: () => orgApi.get().then(r => r.data),
  })

  const { data: docs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then(r => r.data),
  })

  const { data: alertesDocs } = useQuery({
    queryKey: ['documents-alertes'],
    queryFn: () => documentsApi.alertes().then(r => r.data),
  })

  const { data: aiProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => aiApi.get('/providers').then(r => r.data),
  })

  const { data: aiConfig } = useQuery({
    queryKey: ['ai-config'],
    queryFn: () => aiApi.get('/config').then(r => r.data),
    onSuccess: (data: any) => {
      if (!selectedProvider) {
        setSelectedProvider(data.provider)
        setSelectedHeavy(data.modelHeavy)
        setSelectedLight(data.modelLight)
      }
    },
  } as any)

  const saveAiConfig = useMutation({
    mutationFn: () => aiApi.post('/config', {
      provider: selectedProvider,
      modelHeavy: selectedHeavy,
      modelLight: selectedLight,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Configuration IA sauvegardée')
      qc.invalidateQueries({ queryKey: ['ai-config'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const providers = aiProviders?.providers ?? {}
  const currentProvider = selectedProvider ?? aiConfig?.provider ?? 'anthropic'
  const currentModels = providers[currentProvider]?.models ?? []

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
          <h2 className="font-semibold text-gray-900">Profil de l&apos;entreprise</h2>
        </div>
        {org && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Nom', org.nom],
              ['Plan actuel', PLAN_LABELS[org.plan] || org.plan],
              ['RCCM', org.rccm || '—'],
              ['IFU', org.ifu || '—'],
              ['Effectif', org.effectif || '—'],
              ['Secteurs', org.secteurs?.join(', ') || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-gray-500">{label}</span>
                <p className="font-medium text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Configuration IA */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Brain className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Configuration IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choisissez votre provider et modèles pour la génération de dossiers</p>
          </div>
        </div>

        {/* Sélection provider */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {Object.entries(providers).map(([key, p]: [string, any]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedProvider(key)
                const defs = aiProviders?.defaults?.[key]
                if (defs) { setSelectedHeavy(defs.heavy); setSelectedLight(defs.light) }
              }}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                currentProvider === key
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{PROVIDER_ICONS[key]}</span>
                <span className="font-medium text-sm text-gray-900">{p.label}</span>
              </div>
              <p className="text-xs text-gray-500 leading-tight">{p.description}</p>
              {currentProvider === key && (
                <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Actif
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Modèle heavy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              Modèle principal (mémoire technique, dossiers)
            </label>
            <div className="relative">
              <select
                value={selectedHeavy}
                onChange={e => setSelectedHeavy(e.target.value)}
                className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white pr-8"
              >
                {currentModels.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-green-500" />
              Modèle rapide (scoring, résumés, analyses)
            </label>
            <div className="relative">
              <select
                value={selectedLight}
                onChange={e => setSelectedLight(e.target.value)}
                className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white pr-8"
              >
                {currentModels.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Note clé API */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Clés API requises :</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              ['Anthropic', 'ANTHROPIC_API_KEY'],
              ['OpenRouter', 'OPENROUTER_API_KEY'],
              ['Groq', 'GROQ_API_KEY'],
              ['GLM / Zhipu', 'GLM_API_KEY'],
              ['Qwen / DashScope', 'QWEN_API_KEY'],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  currentProvider === label.toLowerCase().split(' ')[0] ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className="text-gray-500">{label}:</span>
                <code className="text-gray-700 text-xs">{key}</code>
              </div>
            ))}
          </div>
          <p className="mt-2 text-gray-400">Configurez les clés dans le fichier <code>.env</code> du serveur.</p>
        </div>

        <button
          onClick={() => saveAiConfig.mutate()}
          disabled={saveAiConfig.isPending || !selectedProvider}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <Brain className="w-4 h-4" />
          {saveAiConfig.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration IA'}
        </button>
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
          <button className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600">
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
                    <p className="text-xs text-gray-400">{format(new Date(doc.dateExpiration), 'dd/MM/yyyy')}</p>
                  )}
                </div>
              </div>
            )
          })}
          {!docs?.length && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun document enregistré. Ajoutez vos pièces administratives.
            </p>
          )}
        </div>
        <button className="mt-4 text-sm text-orange-600 hover:underline">+ Ajouter un document</button>
      </section>
    </div>
  )
}
