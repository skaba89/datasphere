'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orgApi, documentsApi, aiApi, usersApi, authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import {
  Building2, FileCheck, CreditCard, AlertTriangle,
  CheckCircle2, Clock, Brain, ChevronDown, Zap,
  Users, Award, Plus, X, UserCheck, UserX, Shield, Lock, Radio, Key,
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
  gemini:     '🔵',
}

function MonProfilForm({ currentUser, onSave, saving }: { currentUser: any; onSave: (d: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    prenom: currentUser?.prenom ?? '',
    nom: currentUser?.nom ?? '',
    telephone: currentUser?.telephone ?? '',
  })
  const hasChanges = form.prenom !== (currentUser?.prenom ?? '') ||
    form.nom !== (currentUser?.nom ?? '') ||
    form.telephone !== (currentUser?.telephone ?? '')

  return (
    <div className="space-y-3 max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Prénom</label>
          <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Nom</label>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Téléphone</label>
        <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
          placeholder="+224 6XX XXX XXX"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
        <input value={currentUser?.email ?? ''} disabled
          className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-400" />
      </div>
      <button
        onClick={() => onSave(form)}
        disabled={!hasChanges || saving}
        className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
      </button>
    </div>
  )
}

export default function ParametresPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [selectedHeavy, setSelectedHeavy] = useState('')
  const [selectedLight, setSelectedLight] = useState('')
  const [pwForm, setPwForm] = useState({ ancien: '', nouveau: '', confirm: '' })

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword(pwForm.ancien, pwForm.nouveau).then(r => r.data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès')
      setPwForm({ ancien: '', nouveau: '', confirm: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const [telemoKey, setTelemoKey] = useState('')
  const [telemoKeyVisible, setTelemoKeyVisible] = useState(false)

  const saveTelemoKey = useMutation({
    mutationFn: () => orgApi.update({ settings: { telemoApiKey: telemoKey } }).then(r => r.data),
    onSuccess: () => {
      toast.success('Clé API TELEMO sauvegardée')
      qc.invalidateQueries({ queryKey: ['organisation'] })
      qc.invalidateQueries({ queryKey: ['scraping-sources'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la sauvegarde'),
  })

  const [showExpertForm, setShowExpertForm] = useState(false)
  const [showRefForm, setShowRefForm] = useState(false)
  const [showDocForm, setShowDocForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', prenom: '', nom: '', role: 'WRITER' })
  const [inviteResult, setInviteResult] = useState<{ tempPassword: string; email: string } | null>(null)
  const [expertForm, setExpertForm] = useState({ nom: '', prenom: '', titre: '', specialites: '', anneesExp: 5 })
  const [refForm, setRefForm] = useState({ client: '', projet: '', secteur: 'NUMERIQUE', montantGNF: '', annee: new Date().getFullYear() })
  const [docForm, setDocForm] = useState({ type: 'RCCM', nom: '', fileUrl: '', dateExpiration: '' })

  const { data: org } = useQuery({
    queryKey: ['organisation'],
    queryFn: () => orgApi.get().then(r => r.data),
  })

  useEffect(() => {
    if (org?.settings?.telemoApiKey) setTelemoKey(org.settings.telemoApiKey)
  }, [org])

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
  })

  // Remplace le onSuccess deprecated de TanStack Query v5
  useEffect(() => {
    if (aiConfig && !selectedProvider) {
      setSelectedProvider(aiConfig.provider)
      setSelectedHeavy(aiConfig.modelHeavy)
      setSelectedLight(aiConfig.modelLight)
    }
  }, [aiConfig, selectedProvider])

  const { data: teamUsers } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => usersApi.list().then(r => r.data),
  })

  const inviterMutation = useMutation({
    mutationFn: () => usersApi.inviter(inviteForm).then(r => r.data),
    onSuccess: (data: any) => {
      toast.success(`${inviteForm.prenom} ${inviteForm.nom} invité avec succès`)
      setInviteResult({ tempPassword: data.tempPassword, email: data.email })
      qc.invalidateQueries({ queryKey: ['team-users'] })
      setInviteForm({ email: '', prenom: '', nom: '', role: 'WRITER' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'invitation'),
  })

  const toggleUserMutation = useMutation({
    mutationFn: (userId: string) => usersApi.toggleActive(userId).then(r => r.data),
    onSuccess: () => {
      toast.success('Statut utilisateur mis à jour')
      qc.invalidateQueries({ queryKey: ['team-users'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.update(id, { role }).then(r => r.data),
    onSuccess: () => {
      toast.success('Rôle mis à jour')
      qc.invalidateQueries({ queryKey: ['team-users'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const { data: experts } = useQuery({
    queryKey: ['experts'],
    queryFn: () => orgApi.experts().then(r => r.data),
  })

  const { data: references } = useQuery({
    queryKey: ['references'],
    queryFn: () => orgApi.references().then(r => r.data),
  })

  const createExpert = useMutation({
    mutationFn: () => orgApi.createExpert({
      prenom: expertForm.prenom,
      nom: expertForm.nom,
      titre: expertForm.titre || expertForm.specialites.split(',')[0]?.trim() || 'Expert',
      specialites: expertForm.specialites.split(',').map(s => s.trim()).filter(Boolean),
      anneesExp: expertForm.anneesExp,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Expert ajouté')
      qc.invalidateQueries({ queryKey: ['experts'] })
      setExpertForm({ nom: '', prenom: '', titre: '', specialites: '', anneesExp: 5 })
      setShowExpertForm(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const createReference = useMutation({
    mutationFn: () => orgApi.createReference({
      titre: refForm.projet,
      client: refForm.client,
      description: '',
      secteur: refForm.secteur,
      dateDebut: new Date(refForm.annee, 0, 1).toISOString(),
      montantGNF: refForm.montantGNF ? String(refForm.montantGNF) : undefined,
      technologies: [],
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Référence ajoutée')
      qc.invalidateQueries({ queryKey: ['references'] })
      setRefForm({ client: '', projet: '', secteur: 'NUMERIQUE', montantGNF: '', annee: new Date().getFullYear() })
      setShowRefForm(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const createDoc = useMutation({
    mutationFn: () => documentsApi.create({
      type: docForm.type,
      nom: docForm.nom,
      fileUrl: docForm.fileUrl || undefined,
      dateExpiration: docForm.dateExpiration ? new Date(docForm.dateExpiration).toISOString() : undefined,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Document ajouté')
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['documents-alertes'] })
      setDocForm({ type: 'RCCM', nom: '', fileUrl: '', dateExpiration: '' })
      setShowDocForm(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  const deleteDoc = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document supprimé')
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['documents-alertes'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

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
  const currentProvider = selectedProvider ?? (aiConfig as any)?.provider ?? 'anthropic'
  const currentModels = providers[currentProvider]?.models ?? []

  const STATUT_DOC: Record<string, { label: string; icon: any; color: string }> = {
    VALIDE: { label: 'Valide', icon: CheckCircle2, color: 'text-green-600' },
    EXPIRE_BIENTOT: { label: 'Expire bientôt', icon: Clock, color: 'text-orange-600' },
    EXPIRE: { label: 'Expiré', icon: AlertTriangle, color: 'text-red-600' },
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(currentUser!.id, data).then(r => r.data),
    onSuccess: () => toast.success('Profil mis à jour'),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>

      {/* Mon profil */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Mon profil</h2>
        </div>
        <MonProfilForm currentUser={currentUser} onSave={(data) => updateProfileMutation.mutate(data)} saving={updateProfileMutation.isPending} />
      </section>

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
            ['Google Gemini', 'GEMINI_API_KEY'],
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

      {/* Sécurité — changer mot de passe */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Sécurité</h2>
            <p className="text-xs text-gray-400 mt-0.5">Modifiez votre mot de passe</p>
          </div>
        </div>
        <div className="max-w-sm space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={pwForm.ancien}
              onChange={e => setPwForm(f => ({ ...f, ancien: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={pwForm.nouveau}
              onChange={e => setPwForm(f => ({ ...f, nouveau: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          {pwForm.nouveau && pwForm.confirm && pwForm.nouveau !== pwForm.confirm && (
            <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
          )}
          <button
            onClick={() => changePwMutation.mutate()}
            disabled={changePwMutation.isPending || !pwForm.ancien || !pwForm.nouveau || pwForm.nouveau !== pwForm.confirm}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium"
          >
            {changePwMutation.isPending ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>
      </section>

      {/* Gestion de l'équipe */}
      {['ADMIN', 'MANAGER'].includes(currentUser?.role ?? '') && (
        <section className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Équipe & accès</h2>
                <p className="text-xs text-gray-400 mt-0.5">Gérez les rôles et accès des membres de votre organisation</p>
              </div>
            </div>
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={() => { setShowInviteForm(v => !v); setInviteResult(null) }}
                className="flex items-center gap-2 text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                Inviter
              </button>
            )}
          </div>

          {/* Invite form */}
          {showInviteForm && !inviteResult && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm font-medium text-gray-800 mb-3">Inviter un nouveau membre</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  placeholder="Prénom *"
                  value={inviteForm.prenom}
                  onChange={e => setInviteForm(f => ({ ...f, prenom: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                />
                <input
                  placeholder="Nom *"
                  value={inviteForm.nom}
                  onChange={e => setInviteForm(f => ({ ...f, nom: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white col-span-2"
                />
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  <option value="WRITER">Rédacteur</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VIEWER">Lecteur</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => inviterMutation.mutate()}
                  disabled={inviterMutation.isPending || !inviteForm.email || !inviteForm.prenom || !inviteForm.nom}
                  className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {inviterMutation.isPending ? 'Invitation...' : 'Créer le compte'}
                </button>
                <button onClick={() => setShowInviteForm(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Invite success — show temp password */}
          {inviteResult && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-semibold text-green-800 mb-2">✅ Compte créé avec succès</p>
              <p className="text-xs text-gray-600 mb-2">Communiquez ces identifiants à la personne invitée :</p>
              <div className="bg-white rounded-lg p-3 border border-green-200 text-sm font-mono space-y-1">
                <div><span className="text-gray-500">Email:</span> <strong>{inviteResult.email}</strong></div>
                <div><span className="text-gray-500">Mot de passe temporaire:</span> <strong>{inviteResult.tempPassword}</strong></div>
              </div>
              <p className="text-xs text-orange-600 mt-2">⚠️ La personne doit changer son mot de passe à la première connexion.</p>
              <button onClick={() => { setInviteResult(null); setShowInviteForm(false) }} className="mt-2 text-xs text-gray-500 underline">
                Fermer
              </button>
            </div>
          )}
          <div className="space-y-2">
            {(teamUsers ?? []).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-700">
                    {(u.prenom?.[0] ?? u.nom?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.id !== currentUser?.id && currentUser?.role === 'ADMIN' ? (
                    <select
                      value={u.role}
                      onChange={e => updateRoleMutation.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs border rounded px-2 py-1 bg-white focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="WRITER">Rédacteur</option>
                      <option value="VIEWER">Lecteur</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{u.role}</span>
                  )}
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => toggleUserMutation.mutate(u.id)}
                      disabled={toggleUserMutation.isPending}
                      title={u.isActive ? 'Désactiver' : 'Réactiver'}
                      className={`p-1 rounded transition-colors ${u.isActive ? 'text-green-600 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                    >
                      {u.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!(teamUsers ?? []).length && (
              <p className="text-sm text-gray-500 text-center py-4">Aucun membre trouvé</p>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            {(teamUsers ?? []).length} membre{(teamUsers ?? []).length > 1 ? 's' : ''} dans l&apos;organisation
          </p>
        </section>
      )}

      {/* Documents administratifs */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Documents administratifs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pièces légales requises pour les soumissions (RCCM, IFU, attestations…)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alertesDocs?.length > 0 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                {alertesDocs.length} expir(ent) bientôt
              </span>
            )}
            <button
              onClick={() => setShowDocForm(v => !v)}
              className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              {showDocForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showDocForm ? 'Annuler' : 'Ajouter'}
            </button>
          </div>
        </div>

        {showDocForm && (
          <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type de document</label>
                <select
                  value={docForm.type}
                  onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {[
                    ['RCCM', 'RCCM'],
                    ['IFU', 'IFU'],
                    ['ATTESTATION_FISCALE', 'Attestation fiscale'],
                    ['ATTESTATION_CNSS', 'Attestation CNSS'],
                    ['STATUTS', 'Statuts'],
                    ['BILAN', 'Bilan financier'],
                    ['REFERENCE_TECHNIQUE', 'Référence technique'],
                    ['CV_EXPERT', 'CV Expert'],
                    ['AUTRE', 'Autre'],
                  ].map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nom / description</label>
                <input
                  value={docForm.nom}
                  onChange={e => setDocForm(f => ({ ...f, nom: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="RCCM N°GN-CON-2024-B5-0001"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">URL du fichier (optionnel)</label>
                <input
                  value={docForm.fileUrl}
                  onChange={e => setDocForm(f => ({ ...f, fileUrl: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date d&apos;expiration (optionnel)</label>
                <input
                  type="date"
                  value={docForm.dateExpiration}
                  onChange={e => setDocForm(f => ({ ...f, dateExpiration: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <button
              onClick={() => createDoc.mutate()}
              disabled={createDoc.isPending || !docForm.nom}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {createDoc.isPending ? 'Ajout...' : 'Ajouter le document'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {docs?.map((doc: any) => {
            // Calculer le statut du document côté client (le backend l'ajoute via findAll)
            let docStatut = 'VALIDE'
            if (doc.dateExpiration) {
              const expDate = new Date(doc.dateExpiration)
              const now = new Date()
              const dans30j = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              if (expDate < now) docStatut = 'EXPIRE'
              else if (expDate < dans30j) docStatut = 'EXPIRE_BIENTOT'
            }
            const conf = STATUT_DOC[docStatut] || STATUT_DOC.VALIDE
            const Icon = conf.icon
            return (
              <div key={doc.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${conf.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{doc.nom}</p>
                  <p className="text-xs text-gray-500">{doc.type?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-medium ${conf.color}`}>{conf.label}</span>
                    {doc.dateExpiration && (
                      <p className="text-xs text-gray-400">{format(new Date(doc.dateExpiration), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex-shrink-0"
                    >
                      Voir
                    </a>
                  )}
                  <button
                    onClick={() => deleteDoc.mutate(doc.id)}
                    disabled={deleteDoc.isPending}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Supprimer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
          {!docs?.length && !showDocForm && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun document enregistré. Ajoutez vos pièces administratives.
            </p>
          )}
        </div>
      </section>

      {/* Équipe d'experts */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Équipe d&apos;experts</h2>
              <p className="text-xs text-gray-400 mt-0.5">Valorise la capacité humaine dans le scoring des dossiers</p>
            </div>
          </div>
          <button
            onClick={() => setShowExpertForm(v => !v)}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {showExpertForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showExpertForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>

        {showExpertForm && (
          <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prénom</label>
                <input
                  value={expertForm.prenom}
                  onChange={e => setExpertForm(f => ({ ...f, prenom: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nom</label>
                <input
                  value={expertForm.nom}
                  onChange={e => setExpertForm(f => ({ ...f, nom: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Camara"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Titre / Fonction</label>
                <input
                  value={expertForm.titre}
                  onChange={e => setExpertForm(f => ({ ...f, titre: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ingénieur Senior, Consultant..."
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Années d&apos;expérience</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={expertForm.anneesExp}
                  onChange={e => setExpertForm(f => ({ ...f, anneesExp: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Spécialités (séparées par virgule)</label>
              <input
                value={expertForm.specialites}
                onChange={e => setExpertForm(f => ({ ...f, specialites: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Génie civil, Gestion de projet, BTP..."
              />
            </div>
            <button
              onClick={() => createExpert.mutate()}
              disabled={createExpert.isPending || !expertForm.nom || !expertForm.specialites}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {createExpert.isPending ? 'Ajout...' : 'Ajouter l\'expert'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {(experts ?? []).map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-orange-700">
                  {(e.prenom?.[0] ?? e.nom?.[0] ?? '?').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{e.prenom} {e.nom}</p>
                <p className="text-xs text-gray-500">{e.specialites?.join(', ') || e.titre}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{e.anneesExp} ans</span>
            </div>
          ))}
          {!(experts ?? []).length && !showExpertForm && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun expert enregistré. Ajoutez les membres clés de votre équipe.
            </p>
          )}
        </div>
      </section>

      {/* Sources de veille */}
      {currentUser?.role === 'ADMIN' && (
        <section className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <Radio className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Sources de veille</h2>
              <p className="text-xs text-gray-400 mt-0.5">Configurez vos accès aux plateformes de publication d&apos;appels d&apos;offres</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sources libres */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'ARMP', nom: 'ARMP Guinée', url: 'armp.gov.gn', actif: true },
                { id: 'JAO', nom: 'JAO Guinée', url: 'jao.gov.gn', actif: true },
                { id: 'BANQUE_MONDIALE', nom: 'Banque Mondiale', url: 'projects.worldbank.org', actif: true },
                { id: 'PNUD', nom: 'PNUD / UNDP', url: 'procurement-notices.undp.org', actif: true },
                { id: 'BAD', nom: 'Banque Africaine de Dév.', url: 'afdb.org', actif: true },
              ].map((src) => (
                <div key={src.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{src.nom}</p>
                    <p className="text-xs text-gray-500">{src.url}</p>
                  </div>
                  <span className="text-xs text-green-700 font-medium bg-green-100 px-2 py-0.5 rounded-full">Actif</span>
                </div>
              ))}
            </div>

            {/* TELEMO — clé API */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-gray-900">TELEMO</span>
                {org?.settings?.telemoApiKey ? (
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">Configuré</span>
                ) : (
                  <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full font-medium">Clé requise</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3">
                TELEMO est la plateforme nationale guinéenne de marchés publics électroniques.
                Une clé API est requise pour accéder aux données en temps réel.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={telemoKeyVisible ? 'text' : 'password'}
                    value={telemoKey}
                    onChange={e => setTelemoKey(e.target.value)}
                    placeholder="Entrez votre clé API TELEMO..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none pr-20 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setTelemoKeyVisible(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    {telemoKeyVisible ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <button
                  onClick={() => saveTelemoKey.mutate()}
                  disabled={saveTelemoKey.isPending || !telemoKey.trim()}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg disabled:opacity-50 font-medium transition-colors flex-shrink-0"
                >
                  {saveTelemoKey.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
              {org?.settings?.telemoApiKey && (
                <button
                  onClick={() => { setTelemoKey(''); orgApi.update({ settings: { telemoApiKey: null } }).then(() => { toast.success('Clé TELEMO supprimée'); qc.invalidateQueries({ queryKey: ['organisation'] }) }) }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                >
                  Supprimer la clé
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Références clients */}
      <section className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Références clients</h2>
              <p className="text-xs text-gray-400 mt-0.5">Valorise l&apos;expérience passée dans le scoring de capacité</p>
            </div>
          </div>
          <button
            onClick={() => setShowRefForm(v => !v)}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {showRefForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showRefForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>

        {showRefForm && (
          <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Client / Maître d&apos;ouvrage</label>
                <input
                  value={refForm.client}
                  onChange={e => setRefForm(f => ({ ...f, client: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ministère des Travaux Publics"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Projet</label>
                <input
                  value={refForm.projet}
                  onChange={e => setRefForm(f => ({ ...f, projet: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Construction pont de Kaloum"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Secteur</label>
                <select
                  value={refForm.secteur}
                  onChange={e => setRefForm(f => ({ ...f, secteur: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  {['NUMERIQUE','SANTE','EDUCATION','TRANSPORT','AGRICULTURE','FINANCE','SECURITE','ENVIRONNEMENT','GOUVERNANCE','INFRASTRUCTURE','ENERGIE','EAU','AUTRE'].map(s => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Montant (GNF)</label>
                <input
                  type="number"
                  min={0}
                  value={refForm.montantGNF}
                  onChange={e => setRefForm(f => ({ ...f, montantGNF: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="500000000"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Année</label>
                <input
                  type="number"
                  min={2000}
                  max={2030}
                  value={refForm.annee}
                  onChange={e => setRefForm(f => ({ ...f, annee: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <button
              onClick={() => createReference.mutate()}
              disabled={createReference.isPending || !refForm.client || !refForm.projet}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {createReference.isPending ? 'Ajout...' : 'Ajouter la référence'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {(references ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{r.titre}</p>
                <p className="text-xs text-gray-500">{r.client}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.montantGNF && (
                  <p className="text-xs font-medium text-gray-700">
                    {(Number(r.montantGNF) / 1_000_000).toFixed(0)}M GNF
                  </p>
                )}
                <p className="text-xs text-gray-400">{r.dateDebut ? new Date(r.dateDebut).getFullYear() : ''}</p>
              </div>
            </div>
          ))}
          {!(references ?? []).length && !showRefForm && (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune référence enregistrée. Ajoutez vos projets passés pour renforcer votre scoring.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
