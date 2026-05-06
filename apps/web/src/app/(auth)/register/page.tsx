'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const schema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  organisationNom: z.string().min(2, 'Nom de l\'entreprise requis'),
  telephone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authApi.register(data)
      const { user, accessToken, refreshToken } = res.data
      setAuth(user, accessToken, refreshToken)
      toast.success('Compte créé ! Bienvenue sur GuineaTender AI 🎉')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const advantages = [
    '30 jours d\'essai gratuit',
    'Pas de carte bancaire requise',
    'Paiement Orange Money ou MTN MoMo',
    'Support en français',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Gauche : info */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">GuineaTender AI</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Commencez à remporter plus d'AOs dès aujourd'hui
          </h1>
          <p className="text-gray-600 mb-6">
            Rejoignez les entreprises tech guinéennes qui utilisent GuineaTender AI pour répondre efficacement aux marchés publics de digitalisation.
          </p>
          <ul className="space-y-3">
            {advantages.map((adv) => (
              <li key={adv} className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                {adv}
              </li>
            ))}
          </ul>
        </div>

        {/* Droite : formulaire */}
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Créer votre compte</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input {...register('prenom')} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                {errors.prenom && <p className="text-xs text-red-600 mt-1">{errors.prenom.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input {...register('nom')} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                {errors.nom && <p className="text-xs text-red-600 mt-1">{errors.nom.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input {...register('organisationNom')} placeholder="Tech Guinée SARL" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              {errors.organisationNom && <p className="text-xs text-red-600 mt-1">{errors.organisationNom.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
              <input {...register('email')} type="email" placeholder="vous@entreprise.gn" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
              <input {...register('telephone')} placeholder="+224 6XX XXX XXX" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input {...register('password')} type="password" placeholder="Minimum 8 caractères" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer mon compte gratuit
            </button>

            <p className="text-xs text-center text-gray-500">
              En créant un compte, vous acceptez nos{' '}
              <a href="#" className="text-primary-600 hover:underline">Conditions d'utilisation</a>
            </p>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary-600 font-medium hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
