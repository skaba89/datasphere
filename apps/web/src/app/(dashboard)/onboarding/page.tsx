'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { orgApi } from '@/lib/api'
import { toast } from 'sonner'
import { Brain, Building2, Users, FileText, CheckCircle2, ArrowRight } from 'lucide-react'

const SECTEURS = [
  'NUMERIQUE', 'SANTE', 'EDUCATION', 'INFRASTRUCTURE',
  'AGRICULTURE', 'ENERGIE', 'FINANCE', 'GOUVERNANCE',
]

const SECTEUR_LABELS: Record<string, string> = {
  NUMERIQUE: 'Numérique / IT', SANTE: 'Santé', EDUCATION: 'Éducation',
  INFRASTRUCTURE: 'Infrastructure', AGRICULTURE: 'Agriculture',
  ENERGIE: 'Énergie', FINANCE: 'Finance', GOUVERNANCE: 'Gouvernance',
}

const STEPS = [
  { id: 'profil', label: 'Profil entreprise', icon: Building2 },
  { id: 'equipe', label: 'Secteurs & capacité', icon: Users },
  { id: 'pret', label: 'Prêt !', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    nom: '',
    rccm: '',
    ifu: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    secteurs: [] as string[],
    effectif: '',
    certifications: '',
    description: '',
  })

  const updateMutation = useMutation({
    mutationFn: () => orgApi.update({
      rccm: form.rccm,
      ifu: form.ifu,
      adresse: form.adresse,
      telephone: form.telephone,
      email: form.email,
      siteWeb: form.siteWeb || undefined,
      secteurs: form.secteurs,
      effectif: form.effectif ? Number(form.effectif) : undefined,
      certifications: form.certifications ? form.certifications.split(',').map(s => s.trim()).filter(Boolean) : [],
      description: form.description,
    }).then(r => r.data),
    onSuccess: () => {
      setStep(2)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la sauvegarde'),
  })

  const toggleSecteur = (s: string) => {
    setForm(f => ({
      ...f,
      secteurs: f.secteurs.includes(s) ? f.secteurs.filter(x => x !== s) : [...f.secteurs, s],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur GuineaTender AI</h1>
          <p className="text-gray-500 mt-2">Configurez votre profil en 2 minutes pour des analyses IA personnalisées</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === step ? 'bg-orange-500 text-white' :
                i < step ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* Step 0 — Company profile */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900 mb-2">Identité de votre entreprise</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Nom de l&apos;entreprise *</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Tech Guinée SARL" disabled
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50 text-gray-500" />
                <p className="text-xs text-gray-400 mt-1">Le nom est défini lors de l&apos;inscription</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">RCCM</label>
                <input value={form.rccm} onChange={e => setForm(f => ({ ...f, rccm: e.target.value }))}
                  placeholder="GN-CON-2024-B-123456"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">IFU</label>
                <input value={form.ifu} onChange={e => setForm(f => ({ ...f, ifu: e.target.value }))}
                  placeholder="123456789"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Adresse</label>
                <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  placeholder="Kaloum, Conakry, Guinée"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Téléphone</label>
                <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="+224 6XX XXX XXX"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email entreprise</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contact@entreprise.gn" type="email"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Description (optionnel)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Présentez votre entreprise en quelques mots..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Secteurs & capacité */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">Secteurs d&apos;expertise & capacité</h2>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Secteurs d&apos;activité *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SECTEURS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSecteur(s)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      form.secteurs.includes(s)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {SECTEUR_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Effectif (collaborateurs)</label>
                <input value={form.effectif} onChange={e => setForm(f => ({ ...f, effectif: e.target.value }))}
                  type="number" placeholder="25"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Certifications (séparées par virgule)</label>
                <input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))}
                  placeholder="ISO 9001, CISCO..."
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">
                <FileText className="w-4 h-4 inline mr-1.5" />
                Ces informations améliorent votre scoring IA
              </p>
              <p className="text-xs text-blue-600">
                Nos algorithmes utilisent votre profil pour calculer votre alignement sectoriel, votre capacité et vos chances de remporter les marchés.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                Retour
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || form.secteurs.length === 0}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateMutation.isPending ? 'Sauvegarde...' : 'Finaliser la configuration'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Ready */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vous êtes prêt !</h2>
            <p className="text-gray-500 mb-6">Votre profil est configuré. GuineaTender AI va maintenant :</p>
            <div className="space-y-3 text-left mb-8">
              {[
                '🔍 Surveiller les appels d\'offres adaptés à vos secteurs',
                '🤖 Calculer des scores IA personnalisés selon votre profil',
                '📄 Générer des dossiers de réponse en 8 minutes',
                '📊 Analyser votre pipeline et vos performances',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5">
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/veille')}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              Lancer ma première veille
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/dashboard')} className="mt-3 text-sm text-gray-400 hover:text-gray-600 underline">
              Aller au tableau de bord
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Vous pouvez compléter et modifier ces informations à tout moment dans les Paramètres.
        </p>
      </div>
    </div>
  )
}
