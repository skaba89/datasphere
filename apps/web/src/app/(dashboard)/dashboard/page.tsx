'use client'

import { useQuery } from '@tanstack/react-query'
import { orgApi, aoApi } from '@/lib/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  FileSearch, TrendingUp, FileText, CheckCircle2, Clock,
  AlertTriangle, ArrowRight, Activity, Zap, Shield,
} from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NOUVEAU: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  QUALIFIE: { label: 'Qualifié', color: 'bg-purple-100 text-purple-800' },
  EN_COURS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  SOUMIS: { label: 'Soumis', color: 'bg-orange-100 text-orange-800' },
  REMPORTE: { label: 'Remporté', color: 'bg-green-100 text-green-800' },
  PERDU: { label: 'Perdu', color: 'bg-red-100 text-red-800' },
}

const ACTIVITE_ICONS: Record<string, { icon: any; color: string }> = {
  ao_nouveau: { icon: Zap, color: 'text-blue-500' },
  ao_status: { icon: Activity, color: 'text-orange-500' },
  dossier_update: { icon: Shield, color: 'text-purple-500' },
}

export default function DashboardPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => orgApi.dashboard().then((r) => r.data),
  })

  const { data: aoStats } = useQuery({
    queryKey: ['ao-stats'],
    queryFn: () => aoApi.stats().then((r) => r.data),
  })

  const { data: activite = [] } = useQuery({
    queryKey: ['ao-activite'],
    queryFn: () => aoApi.activite().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const statsCards = [
    {
      titre: 'AOs en veille',
      valeur: aoStats?.total ?? 0,
      sous: `${aoStats?.expirantBientot ?? 0} expirent dans 48h`,
      icon: FileSearch,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      titre: 'En cours',
      valeur: (aoStats?.parStatus?.QUALIFIE ?? 0) + (aoStats?.parStatus?.EN_COURS ?? 0),
      sous: 'À traiter activement',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      titre: 'Marchés remportés',
      valeur: aoStats?.parStatus?.REMPORTE ?? 0,
      sous: aoStats?.budgetRemporte
        ? `${(Number(aoStats.budgetRemporte) / 1_000_000).toFixed(0)}M GNF`
        : '0 GNF',
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      titre: 'Dossiers actifs',
      valeur:
        (dashboard?.dossiers?.BROUILLON ?? 0) +
        (dashboard?.dossiers?.EN_COURS ?? 0) +
        (dashboard?.dossiers?.REVUE ?? 0),
      sous: `${dashboard?.dossiers?.SOUMIS ?? 0} soumis`,
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const chartData = Object.entries(STATUS_CONFIG).map(([key, val]) => ({
    name: val.label,
    count: aoStats?.parStatus?.[key] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">
          Vue synthétique de vos opportunités — {format(new Date(), 'EEEE dd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div key={card.titre} className="bg-white rounded-xl border p-5">
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.valeur}</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{card.titre}</div>
            <div className="text-xs text-gray-500 mt-1">{card.sous}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Graphique pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline par statut</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Scores IA</h2>
          <div className="space-y-3">
            {[
              { label: 'GO (≥65)', count: aoStats?.goCount ?? 0, color: 'bg-green-500', text: 'text-green-700' },
              { label: 'MAYBE (50-64)', count: aoStats?.maybeCount ?? 0, color: 'bg-yellow-400', text: 'text-yellow-700' },
              { label: 'NO GO (<50)', count: aoStats?.noGoCount ?? 0, color: 'bg-red-400', text: 'text-red-700' },
            ].map((item) => {
              const total = (aoStats?.goCount ?? 0) + (aoStats?.maybeCount ?? 0) + (aoStats?.noGoCount ?? 0)
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${item.text}`}>{item.label}</span>
                    <span className="text-gray-500">{item.count} AOs</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Score moyen</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {aoStats?.scoreMoyen ?? '—'}<span className="text-sm text-gray-400 font-normal">/100</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prochaines deadlines */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Prochaines deadlines</h2>
            <Link href="/appels-offres" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Voir tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {!dashboard?.prochainDeadlines?.length && (
              <p className="text-sm text-gray-400 text-center py-6">Aucune deadline imminente</p>
            )}
            {dashboard?.prochainDeadlines?.map((ao: any) => {
              const joursRestants = Math.floor(
                (new Date(ao.dateLimite).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
              const urgent = joursRestants <= 3

              return (
                <Link
                  key={ao.id}
                  href={`/appels-offres/${ao.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {urgent ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ao.titre}</p>
                    <p className="text-xs text-gray-500">{ao.entiteAdj}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-medium ${urgent ? 'text-red-600' : 'text-gray-600'}`}>
                      {joursRestants >= 0 ? `${joursRestants}j` : 'Expiré'}
                    </div>
                    {ao.score != null && (
                      <div className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${
                        ao.score >= 65 ? 'bg-green-100 text-green-700' :
                        ao.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ao.score}/100
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Activité récente</h2>
            <Link href="/analytics" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Analytiques <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activite.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Aucune activité récente</p>
            )}
            {activite.map((evt: any) => {
              const cfg = ACTIVITE_ICONS[evt.type] ?? { icon: Activity, color: 'text-gray-400' }
              return (
                <Link
                  key={evt.id}
                  href={evt.href}
                  className="flex items-start gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <cfg.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{evt.titre}</p>
                    <p className="text-xs text-gray-500">{evt.detail}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(evt.date), { addSuffix: true, locale: fr })}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <h2 className="font-semibold mb-1">Actions rapides</h2>
        <p className="text-sm text-orange-100 mb-4">Accédez rapidement aux fonctionnalités clés</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Lancer la veille', href: '/veille' },
            { label: 'Vue Pipeline', href: '/pipeline' },
            { label: 'Créer un dossier', href: '/dossiers' },
            { label: 'Ajouter un contact', href: '/contacts' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
